"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppConfig } from "@/lib/types";
import { getConfig, saveConfig } from "@/lib/api";

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConfig();
      setConfig(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void reload(), 0);
    return () => clearTimeout(t);
  }, [reload]);

  const persist = useCallback(async (next: AppConfig) => {
    await saveConfig(next);
    setConfig(next);
  }, []);

  return { config, loading, error, reload, persist, setConfig };
}
