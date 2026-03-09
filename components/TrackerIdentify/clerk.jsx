"use client";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

const TrackerIdentify = () => {
    const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user || !window.tracker) return;
    window.tracker.identify({
      userId: user.id,
      name:   user.fullName,
      email:  user.primaryEmailAddress?.emailAddress,
    });
  }, [isLoaded, user?.id]);

  return null;
}

export default TrackerIdentify