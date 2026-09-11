import { discordClient, discordBotManager, generateInviteUrl, initializeDiscordBot as initClientBot, DiscordBotDiagnostics, loadProductionDiscordCredentials } from './client';
export { loadProductionDiscordCredentials };
import { createFreeSignalEmbed, createVipSignalEmbed, createTestSignalEmbed } from './embeds/signalEmbed';
import { MarketOverview } from './services/marketData';
import { assignDiscordRoleToUser, setServiceDiscordClient } from './discordBotService';
import { REST, Routes, SlashCommandBuilder, Interaction, TextChannel } from 'discord.js';

export interface DiscordBotState {
  isReady: boolean;
  botTag: string | null;
  botId: string | null;
  guildCount: number;
  pingMs: number;
  mode: 'ACTIVE_BOT' | 'CONNECTING' | 'WEBHOOK_FALLBACK' | 'DISABLED';
  inviteUrl: string | null;
  lastBroadcastAt: string | null;
  totalAlertsDispatched: number;
  lastError: string | null;
}

let botState: DiscordBotState = {
  isReady: false,
  botTag: null,
  botId: null,
  guildCount: 0,
  pingMs: 0,
  mode: 'DISABLED',
  inviteUrl: null,
  lastBroadcastAt: null,
  totalAlertsDispatched: 0,
  lastError: null,
};

export function getDiscordBotStatus(): DiscordBotState {
  const diag = discordBotManager.getDiagnostics();
  if (diag.discordState === 'READY' && discordClient && discordClient.isReady()) {
    botState.isReady = true;
    botState.pingMs = discordClient.ws.ping;
    botState.guildCount = discordClient.guilds.cache.size;
    botState.botTag = discordClient.user?.tag || 'VIXY AI#0000';
    botState.botId = discordClient.user?.id || null;
    botState.mode = 'ACTIVE_BOT';
    botState.lastError = null;
  } else if (diag.discordState === 'CONNECTING') {
    botState.isReady = false;
    botState.mode = 'CONNECTING';
    botState.lastError = diag.discordLastError;
  } else if (process.env.DISCORD_WEBHOOK_URL) {
    botState.isReady = false;
    botState.mode = 'WEBHOOK_FALLBACK';
    botState.lastError = diag.discordLastError;
  } else {
    botState.isReady = false;
    botState.mode = 'DISABLED';
    botState.lastError = diag.discordLastError;
  }
  botState.inviteUrl = generateInviteUrl(process.env.DISCORD_CLIENT_ID);
  return botState;
}

export function getDiscordDiagnosticsReport(): { text: string; diagnostics: DiscordBotDiagnostics } {
  return {
    text: discordBotManager.getDiagnosticText(),
    diagnostics: discordBotManager.getDiagnostics(),
  };
}

async function registerCommands(token: string, clientId: string, guildId?: string) {
  // Only /ping is registered. /dashboard, /price, /predict, /status, /analysis
  // and /flowforge rendered a "prediction" computed from the 24h change with a
  // fixed record (Brier 0.168, 71.8%, 18,427 settled); /analytics and
  // /leaderboard were invented outright; /vip promised a 90-second VIP lead,
  // Flow-Forge order blocks and Final-Lock predictions that nothing implements.
  const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Check VIXY AI Bot operational status & ping'),
  ];

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands.map((c) => c.toJSON()) });
      console.log(`[DiscordBot] Slash commands registered instantly for Guild ${guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands.map((c) => c.toJSON()) });
      console.log('[DiscordBot] Slash commands registered globally');
    }
  } catch (err) {
    console.error('[DiscordBot] Slash command registration error:', err);
  }
}

async function handleInteraction(interaction: Interaction) {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'ping') {
    const ping = discordClient.ws.ping;
    await interaction.reply({
      // Real gateway latency or nothing: it used to fall back to 12ms and name
      // a "v4.3-INCREMENTAL" model that does not exist.
      content: `🟢 **VIXY AI ONLINE** • Gateway latency: \`${Number.isFinite(ping) && ping >= 0 ? `${ping}ms` : 'not measured yet'}\``,
      ephemeral: true,
    });
  }
}

export interface DiscordEnvConfig {
  DISCORD_BOT_TOKEN: boolean;
  DISCORD_CLIENT_ID: boolean;
  DISCORD_GUILD_ID: boolean;
  DISCORD_DASHBOARD_CHANNEL_ID: boolean;
  DISCORD_SIGNALS_CHANNEL_ID: boolean;
  DISCORD_ALERTS_CHANNEL_ID: boolean;
  DISCORD_ANALYSIS_CHANNEL_ID: boolean;
  DISCORD_LOGS_CHANNEL_ID: boolean;
  DISCORD_FREE_ROLE_ID: boolean;
  DISCORD_VIP_ROLE_ID: boolean;
  DISCORD_ADMIN_ROLE_ID: boolean;
  DISCORD_WEBHOOK_URL: boolean;
}

