import { NextRequest, NextResponse } from 'next/server';

// Shared storage (imported from status route)
// In production, use a database instead
let serverStatus: Record<string, { status: string; timestamp: number }> = {};

// Export for use in status route
export function getServerStatus() {
    return serverStatus;
}

export function setServerStatus(name: string, status: string) {
    serverStatus[name] = {
        status,
        timestamp: Date.now(),
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('Received Uptime Kuma webhook:', body);

        // Uptime Kuma webhook payload structure
        const monitorName = body.monitor?.name;
        const monitorStatus = body.monitor?.status; // 1 = up, 0 = down

        if (monitorName && monitorStatus !== undefined) {
            setServerStatus(monitorName, monitorStatus === 1 ? 'ok' : 'down');
            console.log(`Updated ${monitorName} status to ${monitorStatus === 1 ? 'ok' : 'down'}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
