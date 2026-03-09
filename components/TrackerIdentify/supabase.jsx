"use client";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export default function TrackerIdentify() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !window.tracker) return;
    window.tracker.identify({
      userId: user.id,
      name:   user.user_metadata?.full_name ?? null,
      email:  user.email,
    });
  }, [user?.id]);

  return <></>;
}