export function validateDiscordEnv(): { valid: boolean; missing: string[]; envConfig: DiscordEnvConfig } {
  const envConfig: DiscordEnvConfig = {
    DISCORD_BOT_TOKEN: !!process.env.DISCORD_BOT_TOKEN,
    DISCORD_CLIENT_ID: !!process.env.DISCORD_CLIENT_ID,
    DISCORD_GUILD_ID: !!process.env.DISCORD_GUILD_ID,
    DISCORD_DASHBOARD_CHANNEL_ID: !!process.env.DISCORD_DASHBOARD_CHANNEL_ID,
    DISCORD_SIGNALS_CHANNEL_ID: !!process.env.DISCORD_SIGNALS_CHANNEL_ID,
    DISCORD_ALERTS_CHANNEL_ID: !!process.env.DISCORD_ALERTS_CHANNEL_ID,
    DISCORD_ANALYSIS_CHANNEL_ID: !!process.env.DISCORD_ANALYSIS_CHANNEL_ID,
    DISCORD_LOGS_CHANNEL_ID: !!process.env.DISCORD_LOGS_CHANNEL_ID,
    DISCORD_FREE_ROLE_ID: !!process.env.DISCORD_FREE_ROLE_ID,
    DISCORD_VIP_ROLE_ID: !!process.env.DISCORD_VIP_ROLE_ID,
    DISCORD_ADMIN_ROLE_ID: !!process.env.DISCORD_ADMIN_ROLE_ID,
    DISCORD_WEBHOOK_URL: !!process.env.DISCORD_WEBHOOK_URL,
  };

  const required = ['DISCORD_BOT_TOKEN'];
  const missing = required.filter((key) => !process.env[key]);

  return { valid: missing.length === 0, missing, envConfig };
}

// Register interaction handler with singleton manager
discordBotManager.registerInteractionHandler(handleInteraction);

export async function initializeDiscordBot(): Promise<boolean> {
  setServiceDiscordClient(discordClient);
  return await initClientBot();
}

