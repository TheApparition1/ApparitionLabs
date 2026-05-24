import { getServerStatus } from '../webhook/uptime-kuma/route';

export async function GET() {
    const servers = [
        {
            name: "Proxmox 1",
            domain: "https://proxmox1.apparitioncreatives.me",
            host: "192.168.8.154",
            port: 8006,
            type: "proxmox",
            url: "https://proxmox1.apparitioncreatives.me",
            localUrl: "http://192.168.8.154:8006",
        },
        {
            name: "Proxmox 2",
            domain: "https://proxmox2.apparitioncreatives.me",
            host: "192.168.8.153",
            port: 8006,
            type: "proxmox",
            url: "https://proxmox2.apparitioncreatives.me",
            localUrl: "http://192.168.8.153:8006",
        },
        {
            name: "TrueNAS",
            domain: "https://truenas.apparitioncreatives.me",
            host: "192.168.8.236",
            port: 443,
            type: "truenas",
            url: "https://truenas.apparitioncreatives.me",
            localUrl: "http://192.168.8.236",
        },
    ];

    // -------------------------
    // LAYER 1: Internet check
    // -------------------------
    const checkLayer1 = async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        try {
            const res = await fetch("https://1.1.1.1/cdn-cgi/trace", {
                cache: "no-store",
                signal: controller.signal,
            });

            clearTimeout(timeout);
            return res.ok;
        } catch {
            clearTimeout(timeout);
            return false;
        }
    };

    // -------------------------
    // LAYER 2: Cloudflare / domain reachability
    // -------------------------
    const checkLayer2 = async (domain: string) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
            console.log(`Checking layer2 for ${domain}`);
            const res = await fetch(domain, {
                method: "GET",
                cache: "no-store",
                redirect: "follow",
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                    'Pragma': 'no-cache',
                    'X-Health-Check': Date.now().toString(),
                    'User-Agent': 'ApparitionLabs-HealthCheck/1.0',
                },
            });

            clearTimeout(timeout);

            console.log(`Layer2 response for ${domain}: status=${res.status}, ok=${res.ok}`);

            // Consider any 2xx or 3xx as ok (redirects are normal)
            if (res.status >= 200 && res.status < 400) {
                return "ok";
            }

            return "down";
        } catch (err) {
            clearTimeout(timeout);
            console.log(`Layer2 error for ${domain}:`, err);
            return "down";
        }
    };

    // -------------------------
    // LAYER 3: TCP port check (bypasses Cloudflare entirely)
    // -------------------------
    const checkLayer3 = async (host: string, port: number) => {
        return new Promise<"ok" | "down">((resolve) => {
            const net = require('net');
            const socket = new net.Socket();

            const timeout = setTimeout(() => {
                socket.destroy();
                console.log(`Layer3 timeout for ${host}:${port}`);
                resolve("down");
            }, 3000);

            socket.connect(port, host, () => {
                clearTimeout(timeout);
                socket.destroy();
                console.log(`Layer3 success for ${host}:${port}`);
                resolve("ok");
            });

            socket.on('error', (err: { message: any; }) => {
                clearTimeout(timeout);
                socket.destroy();
                console.log(`Layer3 error for ${host}:${port}:`, err.message);
                resolve("down");
            });
        });
    };

    // -------------------------
    // LAYER 3: Domain-based check (uses Cloudflare cache rule)
    // -------------------------
    const checkLayer3Domain = async (url: string) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        try {
            console.log(`Checking layer3 domain for ${url}`);
            const startTime = Date.now();
            const res = await fetch(url, {
                method: "GET",
                cache: "no-store",
                redirect: "follow",
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                    'Pragma': 'no-cache',
                    'X-Health-Check': Date.now().toString(),
                    'User-Agent': 'ApparitionLabs-HealthCheck/1.0',
                },
            });
            const responseTime = Date.now() - startTime;

            clearTimeout(timeout);

            console.log(`Layer3 domain response for ${url}: status=${res.status}, time=${responseTime}ms`);

            // Accept any 2xx or 3xx as OK - if the server responds, it's up
            // Content validation was causing false negatives
            if (res.status >= 200 && res.status < 400) {
                return "ok";
            }

            return "down";
        } catch (err) {
            clearTimeout(timeout);
            console.log(`Layer3 domain error for ${url}:`, err);
            return "down";
        }
    };

    // Run Layer 1 once
    const layer1 = await checkLayer1();

    // Internet unavailable
    if (!layer1) {
        return Response.json({
            updated: Date.now(),
            error: "cloudflare_unavailable",
            servers: servers.map((s) => ({
                name: s.name,
                type: s.type,
                layer1: "down",
                layer2: "unknown",
                layer3: "unknown",
            })),
        });
    }

    const results = await Promise.all(
        servers.map(async (s) => {
            // Use webhook data if available and recent (within 2 minutes)
            const serverStatus = getServerStatus();
            const webhookData = serverStatus[s.name];
            const useWebhook = webhookData && (Date.now() - webhookData.timestamp) < 120000;

            if (useWebhook) {
                console.log(`${s.name} - using webhook data: ${webhookData.status}`);
                return {
                    name: s.name,
                    type: s.type,
                    layer1: "ok",
                    layer2: webhookData.status,
                    layer3: webhookData.status,
                    url: s.url,
                    localUrl: s.localUrl,
                };
            }

            // Fallback to health checks
            const timestamp = Date.now();
            const layer2 = await checkLayer2(`${s.domain}?_=${timestamp}`);
            // Use domain-based check for layer3 to work from anywhere (not just home network)
            const layer3 = await checkLayer3Domain(`${s.domain}?_=${timestamp}`);

            console.log(`${s.name} - layer2: ${layer2}, layer3: ${layer3}`);

            return {
                name: s.name,
                type: s.type,
                layer1: "ok",
                layer2,
                layer3,
                url: s.url,
                localUrl: s.localUrl,
            };
        })
    );

    return Response.json({
        updated: Date.now(),
        servers: results,
    }, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Content-Type': 'application/json',
        },
    });
}