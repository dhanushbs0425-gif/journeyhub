/**
 * JourneyHub Keep-Alive Pinger
 * Automatically pings the Render live instance every 10 minutes
 * to prevent the free tier 15-minute idle spin-down.
 */
const RENDER_PING_URL = 'https://journeyhub-m5lq.onrender.com/ping';
const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

console.log(`[KeepAlive] Service started. Pinging ${RENDER_PING_URL} every 10 minutes.`);

async function ping() {
  const start = Date.now();
  try {
    const res = await fetch(RENDER_PING_URL, { signal: AbortSignal.timeout(20000) });
    const text = await res.text();
    const elapsed = Date.now() - start;
    console.log(`[KeepAlive] ${new Date().toLocaleTimeString()} - Ping OK (${res.status} "${text}") in ${elapsed}ms`);
  } catch (err) {
    console.warn(`[KeepAlive] ${new Date().toLocaleTimeString()} - Ping failed: ${err.message}`);
  }
}

// Initial ping
ping();

// Recurring interval
setInterval(ping, PING_INTERVAL_MS);
