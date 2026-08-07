import { z } from 'zod';

/**
 * Enterprise Zod Environment Variable Schema for VIXY AI.
 * Handles coercion, default values, and strict type safety across server and bot operations.
 */
export const EnvSchema = z.object({
  // 1. App Deployment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(3000),

  // 2. Discord Core
  DISCORD_BOT_TOKEN: z.string().optional().default(''),
  DISCORD_CLIENT_ID: z.string().optional().default(''),
  DISCORD_GUILD_ID: z.string().optional().default(''),
  DISCORD_APPLICATION_ID: z.string().optional().default(''),
  DISCORD_PUBLIC_KEY: z.string().optional().default(''),

  // 3. Discord Free Channels
  DISCORD_CHANNEL_LAUNCH: z.string().optional().default(''),
  DISCORD_CHANNEL_WELCOME: z.string().optional().default(''),
  DISCORD_CHANNEL_VERIFY: z.string().optional().default(''),
  DISCORD_CHANNEL_RULES: z.string().optional().default(''),
  DISCORD_CHANNEL_FAQ: z.string().optional().default(''),
  DISCORD_CHANNEL_EVENTS_GIVEAWAYS: z.string().optional().default(''),
  DISCORD_CHANNEL_INVITE_TO_EARN: z.string().optional().default(''),
  DISCORD_CHANNEL_INVITE_FEED: z.string().optional().default(''),
  DISCORD_CHANNEL_CHATROOM: z.string().optional().default(''),
  DISCORD_CHANNEL_TRADING_FLOOR: z.string().optional().default(''),
  DISCORD_CHANNEL_MEMBER_WINS: z.string().optional().default(''),
  DISCORD_CHANNEL_ANNOUNCEMENTS: z.string().optional().default(''),
  DISCORD_CHANNEL_MARKET_ANALYSIS: z.string().optional().default(''),
  DISCORD_CHANNEL_AI_SIGNALS: z.string().optional().default(''),
  DISCORD_CHANNEL_WHALE_TRACKER: z.string().optional().default(''),
  DISCORD_CHANNEL_BREAKING_NEWS: z.string().optional().default(''),

  // 4. Discord Elite Channels
  DISCORD_CHANNEL_PREMIUM_SIGNALS: z.string().optional().default(''),
  DISCORD_CHANNEL_ELITE_ANALYSIS: z.string().optional().default(''),
  DISCORD_CHANNEL_INSTITUTIONAL_ORDER_FLOW: z.string().optional().default(''),
  DISCORD_CHANNEL_LIQUIDITY_MAP: z.string().optional().default(''),
  DISCORD_CHANNEL_AI_DASHBOARD: z.string().optional().default(''),
  DISCORD_CHANNEL_VIP_CHAT: z.string().optional().default(''),

  // 5. Discord Admin & Logs Channels
  DISCORD_CHANNEL_AUDIT_LOGS: z.string().optional().default(''),
  DISCORD_CHANNEL_MOD_LOGS: z.string().optional().default(''),
  DISCORD_CHANNEL_ERROR_LOGS: z.string().optional().default(''),
  DISCORD_CHANNEL_DEV_LOGS: z.string().optional().default(''),
  DISCORD_CHANNEL_DASHBOARD: z.string().optional().default(''),

  // 6. Webhook URLs
  DISCORD_WEBHOOK_URL: z.string().optional().default(''),
  DISCORD_WEBHOOK_SIGNALS: z.string().optional().default(''),
  DISCORD_WEBHOOK_WHALE: z.string().optional().default(''),
  DISCORD_WEBHOOK_BREAKING: z.string().optional().default(''),
  DISCORD_WEBHOOK_PROTECTION: z.string().optional().default(''),
  DISCORD_WEBHOOK_ANALYSIS: z.string().optional().default(''),
  DISCORD_WEBHOOK_VIP: z.string().optional().default(''),
  DISCORD_WEBHOOK_TERMINAL: z.string().optional().default(''),
  DISCORD_WEBHOOK_FLOW: z.string().optional().default(''),
  DISCORD_WEBHOOK_ANALYTICS: z.string().optional().default(''),
  DISCORD_WEBHOOK_LOGS: z.string().optional().default(''),

  // 7. Discord Roles
  DISCORD_ROLE_VERIFIED: z.string().optional().default(''),
  DISCORD_ROLE_UNVERIFIED: z.string().optional().default(''),
  DISCORD_ROLE_ELITE: z.string().optional().default(''),
  DISCORD_ROLE_MODERATOR: z.string().optional().default(''),
  DISCORD_ROLE_ADMINISTRATOR: z.string().optional().default(''),
  DISCORD_ROLE_OWNER: z.string().optional().default(''),
  DISCORD_ROLE_SUPPORT: z.string().optional().default(''),
  DISCORD_ROLE_BOT: z.string().optional().default(''),
  DISCORD_ROLE_MUTED: z.string().optional().default(''),
  DISCORD_ROLE_GIVEAWAY_WINNER: z.string().optional().default(''),
  DISCORD_ROLE_CONTEST_WINNER: z.string().optional().default(''),
  DISCORD_ROLE_INVITE_CHAMPION: z.string().optional().default(''),
  DISCORD_ROLE_VIP: z.string().optional().default(''),
  DISCORD_ROLE_LIFETIME: z.string().optional().default(''),
  DISCORD_ROLE_DEVELOPER: z.string().optional().default(''),
  DISCORD_ROLE_TESTER: z.string().optional().default(''),

  // 8. AI Modules Settings
  AI_MARKET_INTEL_ENABLED: z.coerce.boolean().default(true),
  AI_SIGNAL_GENERATOR_CONFIDENCE_THRESHOLD: z.coerce.number().default(75),
  AI_ORDER_FLOW_SCANNER_SENSITIVITY: z.coerce.number().default(0.85),
  AI_WHALE_SCANNER_MIN_USD: z.coerce.number().default(1000000),
  AI_NEWS_SCANNER_POLL_INTERVAL: z.coerce.number().default(300),
  AI_MACRO_SCANNER_ENABLED: z.coerce.boolean().default(true),
  AI_LIQUIDITY_SCANNER_DEPTH_LEVELS: z.coerce.number().default(20),
  AI_VOLATILITY_SCANNER_BAND_WIDTH: z.coerce.number().default(2.5),
  AI_RISK_ENGINE_MAX_DRAWDOWN: z.coerce.number().default(0.12),
  AI_TREND_ENGINE_TIMEFRAME: z.string().default('15m'),
  AI_AUTO_MODERATOR_ENABLED: z.coerce.boolean().default(true),
  AI_INVITE_ENGINE_ENABLED: z.coerce.boolean().default(true),

  // 9. Scheduling
  CRON_HOURLY_SUMMARY: z.string().default('0 * * * *'),
  CRON_15MIN_SIGNALS: z.string().default('*/15 * * * *'),
  CRON_BREAKING_NEWS: z.string().default('*/5 * * * *'),
  CRON_DAILY_RECAP: z.string().default('0 0 * * *'),
  CRON_WEEKLY_RECAP: z.string().default('0 0 * * 0'),
  CRON_LEADERBOARD_REFRESH: z.string().default('0 */6 * * *'),
  CRON_GIVEAWAY_REMINDER: z.string().default('0 12 * * *'),
  CRON_STATUS_HEARTBEAT: z.string().default('*/1 * * * *'),

  // 10. Security & External Services
  OPENAI_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  JWT_SECRET: z.string().default('vixy-ai-super-secret-jwt-key-32chars'),
  ENCRYPTION_KEY: z.string().default('vixy-ai-aes-256-encryption-key-passphrase'),
  FIREBASE_PROJECT_ID: z.string().optional().default(''),
  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

/**
 * Validates process.env at startup with human-readable error reports.
 */
export function parseEnv(): EnvConfig {
  const mergedProcessEnv = {
    ...process.env,
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN || '',
    DISCORD_CHANNEL_MARKET_ANALYSIS: process.env.DISCORD_CHANNEL_MARKET_ANALYSIS || process.env.DISCORD_ANALYSIS_CHANNEL || '',
    DISCORD_CHANNEL_AI_SIGNALS: process.env.DISCORD_CHANNEL_AI_SIGNALS || process.env.DISCORD_SIGNALS_CHANNEL || '',
    DISCORD_CHANNEL_BREAKING_NEWS: process.env.DISCORD_CHANNEL_BREAKING_NEWS || process.env.DISCORD_ALERTS_CHANNEL || '',
    DISCORD_CHANNEL_AUDIT_LOGS: process.env.DISCORD_CHANNEL_AUDIT_LOGS || process.env.DISCORD_LOGS_CHANNEL_ID || '',
    DISCORD_ROLE_VERIFIED: process.env.DISCORD_ROLE_VERIFIED || process.env.DISCORD_FREE_ROLE_ID || '',
    DISCORD_ROLE_ELITE: process.env.DISCORD_ROLE_ELITE || process.env.DISCORD_ROLE_VIP || process.env.DISCORD_VIP_ROLE_ID || '',
    DISCORD_ROLE_ADMINISTRATOR: process.env.DISCORD_ROLE_ADMINISTRATOR || process.env.DISCORD_ADMIN_ROLE_ID || '',
  };

  const result = EnvSchema.safeParse(mergedProcessEnv);

  if (!result.success) {
    console.error('❌ Invalid environment variables detected:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('Invalid environment configuration for VIXY AI.');
  }

  return Object.freeze(result.data);
}

// Global cached env instance
export const env = parseEnv();
