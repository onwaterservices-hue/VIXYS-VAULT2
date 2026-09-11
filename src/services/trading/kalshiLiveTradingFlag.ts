// Global gate for live-capital (Kalshi production) auto-trade orders.
// executeAutoTradesForSignal blocks, and audit-logs as BLOCKED, every order whose
// environment resolves to 'live' while this is false. It sits in its own
// dependency-free module so the settings panel reads the very constant the
// engine enforces without bundling the engine's Node crypto / Firestore imports.
export const AUTO_TRADING_LIVE_ENABLED = false;
