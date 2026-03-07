import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    // ── 1. Parse body ────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      id,          // tracker UUID
      domain,      // e.g. "yoursite.com"
      session_id,  // UUID from tracker cookie (30 min expiry)
      user_id,     // UUID from tracker cookie (365 day expiry)
      time_spent,  // seconds (0 on initial ping, 30 on interval, remainder on close)
      location,    // window.location.pathname e.g. "/about"
      start_time,  // ISO string — when the page first loaded
      name,        // optional — from window.tracker.identify()
      email,       // optional — from window.tracker.identify()
    } = body;

    if (!id || !domain || !session_id) {
      return Response.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    const supabase = createClient(await cookies());

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

    // ── 4. Upsert visit + user in one atomic DB call ──────────────────────────
    // Single RPC = one round trip, no race conditions
    const { error: rpcError } = await supabase.rpc("upsert_visit_and_user", {
      p_tracker_id: id,
      p_session_id: session_id,
      p_time_spent: Number(time_spent) || 0,
      p_location:   location   ?? null,
      p_start_time: start_time ?? new Date().toISOString(),
      p_user_id:    user_id    ?? null,
      p_name:       name       ?? null,
      p_email:      email      ?? null,
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