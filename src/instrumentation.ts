/**
 * Next.js instrumentation hook — runs once per server process on startup.
 * In Vercel, this executes on each Lambda cold-start.
 *
 * We use it to self-heal the Graph webhook subscription: if it's missing
 * or about to expire, we renew/create it automatically without any manual
 * intervention.
 */
export async function register() {
  // Only run in Node.js runtime. The Edge runtime also triggers this hook
  // but can't use the Graph SDK (no fetch token cache, no full Node APIs).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // Skip in development — the webhook URL isn't publicly reachable locally.
  if (process.env.NODE_ENV !== 'production') return

  // Skip if Graph credentials aren't configured yet.
  if (
    !process.env.AZURE_TENANT_ID ||
    !process.env.AZURE_CLIENT_ID ||
    !process.env.AZURE_CLIENT_SECRET ||
    !process.env.GRAPH_SENDER_EMAIL ||
    !process.env.NEXT_PUBLIC_BASE_URL ||
    !process.env.WEBHOOK_SECRET
  ) {
    console.log('[startup] Skipping webhook check — Graph env vars not fully configured')
    return
  }

  try {
    // Dynamic import keeps this out of the Edge bundle and avoids
    // circular-dependency issues at module evaluation time.
    const { ensureSubscription } = await import('@/lib/email/graphSubscription')
    const result = await ensureSubscription()
    console.log(`[startup] Webhook subscription ${result.action}: ${result.subscription.id}`)
  } catch (err) {
    // Log but don't throw — a subscription failure shouldn't crash the app.
    console.error('[startup] Webhook subscription check failed:', err instanceof Error ? err.message : String(err))
  }
}
