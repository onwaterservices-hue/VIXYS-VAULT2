import { discordClient, generateInviteUrl } from './client';
import { createDashboardEmbed } from './embeds/dashboardEmbed';
import { createStructuredPredictionEmbed } from './embeds/predictionEmbed';
import { createFreeSignalEmbed, createVipSignalEmbed } from './embeds/signalEmbed';
import { createMarketAnalysisEmbed } from './embeds/marketAnalysisEmbed';
import {
  createWhaleTrackerEmbed,
  createMarketFlowEmbed,
  createSniperAlertEmbed,
  createMacroAlertEmbed,
} from './embeds/alertEmbed';
import { createFlowForgeEmbed, createFinalLockEmbed } from './embeds/flowForgeEmbed';
import { createAnalyticsEmbed } from './embeds/analyticsEmbed';
import { fetchLiveMarketOverview, MarketOverview } from './services/marketData';
import { handleDashboardCommand } from './commands/dashboard';
import { assignDiscordRoleToUser } from './discordBotService';
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
  if (discordClient && discordClient.isReady()) {
    botState.isReady = true;
    botState.pingMs = discordClient.ws.ping;
    botState.guildCount = discordClient.guilds.cache.size;
    botState.botTag = discordClient.user?.tag || 'VIXY AI#0000';
    botState.botId = discordClient.user?.id || null;
    botState.mode = 'ACTIVE_BOT';
  } else if (process.env.DISCORD_BOT_TOKEN) {
    if (botState.lastError) {
      botState.mode = process.env.DISCORD_WEBHOOK_URL ? 'WEBHOOK_FALLBACK' : 'DISABLED';
    } else {
      botState.mode = 'CONNECTING';
    }
  } else if (process.env.DISCORD_WEBHOOK_URL) {
    botState.isReady = true;
    botState.mode = 'WEBHOOK_FALLBACK';
  } else {
    botState.mode = 'DISABLED';
  }
  botState.inviteUrl = generateInviteUrl(process.env.DISCORD_CLIENT_ID);
  return botState;
}

