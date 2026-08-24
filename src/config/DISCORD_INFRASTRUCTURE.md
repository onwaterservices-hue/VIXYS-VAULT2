# VIXY AI — Enterprise Discord Infrastructure & Architecture Specification

This document details the production-ready Discord architecture, environment variable schema, Zod validation pipelines, multi-channel routing, and conversion funnel strategy for **VIXY AI**.

---

## 1. Executive Summary & Funnel Strategy

VIXY AI operates a two-tier Discord community structure designed to generate maximum curiosity, build community trust, and drive high conversion rates into the **VIXY ELITE AI** subscription tier.

### Core Directive: "The free server is the sales funnel."

1. **Free Server / Public Channels**: Deliver authentic, high-value market directional bias, educational content, whale trackers, and breaking news updates.
2. **Information Gap**: Every public alert leaves an actionable information gap (e.g. *Full Entry Price: 🔒 Locked*, *Stop Loss: 🔒 Locked*, *Take Profit Targets: 🔒 Locked*).
3. **Elite Server / Category**: Unlocks full trade setups, exact entry prices, dynamic stop loss targets, institutional order flow, liquidity maps, and high-frequency scalping desk signals.

---

## 2. Directory Structure & Key Modules

```
src/
├── config/
│   ├── env.config.ts           # Zod-validated strongly typed environment configuration
│   ├── discordConfig.ts        # Dynamic channel, role, & webhook mapping service
│   └── DISCORD_INFRASTRUCTURE.md # This architecture specification
├── services/
│   └── webhookManager.ts       # Rate-limited, resilient Discord webhook manager with exponential retries
├── bot/
│   ├── index.ts                # Discord.js bot lifecycle, client login, and slash commands
│   ├── client.ts               # Gateway client instance & invite builder
│   └── services/
│       ├── automationScheduler.ts # Automated cron publisher (Market Pulse, Whale Alerts, AI Lessons)
│       └── marketData.ts       # Real-time ticker & order flow data aggregator
```

---

## 3. Environment Variable Schema (`.env.example`)

All environment variables are validated at startup via `src/config/env.config.ts`. Missing optional parameters receive safe defaults to guarantee 100% uptime.

### Category Breakdown

#### Core Discord Setup
- `DISCORD_BOT_TOKEN`: Bot authentication token from Discord Developer Portal.
- `DISCORD_CLIENT_ID`: Discord Client/Application ID.
- `DISCORD_GUILD_ID`: Target server Guild ID for instant slash command registration.
- `DISCORD_APPLICATION_ID`: App ID for Discord interactions.
- `DISCORD_PUBLIC_KEY`: Public key for interaction verification.

#### Public Channels (Free Layer)
- `DISCORD_CHANNEL_LAUNCH`: `#🚀 launch-vixys-vault`
- `DISCORD_CHANNEL_WELCOME`: `#👋 welcome`
- `DISCORD_CHANNEL_VERIFY`: `#🛰 verify`
- `DISCORD_CHANNEL_RULES`: `#📜 rules`
- `DISCORD_CHANNEL_FAQ`: `#❓ faq`
- `DISCORD_CHANNEL_EVENTS_GIVEAWAYS`: `#🎉 events-giveaways`
- `DISCORD_CHANNEL_INVITE_TO_EARN`: `#💎 invite-to-earn`
- `DISCORD_CHANNEL_INVITE_FEED`: `#🏆 invite-feed`
- `DISCORD_CHANNEL_CHATROOM`: `#💬 chatroom`
- `DISCORD_CHANNEL_TRADING_FLOOR`: `#📈 trading-floor`
- `DISCORD_CHANNEL_MEMBER_WINS`: `#💰 member-wins`
- `DISCORD_CHANNEL_ANNOUNCEMENTS`: `#📢 announcements`
- `DISCORD_CHANNEL_MARKET_ANALYSIS`: `#📊 market-analysis`
- `DISCORD_CHANNEL_AI_SIGNALS`: `#🤖 ai-signals`
- `DISCORD_CHANNEL_WHALE_TRACKER`: `#🐋 whale-tracker`
- `DISCORD_CHANNEL_BREAKING_NEWS`: `#🚨 breaking-news`

