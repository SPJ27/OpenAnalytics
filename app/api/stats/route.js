import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(req) {
  const supabase = createClient(await cookies());

  const id       = req.nextUrl.searchParams.get("id");
  const fromDate = req.nextUrl.searchParams.get("fromDate");
  const toDate   = req.nextUrl.searchParams.get("toDate");

  if (!id) {
    return Response.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  let visitsQuery = supabase
    .from("visits")
    .select("*")
    .eq("tracker_id", id)
    .order("date", { ascending: false });

  // Fetch users with their visit count + most recent visit metadata
  // via the user_visits join table
  let usersQuery = supabase
    .from("users")
    .select(`
      id,
      user_id,
      name,
      email,
      date_created,
      user_visits (
        visit_id,
        visits (
          start_time,
          country,
          city,
          device,
          browser,
          os
        )
      )
    `)
    .eq("tracker_id", id)
    .order("date_created", { ascending: false });

  if (fromDate) {
    const from = new Date(fromDate).toISOString();
    visitsQuery = visitsQuery.gte("date", from);
    usersQuery  = usersQuery.gte("date_created", from);
  }
  if (toDate) {
    const to = new Date(toDate + "T23:59:59.999Z").toISOString();
    visitsQuery = visitsQuery.lte("date", to);
    usersQuery  = usersQuery.lte("date_created", to);
  }

  const [
    { data: visits, error: visitsError },
    { data: users,  error: usersError  },
  ] = await Promise.all([visitsQuery, usersQuery]);

  if (visitsError || usersError) {
    console.error("[stats] visits error:", visitsError);
    console.error("[stats] users error:",  usersError);
    return Response.json({ success: false, error: "Database error" }, { status: 500 });
  }

  let rangeStart, rangeEnd;

  if (fromDate && toDate) {
    rangeStart = new Date(fromDate);
    rangeEnd   = new Date(toDate + "T23:59:59.999Z");
  } else if (visits.length > 0) {
    const times = visits.map(v => new Date(v.start_time).getTime());
    rangeStart  = new Date(Math.min(...times));
    rangeEnd    = new Date(Math.max(...times));
  } else {
    rangeStart = new Date();
    rangeEnd   = new Date();
  }

  const diffDays = (rangeEnd - rangeStart) / (1000 * 60 * 60 * 24);
  const bucketMode = diffDays < 1 ? "hour" : diffDays <= 90 ? "day" : "month";

  function getBucketKey(isoString) {
    const d = new Date(isoString);
    if (bucketMode === "hour")  return d.toLocaleString("en-US", { hour: "numeric", hour12: true, timeZone: "UTC" });
    if (bucketMode === "day")   return d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  }

  function generateBuckets() {
    const buckets = {};
    const cursor  = new Date(rangeStart);

    if (bucketMode === "hour") {
      cursor.setUTCMinutes(0, 0, 0);
      const end = new Date(rangeEnd);
      end.setUTCMinutes(59, 59, 999);
      while (cursor <= end) {
        buckets[getBucketKey(cursor.toISOString())] = 0;
        cursor.setUTCHours(cursor.getUTCHours() + 1);
      }
    } else if (bucketMode === "day") {
      cursor.setUTCHours(0, 0, 0, 0);
      const end = new Date(rangeEnd);
      end.setUTCHours(23, 59, 59, 999);
      while (cursor <= end) {
        buckets[getBucketKey(cursor.toISOString())] = 0;
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    } else {
      cursor.setUTCDate(1);
      cursor.setUTCHours(0, 0, 0, 0);
      while (cursor <= rangeEnd) {
        buckets[getBucketKey(cursor.toISOString())] = 0;
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }

    return buckets;
  }

  const visitsBuckets = generateBuckets();
  const usersBuckets  = generateBuckets();

  let totalTimeSpent = 0;
  const visitedPages = {};
  const countries    = {};
  const cities       = {};
  const devices      = {};
  const browsers     = {};
  const oses         = {};
  const referrers    = {};
  const sessionMap   = {};

  function increment(obj, key) {
    if (key) obj[key] = (obj[key] || 0) + 1;
  }

  for (const visit of visits) {
    totalTimeSpent += visit.time_spent;

    increment(visitedPages, visit.location);
    increment(countries,    visit.country);
    increment(cities,       visit.city);
    increment(devices,      visit.device);
    increment(browsers,     visit.browser);
    increment(oses,         visit.os);
    increment(referrers,    visit.referrer || "Direct");

    const key = getBucketKey(visit.start_time);
    visitsBuckets[key] = (visitsBuckets[key] ?? 0) + 1;

    if (!sessionMap[visit.session_id]) {
      sessionMap[visit.session_id] = { pages: 0, time: 0 };
    }
    sessionMap[visit.session_id].pages += 1;
    sessionMap[visit.session_id].time  += visit.time_spent;
  }

  for (const user of users) {
    const key = getBucketKey(user.date_created);
    usersBuckets[key] = (usersBuckets[key] ?? 0) + 1;
  }

  const graph = Object.keys(visitsBuckets).map(label => ({
    label,
    visits: visitsBuckets[label] || 0,
    users:  usersBuckets[label]  || 0,
  }));

  const totalSessions  = Object.keys(sessionMap).length;
  const bounceSessions = Object.values(sessionMap).filter(s => s.pages === 1 && s.time < 30).length;
  const bounceRate     = totalSessions > 0
    ? ((bounceSessions / totalSessions) * 100).toFixed(1) + "%"
    : "0.0%";

  // ── Build enriched user rows ─────────────────────────────────────────────
  const enrichedUsers = users.map(u => {
    const userVisits = (u.user_visits ?? [])
      .map(uv => uv.visits)
      .filter(Boolean);

    // Most recent visit by start_time
    const latestVisit = userVisits.reduce((latest, v) => {
      if (!latest) return v;
      return new Date(v.start_time) > new Date(latest.start_time) ? v : latest;
    }, null);

    return {
      id:           u.id,
      userId:       u.user_id,
      name:         u.name  ?? null,
      email:        u.email ?? null,
      dateCreated:  u.date_created,
      visits:       userVisits.length,
      lastSeen:     latestVisit?.start_time ?? u.date_created,
      country:      latestVisit?.country    ?? null,
      city:         latestVisit?.city       ?? null,
      device:       latestVisit?.device     ?? null,
      browser:      latestVisit?.browser    ?? null,
      os:           latestVisit?.os         ?? null,
    };
  });

  return Response.json({
    success: true,
    data: {
      totalVisits:      visits.length,
      uniqueVisitors:   users.length,
      totalSessions,
      bounceRate,
      avgVisitsPerUser: users.length > 0 ? (visits.length / users.length).toFixed(2) : "0.00",
      avgTimeSpent:     visits.length > 0 ? (totalTimeSpent / visits.length).toFixed(2) : "0.00",
      visitedPages,
      countries,
      cities,
      devices,
      browsers,
      oses,
      referrers,
      graph,
      bucketMode,
      users: enrichedUsers,
    },
  });
}