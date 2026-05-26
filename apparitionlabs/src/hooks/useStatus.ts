"use client";

import { useEffect, useRef, useState } from "react";
import { checkServerStatus } from "@/lib/api";

export function useStatus(interval = 5000) {
  const [data, setData] = useState<{ servers: unknown[]; updated: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const result = await checkServerStatus();
        if (alive) {
          setData({ servers: result, updated: Date.now() });
          setLoading(false);
        }
      } catch (err) {
        console.error("Status error:", err);
        if (alive) setLoading(false);
      } finally {
        inFlightRef.current = false;
      }
    }

    void load();
    const timer = setInterval(() => void load(), interval);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [interval]);

  return { data, loading };
}
