"use client";

import { useEffect, useState } from "react";

export function useStatus(interval = 4000) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;

        async function load() {
            try {
                const res = await fetch("/api/status", {
                    cache: "no-store",
                });

                const json = await res.json();

                if (alive) {
                    setData(json);
                    setLoading(false);
                }
            } catch {
                if (alive) setLoading(false);
            }
        }

        load();
        const timer = setInterval(load, interval);

        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, [interval]);

    return { data, loading };
}