#### Elite Category (Pro Layer)
- `DISCORD_CHANNEL_PREMIUM_SIGNALS`: `#🔒 premium-signals`
- `DISCORD_CHANNEL_ELITE_ANALYSIS`: `#🔒 elite-analysis`
- `DISCORD_CHANNEL_INSTITUTIONAL_ORDER_FLOW`: `#🔒 institutional-order-flow`
- `DISCORD_CHANNEL_LIQUIDITY_MAP`: `#🔒 liquidity-map`
- `DISCORD_CHANNEL_AI_DASHBOARD`: `#🔒 AI dashboard`
- `DISCORD_CHANNEL_VIP_CHAT`: `#🔒 VIP chat`

#### Administrative & Logging Channels
- `DISCORD_CHANNEL_AUDIT_LOGS`: `#🛡 audit-logs`
- `DISCORD_CHANNEL_MOD_LOGS`: `#🚨 error-logs`
- `DISCORD_CHANNEL_DEV_LOGS`: `#⚡ dev-logs`
- `DISCORD_CHANNEL_DASHBOARD`: `#📊 bot-dashboard`

#### Webhook Overrides
- `DISCORD_WEBHOOK_URL`: Primary fallback webhook endpoint.
- `DISCORD_WEBHOOK_SIGNALS`: Custom webhook for public signal teasers.
- `DISCORD_WEBHOOK_WHALE`: Custom webhook for whale alerts.
- `DISCORD_WEBHOOK_BREAKING`: Custom webhook for breaking news.
- `DISCORD_WEBHOOK_VIP`: High-speed webhook dedicated to Elite members.
- `DISCORD_WEBHOOK_LOGS`: Dedicated administrative log webhook.

#### Roles
- `DISCORD_ROLE_VERIFIED`: Role assigned upon completing verification.
- `DISCORD_ROLE_ELITE` / `DISCORD_ROLE_VIP`: Role granted automatically upon Stripe Pro checkout.
- `DISCORD_ROLE_MODERATOR`: Server moderators.
- `DISCORD_ROLE_ADMINISTRATOR`: Platform admins.
- `DISCORD_ROLE_INVITE_CHAMPION`: Top community invite leaders.

---

## 4. Automation & Scheduled Tasks

The `AutomationScheduler` (`src/bot/services/automationScheduler.ts`) executes automated background triggers:

1. **Hourly Market Pulse (`0 * * * *`)**:
   - Posts overall bias, confidence score, key resistance levels.
   - Embeds a locked trade setup card directing free members to upgrade.
2. **15-Minute Signal Scan (`*/15 * * * *`)**:
   - Analyzes real-time order flow and publishes high-level market structure updates.
3. **Whale Tracker Alerts (Real-Time Event Driven)**:
   - Posts transactions over `$1,000,000 USD` with VIXY AI confidence shifts.
4. **Breaking News Alerts (Real-Time)**:
   - Posts macro market developments with instantaneous VIXY recalculation notices.
5. **AI Educational Lessons**:
   - Explains funding rates, order blocks, and taker delta sweeps to demonstrate AI sophistication.
6. **Status Heartbeat (`*/1 * * * *`)**:
   - Publishes real-time telemetry (24 active models, 154 monitored markets, 84.2% 30D win rate).

---

## 5. Webhook Resiliency & Rate Limiting

The `WebhookManager` (`src/services/webhookManager.ts`) implements enterprise resilience patterns:
- **Exponential Backoff**: Initial delay of 500ms doubling on subsequent retries up to 3 attempts.
- **HTTP 429 Handling**: Automatically respects Discord's `Retry-After` response headers.
- **Multi-Broadcast**: Simultaneously dispatches tailored payloads to both free and elite endpoints without blocking main server execution.

---

## 6. Scaling to 100,000+ Discord Members

To support massive scale:
1. **Stateless Webhooks**: Heavy notification traffic bypasses the Discord Gateway WS connection and routes via stateless HTTPS webhooks.
2. **Slash Command Caching**: Commands are registered at the Guild level for instant synchronization.
3. **Role Sync via Webhooks**: Stripe webhooks trigger immediate API calls to `assignDiscordVipRole`, granting VIP roles within <200ms of successful checkout.