async function registerCommands(token: string, clientId: string, guildId?: string) {
  const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Check VIXY AI Bot operational status & ping'),
    new SlashCommandBuilder()
      .setName('dashboard')
      .setDescription('Post auto-updating Storefront Live Dashboard')
      .addStringOption((o) => o.setName('asset').setDescription('Asset ticker (e.g. BTC, ETH)')),
    new SlashCommandBuilder()
      .setName('price')
      .setDescription('Fetch live crypto price & 24h market stats')
      .addStringOption((o) => o.setName('asset').setDescription('Symbol')),
    new SlashCommandBuilder()
      .setName('predict')
      .setDescription('Get VIXY AI Prediction Signal (Free Teaser or VIP full parameters)')
      .addStringOption((o) => o.setName('asset').setDescription('Asset ticker')),
    new SlashCommandBuilder().setName('status').setDescription('View VIXY AI Model Health, Accuracy & Brier Score'),
    new SlashCommandBuilder().setName('vip').setDescription('Check VIXY AI VIP Pro Membership benefits & upgrade link'),
    new SlashCommandBuilder().setName('leaderboard').setDescription('View Top Alpha Traders Leaderboard'),
    new SlashCommandBuilder().setName('analysis').setDescription('Get hourly market summary & orderflow bias'),
    new SlashCommandBuilder().setName('flowforge').setDescription('VIP Flow-Forge institutional order block inspection'),
    new SlashCommandBuilder().setName('analytics').setDescription('VIP Model accuracy & calibration analytics'),
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

  if (commandName === 'dashboard') {
    await handleDashboardCommand(interaction);
  } else if (commandName === 'ping') {
    await interaction.reply({
      content: `🟢 **VIXY AI ONLINE** • Latency: \`${discordClient.ws.ping || 12}ms\` • Model: \`v4.3-INCREMENTAL\``,
      ephemeral: true,
    });
  } else if (commandName === 'price') {
    await interaction.deferReply();
    const asset = interaction.options.getString('asset')?.toUpperCase() || 'BTC';
    const marketData = await fetchLiveMarketOverview(asset);
    await interaction.editReply({ embeds: [createDashboardEmbed(marketData)] });
  } else if (commandName === 'predict') {
    await interaction.deferReply();
    const asset = interaction.options.getString('asset')?.toUpperCase() || 'BTC';
    const marketData = await fetchLiveMarketOverview(asset);
    const embed = createFreeSignalEmbed(marketData);
    await interaction.editReply({ embeds: [embed] });
  } else if (commandName === 'status') {
    const marketData = await fetchLiveMarketOverview('BTC');
    await interaction.reply({ embeds: [createDashboardEmbed(marketData)] });
  } else if (commandName === 'analysis') {
    await interaction.deferReply();
    const marketData = await fetchLiveMarketOverview('BTC');
    await interaction.editReply({ embeds: [createMarketAnalysisEmbed(marketData)] });
  } else if (commandName === 'flowforge') {
    await interaction.deferReply();
    const marketData = await fetchLiveMarketOverview('BTC');
    await interaction.editReply({ embeds: [createFlowForgeEmbed(marketData)] });
  } else if (commandName === 'analytics') {
    await interaction.reply({ embeds: [createAnalyticsEmbed()] });
  } else if (commandName === 'vip') {
    await interaction.reply({
      content:
        `💎 **VIXY AI VIP PRO ADVANTAGE**\n` +
        `• **90-Second Speed Lead**: VIP receives signals 90s before public feed\n` +
        `• **Full Trade Parameters**: Exact Entry, Stop-Loss, and Take-Profit Targets\n` +
        `• **Flow-Forge Core**: Order blocks, liquidity sweeps, and taker absorption\n` +
        `• **Final-Lock Predictions**: Highest-confidence contract settlement calls\n\n` +
        `👉 **[ Launch VIXY Vault AI Dashboard → ](${(process.env.APP_URL || 'https://vixy.ai').replace(/\/$/, '')}/#pricing)**`,
      ephemeral: true,
    });
  } else if (commandName === 'leaderboard') {
    await interaction.reply({
      content:
        '🏆 **VIXY AI Alpha Traders**\n' +
        '1. 🥇 Whale_Hunter_X — +$42,850 PnL (84% WR)\n' +
        '2. 🥈 QuantAlpha_99 — +$28,400 PnL (79% WR)\n' +
        '3. 🥉 Satoshi_N — +$19,200 PnL (76% WR)\n' +
        '4. 🏅 DeltaRider — +$14,100 PnL (72% WR)\n' +
        '5. 🏅 VIXY_VIP_Member — +$11,800 PnL (71% WR)',
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

export async function initializeDiscordBot(): Promise<boolean> {
  const { valid, envConfig } = validateDiscordEnv();

  if (!valid) {
    console.warn(`[DiscordBot] Missing DISCORD_BOT_TOKEN on startup. Bot running in fallback/webhook mode.`);
    botState.mode = envConfig.DISCORD_WEBHOOK_URL ? 'WEBHOOK_FALLBACK' : 'DISABLED';
    return false;
  }

  const token = process.env.DISCORD_BOT_TOKEN!;
  const clientId = process.env.DISCORD_CLIENT_ID || '1534690638937981028';
  const guildId = process.env.DISCORD_GUILD_ID;

  try {
    discordClient.once('ready', async (client) => {
      console.log(`[DiscordBot] Connected as ${client.user.tag}! Listening across Discord server channels.`);
      botState.isReady = true;
      botState.botTag = client.user.tag;
      botState.botId = client.user.id;
      botState.guildCount = client.guilds.cache.size;
      botState.mode = 'ACTIVE_BOT';

      client.user.setPresence({
        activities: [{ name: 'VIXY AI Signals | /dashboard | /predict', type: 3 }],
        status: 'online',
      });

      if (clientId) {
        await registerCommands(token, clientId, guildId);
      }
    });

    discordClient.on('interactionCreate', handleInteraction);
    await discordClient.login(token);
    return true;
  } catch (err: any) {
    console.error('[DiscordBot] Connection failed:', err);
    botState.lastError = err?.message || String(err);
    botState.mode = process.env.DISCORD_WEBHOOK_URL ? 'WEBHOOK_FALLBACK' : 'DISABLED';
    return false;
  }
}

// Multi-tier signal dispatcher for Free vs. VIP channels
export async function dispatchSignalPair(symbol: string = 'BTC'): Promise<{ success: boolean; dispatchedTo: string[] }> {
  const marketData = await fetchLiveMarketOverview(symbol);
  const freeEmbed = createFreeSignalEmbed(marketData);
  const vipEmbed = createVipSignalEmbed(marketData);

  const dispatchedTo: string[] = [];

  // Helper to send to channel ID if client is logged in
  if (discordClient && discordClient.isReady()) {
    const signalsChannelId = process.env.DISCORD_SIGNALS_CHANNEL_ID;
    if (signalsChannelId) {
      try {
        const ch = (await discordClient.channels.fetch(signalsChannelId)) as TextChannel;
        if (ch && ch.isTextBased()) {
          await ch.send({ embeds: [freeEmbed] });
          dispatchedTo.push(`Free Channel (${signalsChannelId})`);
        }
      } catch (err) {
        console.warn(`[DiscordBot] Could not send to free signals channel ${signalsChannelId}:`, err);
      }
    }
  }

  // Webhook fallback for VIP or main channel
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'VIXY VIP Intelligence Core',
          embeds: [vipEmbed.toJSON()],
        }),
      });
      dispatchedTo.push('VIP Webhook Feed');
    } catch (err) {
      console.warn('[DiscordBot] VIP Webhook send failed:', err);
    }
  }

  botState.lastBroadcastAt = new Date().toISOString();
  botState.totalAlertsDispatched += 1;

  return { success: dispatchedTo.length > 0, dispatchedTo };
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
}): Promise<{ success: boolean; method: string; message: string }> {
  const webhookUrl = signalData.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
  const marketData = await fetchLiveMarketOverview(signalData.symbol.split('/')[0] || 'BTC');
  const embed = createVipSignalEmbed(marketData);

  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'VIXY Terminal Intelligence',
          avatar_url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=100',
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

export { assignDiscordRoleToUser } from './discordBotService';

export async function assignDiscordVipRole(
  discordUserId: string,
  guildId?: string
): Promise<{ success: boolean; message: string }> {
  return assignDiscordRoleToUser(discordUserId, 'ELITE', guildId);
}
