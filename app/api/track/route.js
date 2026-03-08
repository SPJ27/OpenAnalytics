import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      id,
      domain,
      session_id,
      user_id,
      time_spent,
      location,
      start_time,
      name,
      email,
      // geo
      city,
      region,
      country,
      country_code,
      latitude,
      longitude,
      timezone,
      ip,
      // device
      device,
      browser,
      os,
      // referrer
      referrer,
    } = body;

    if (!id || !domain || !session_id) {
      return Response.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    const supabase = createClient(await cookies());

    // Verify tracker exists
    const { error: authError } = await supabase
      .from("trackers")
      .select("id")
      .eq("id", id)
      .eq("domain", domain)
      .single();

    if (authError) {
      return Response.json(
        { success: false, error: "Tracker not found" },
        { status: 403 }
      );
    }

    const { error: rpcError } = await supabase.rpc("upsert_visit_and_user", {
      p_tracker_id:   id,
      p_session_id:   session_id,
      p_time_spent:   Number(time_spent) || 0,
      p_location:     location      ?? null,
      p_start_time:   start_time    ?? new Date().toISOString(),
      p_user_id:      user_id       ?? null,
      p_name:         name          ?? null,
      p_email:        email         ?? null,
      // geo
      p_city:         city          ?? null,
      p_region:       region        ?? null,
      p_country:      country       ?? null,
      p_country_code: country_code  ?? null,
      p_latitude:     latitude      ?? null,
      p_longitude:    longitude     ?? null,
      p_timezone:     timezone      ?? null,
      p_ip:           ip            ?? null,
      // device
      p_device:       device        ?? null,
      p_browser:      browser       ?? null,
      p_os:           os            ?? null,
      // referrer
      p_referrer:     referrer      ?? null,
    });

    if (rpcError) {
      console.error("[track] rpc error:", rpcError);
      return Response.json(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    return Response.json({ success: true });

  } catch (err) {
    console.error("[track] unexpected error:", err);
    return Response.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}