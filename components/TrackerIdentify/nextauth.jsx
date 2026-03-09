"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function TrackerIdentify() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading" || !session?.user || !window.tracker) return;
    window.tracker.identify({
      userId: session.user.id ?? session.user.email,
      name:   session.user.name,
      email:  session.user.email,
    });
  }, [status, session?.user?.email]);

  return null;
}