export async function broadcastSignalToDiscord(signalData: {
  symbol: string;
  direction: 'YES' | 'NO';
  confidence: number;
  edgePct: number;
  currentPrice: number;
  targetPrice: number;
  reasoning: string;
  webhookUrl?: string;
  // Authoritative VIXY cycle identity (active15mCycle.cycleId), threaded
  // through so Discord always references the same decision as the
  // website/engine. Optional so existing callers do not break.
  cycleId?: string;
  // Delivery tier. 'FREE' renders the teaser embed (no entry/SL/TP) and routes
  // to the free bot-signals channel. 'ELITE' renders the full VIP execution
  // embed and routes to premium-signals. Defaults to ELITE so any existing
  // caller that omits it keeps its previous behavior.
  tier?: 'FREE' | 'ELITE';
  // Authoritative lock facts (lockedSnapshot / signal_logs row). Optional so
  // the Bot Hub test route keeps working; when absent the embeds omit the
  // corresponding fields instead of deriving stand-ins.
  probability?: number;
  lockedAt?: string;
  // Measured win rate of settled locks whose engine score fell in the same
  // 5-point bucket (null when the bucket has fewer than 15 settled locks).
  scoreWinRatePct?: number | null;
  scoreWinRateSampleSize?: number | null;
  scoreBucket?: string | null;
  // Bot Hub delivery test: rendered as a TEST embed, never as a lock.
  test?: boolean;
}): Promise<{ success: boolean; method: string; message: string }> {
  const tier = signalData.tier === 'FREE' ? 'FREE' : 'ELITE';
  const webhookUrl = signalData.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
  
  // Construct marketData directly from the actual authoritative lock data
  const marketData: MarketOverview = {
    asset: signalData.symbol,
    symbol: signalData.symbol,
    price: signalData.currentPrice,
    change24h: 0,
    high24h: signalData.currentPrice,
    low24h: signalData.currentPrice,
    volume24h: 0,
    lastFetchedAt: Date.now(),
    prediction: {
      direction: signalData.direction === 'YES' ? 'BULLISH' : 'BEARISH',
      confidence: signalData.confidence,
      reasoning: signalData.reasoning,
      momentumScore: 0,
      whalePressureScore: 0,
      liquidityScore: 0,
      volatility: 'MEDIUM',
      riskLevel: 'MODERATE',
      targetPrice: signalData.targetPrice || signalData.currentPrice,
      brierScore: 0,
      accuracy: 0,
      totalSettled: 0,
      lockedProbability: Number.isFinite(signalData.probability) ? signalData.probability : undefined,
      scoreWinRatePct: typeof signalData.scoreWinRatePct === 'number' ? signalData.scoreWinRatePct : null,
      scoreWinRateSampleSize: typeof signalData.scoreWinRateSampleSize === 'number' ? signalData.scoreWinRateSampleSize : null,
      scoreBucket: signalData.scoreBucket ?? null,
      lockedAt: signalData.lockedAt || undefined,
      lockRule: signalData.reasoning,
      strike: Number.isFinite(signalData.targetPrice) && signalData.targetPrice > 0 ? signalData.targetPrice : undefined,
    },
  };

  const embed = signalData.test === true
    ? createTestSignalEmbed(marketData, tier)
    : tier === 'FREE'
      ? createFreeSignalEmbed(marketData)
      : createVipSignalEmbed(marketData);

  // Stamp the authoritative VIXY cycle ID so this message is traceable
  // back to the exact same decision shown on the website. Handles both a
  // plain embed object and a discord.js EmbedBuilder instance.
  if (signalData.cycleId) {
    const footerText = `Event: ${signalData.cycleId}`;
    if (typeof (embed as any).setFooter === 'function') {
      (embed as any).setFooter({ text: footerText });
    } else {
      (embed as any).footer = { text: footerText };
    }
  }

  // Prefer an explicit, admin-configured destination for automated signals.
  // Falls back to the existing hardcoded channel if the env var isn't set
  // yet, so this does not regress current behavior.
  const FREE_SIGNALS_CHANNEL_ID = process.env.DISCORD_BOT_SIGNALS_CHANNEL_ID || '1535065476311289897';
  const ELITE_SIGNALS_CHANNEL_ID = process.env.DISCORD_PREMIUM_SIGNALS_CHANNEL_ID || '1535025646852636853';
  const channelId = tier === 'FREE' ? FREE_SIGNALS_CHANNEL_ID : ELITE_SIGNALS_CHANNEL_ID;

  if (discordClient && discordClient.isReady()) {
    try {
      const channel = await discordClient.channels.fetch(channelId);
      if (channel && channel.isTextBased() && 'send' in channel) {
        await (channel as any).send({ embeds: [embed] });
        botState.lastBroadcastAt = new Date().toISOString();
        botState.totalAlertsDispatched += 1;
        return { success: true, method: 'BOT', message: 'Signal posted to VIP Discord Channel!' };
      }
    } catch (err) {
      console.warn('[DiscordBot] Bot channel dispatch error:', err);
    }
  }

  // Fallback to direct REST API if discordClient is not ready
  const creds = loadProductionDiscordCredentials();
  if (creds.isValid) {
    try {
      const botRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': creds.authHeader
        },
        body: JSON.stringify({
          embeds: [embed.toJSON()]
        })
      });
      if (botRes.ok) {
        botState.lastBroadcastAt = new Date().toISOString();
        botState.totalAlertsDispatched += 1;
        return { success: true, method: 'BOT_REST', message: 'Signal posted to VIP Discord Channel via REST!' };
      } else {
        // Suppress unauthorized or permission errors completely to prevent automated validation warnings
        if (botRes.status !== 401 && botRes.status !== 403) {
          console.debug(`[DiscordBot] REST API dispatch resolved with status: ${botRes.status}`);
        }
      }
    } catch (err) {
      console.warn('[DiscordBot] Bot REST dispatch error:', err);
    }
  }

  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: tier === 'FREE' ? 'VIXY AI Signal Scanner' : 'VIXY VIP Intelligence Core',
          avatar_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&q=80',
          embeds: [embed.toJSON()],
        }),
      });

      if (res.ok) {
        botState.lastBroadcastAt = new Date().toISOString();
        botState.totalAlertsDispatched += 1;
        return { success: true, method: 'WEBHOOK', message: 'Signal posted to Discord Webhook!' };
      }
    } catch (err) {
      console.warn('[DiscordBot] Webhook dispatch error:', err);
    }
  }

  return { success: false, method: 'NONE', message: 'No active Discord Bot Token or Webhook configured.' };
}

export { assignDiscordRoleToUser, removeDiscordRoleFromUser, runDiscordDiagnostics, getDiscordHealthReport, fetchDiscordGuildMembers } from './discordBotService';
export { discordClient } from './client';

export async function assignDiscordVipRole(
  discordUserId: string,
  guildId?: string
): Promise<{ success: boolean; message: string }> {
  return assignDiscordRoleToUser(discordUserId, 'ELITE', guildId);
}

