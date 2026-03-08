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

  if (fromDate) visitsQuery = visitsQuery.gte("date", new Date(fromDate).toISOString());
  if (toDate)   visitsQuery = visitsQuery.lte("date", new Date(toDate + "T23:59:59.999Z").toISOString());

  let usersQuery = supabase
    .from("users")
    .select("*")
    .eq("tracker_id", id)
    .order("date_created", { ascending: false });

  if (fromDate) usersQuery = usersQuery.gte("date_created", new Date(fromDate).toISOString());
  if (toDate)   usersQuery = usersQuery.lte("date_created", new Date(toDate + "T23:59:59.999Z").toISOString());

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
    if (bucketMode === "hour") {
      return d.toLocaleString("en-US", { hour: "numeric", hour12: true, timeZone: "UTC" });
    }
    if (bucketMode === "day") {
      return d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    }
    return d.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  }

  function generateBuckets() {
    const buckets = {};
    const cursor  = new Date(rangeStart);

    if (bucketMode === "hour") {
      cursor.setUTCMinutes(0, 0, 0);
      const end = new Date(rangeEnd); end.setUTCMinutes(59, 59, 999);
      while (cursor <= end) {
        buckets[getBucketKey(cursor.toISOString())] = 0;
        cursor.setUTCHours(cursor.getUTCHours() + 1);
      }
    } else if (bucketMode === "day") {
      cursor.setUTCHours(0, 0, 0, 0);
      const end = new Date(rangeEnd); end.setUTCHours(23, 59, 59, 999);
      while (cursor <= end) {
        buckets[getBucketKey(cursor.toISOString())] = 0;
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    } else {
      cursor.setUTCDate(1); cursor.setUTCHours(0, 0, 0, 0);
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
  let  bounces = 0
  for (const visit of visits) {
    totalTimeSpent += visit.time_spent;
    if (visit.location) visitedPages[visit.location] = (visitedPages[visit.location] || 0) + 1;
    if (visit.country)  countries[visit.country]     = (countries[visit.country]     || 0) + 1;
    if (visit.city)     cities[visit.city]           = (cities[visit.city]           || 0) + 1;
    if (visit.device)   devices[visit.device]        = (devices[visit.device]        || 0) + 1;
    if (visit.browser)  browsers[visit.browser]      = (browsers[visit.browser]      || 0) + 1;
    if (visit.os)       oses[visit.os]               = (oses[visit.os]               || 0) + 1;

    const ref = visit.referrer || "Direct";
    referrers[ref] = (referrers[ref] || 0) + 1;

    const key = getBucketKey(visit.start_time);
    visitsBuckets[key] = (visitsBuckets[key] ?? 0) + 1;
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

  const sessionMap = {};
  for (const visit of visits) {
    if (!sessionMap[visit.session_id]) {
      sessionMap[visit.session_id] = { pages: 0, time: 0 };
    }
    sessionMap[visit.session_id].pages += 1;
    sessionMap[visit.session_id].time  += visit.time_spent;
  }

  const totalSessions  = Object.keys(sessionMap).length;
  const bounceSessions = Object.values(sessionMap).filter(s => s.pages === 1 && s.time < 30).length;
  const bounceRate     = totalSessions > 0
    ? ((bounceSessions / totalSessions) * 100).toFixed(1) + "%"
    : "0.0%";

  const data = {
    totalVisits:      visits.length,
    uniqueVisitors:   users.length,
    totalSessions,
    bounceRate,
    avgVisitsPerUser: users.length > 0
      ? (visits.length / users.length).toFixed(2)
      : "0.00",
    avgTimeSpent: visits.length > 0
      ? (totalTimeSpent / visits.length).toFixed(2)
      : "0.00",

    
    visitedPages,  
    countries,      
    cities,         
    devices,       
    browsers,     
    oses,         
    referrers,      
    graph,         
    bucketMode,    
  };

  return Response.json({ success: true, data, users, visits });
}