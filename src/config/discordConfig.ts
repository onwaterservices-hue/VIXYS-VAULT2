import { env } from './env.config';

export type DiscordChannelCategory = 'FREE_INFO' | 'FREE_COMMUNITY' | 'FREE_INTELLIGENCE' | 'ELITE' | 'LOGS';

export interface ChannelMapping {
  id: string;
  name: string;
  category: DiscordChannelCategory;
  isEliteOnly: boolean;
  webhookUrl?: string;
}

/**
 * Enterprise Helper Module for Discord Channel & Role Mapping.
 * Resolves channel IDs, webhook overrides, and tier permissions dynamically.
 */
export class DiscordConfigService {
  /**
   * Retrieves all mapped Free & Elite channels with fallback resolution.
   */
  public static getChannels(): Record<string, ChannelMapping> {
    return {
      // Free Info & Onboarding
      launch: {
        id: env.DISCORD_CHANNEL_LAUNCH,
        name: '🚀 launch-vixys-vault',
        category: 'FREE_INFO',
        isEliteOnly: false,
      },
      welcome: {
        id: env.DISCORD_CHANNEL_WELCOME,
        name: '👋 welcome',
        category: 'FREE_INFO',
        isEliteOnly: false,
      },
      verify: {
        id: env.DISCORD_CHANNEL_VERIFY,
        name: '🛰 verify',
        category: 'FREE_INFO',
        isEliteOnly: false,
      },
      rules: {
        id: env.DISCORD_CHANNEL_RULES,
        name: '📜 rules',
        category: 'FREE_INFO',
        isEliteOnly: false,
      },
      faq: {
        id: env.DISCORD_CHANNEL_FAQ,
        name: '❓ faq',
        category: 'FREE_INFO',
        isEliteOnly: false,
      },
      events: {
        id: env.DISCORD_CHANNEL_EVENTS_GIVEAWAYS,
        name: '🎉 events-giveaways',
        category: 'FREE_COMMUNITY',
        isEliteOnly: false,
      },

      // Free Community
      inviteToEarn: {
        id: env.DISCORD_CHANNEL_INVITE_TO_EARN,
        name: '💎 invite-to-earn',
        category: 'FREE_COMMUNITY',
        isEliteOnly: false,
      },
      inviteFeed: {
        id: env.DISCORD_CHANNEL_INVITE_FEED,
        name: '🏆 invite-feed',
        category: 'FREE_COMMUNITY',
        isEliteOnly: false,
      },
      chatroom: {
        id: env.DISCORD_CHANNEL_CHATROOM,
        name: '💬 chatroom',
        category: 'FREE_COMMUNITY',
        isEliteOnly: false,
      },
      tradingFloor: {
        id: env.DISCORD_CHANNEL_TRADING_FLOOR,
        name: '📈 trading-floor',
        category: 'FREE_COMMUNITY',
        isEliteOnly: false,
      },
      memberWins: {
        id: env.DISCORD_CHANNEL_MEMBER_WINS,
        name: '💰 member-wins',
        category: 'FREE_COMMUNITY',
        isEliteOnly: false,
      },
      announcements: {
        id: env.DISCORD_CHANNEL_ANNOUNCEMENTS,
        name: '📢 announcements',
        category: 'FREE_COMMUNITY',
        isEliteOnly: false,
      },

      // VIXY Live Intelligence (Free Funnel Layer)
      marketAnalysis: {
        id: env.DISCORD_CHANNEL_MARKET_ANALYSIS,
        name: '📊 market-analysis',
        category: 'FREE_INTELLIGENCE',
        isEliteOnly: false,
        webhookUrl: env.DISCORD_WEBHOOK_ANALYSIS || env.DISCORD_WEBHOOK_URL,
      },
      aiSignals: {
        id: env.DISCORD_CHANNEL_AI_SIGNALS,
        name: '🤖 ai-signals',
        category: 'FREE_INTELLIGENCE',
        isEliteOnly: false,
        webhookUrl: env.DISCORD_WEBHOOK_SIGNALS || env.DISCORD_WEBHOOK_URL,
      },
      whaleTracker: {
        id: env.DISCORD_CHANNEL_WHALE_TRACKER,
        name: '🐋 whale-tracker',
        category: 'FREE_INTELLIGENCE',
        isEliteOnly: false,
        webhookUrl: env.DISCORD_WEBHOOK_WHALE || env.DISCORD_WEBHOOK_URL,
      },
      breakingNews: {
        id: env.DISCORD_CHANNEL_BREAKING_NEWS,
        name: '🚨 breaking-news',
        category: 'FREE_INTELLIGENCE',
        isEliteOnly: false,
        webhookUrl: env.DISCORD_WEBHOOK_BREAKING || env.DISCORD_WEBHOOK_URL,
      },
      vixysProtection: {
        id: process.env.DISCORD_CHANNEL_PROTECTION || '',
        name: '🛡️ vixys-protection',
        category: 'FREE_INTELLIGENCE',
        isEliteOnly: false,
        webhookUrl: env.DISCORD_WEBHOOK_PROTECTION || env.DISCORD_WEBHOOK_URL,
      },

      // ELITE CATEGORY LAYER (UNLOCKED FOR PRO MEMBERS)
      premiumSignals: {
        id: env.DISCORD_CHANNEL_PREMIUM_SIGNALS,
        name: '🔒 premium-signals',
        category: 'ELITE',
        isEliteOnly: true,
        webhookUrl: env.DISCORD_WEBHOOK_VIP || env.DISCORD_WEBHOOK_URL,
      },
      aiTerminal: {
        id: process.env.DISCORD_CHANNEL_AI_TERMINAL || '',
        name: '🧠 ai-terminal',
        category: 'ELITE',
        isEliteOnly: true,
        webhookUrl: env.DISCORD_WEBHOOK_TERMINAL || env.DISCORD_WEBHOOK_VIP || env.DISCORD_WEBHOOK_URL,
      },
      analytics: {
        id: process.env.DISCORD_CHANNEL_ANALYTICS || '',
        name: '📊 analytics',
        category: 'ELITE',
        isEliteOnly: true,
        webhookUrl: env.DISCORD_WEBHOOK_ANALYTICS || env.DISCORD_WEBHOOK_VIP || env.DISCORD_WEBHOOK_URL,
      },
      flowForge: {
        id: env.DISCORD_CHANNEL_INSTITUTIONAL_ORDER_FLOW || '',
        name: '⚡ flow-forge',
        category: 'ELITE',
        isEliteOnly: true,
        webhookUrl: env.DISCORD_WEBHOOK_FLOW || env.DISCORD_WEBHOOK_VIP || env.DISCORD_WEBHOOK_URL,
      },
      eliteAnalysis: {
        id: env.DISCORD_CHANNEL_ELITE_ANALYSIS,
        name: '🔒 elite-analysis',
        category: 'ELITE',
        isEliteOnly: true,
        webhookUrl: env.DISCORD_WEBHOOK_VIP || env.DISCORD_WEBHOOK_URL,
      },
      institutionalOrderFlow: {
        id: env.DISCORD_CHANNEL_INSTITUTIONAL_ORDER_FLOW,
        name: '🔒 institutional-order-flow',
        category: 'ELITE',
        isEliteOnly: true,
        webhookUrl: env.DISCORD_WEBHOOK_FLOW || env.DISCORD_WEBHOOK_VIP || env.DISCORD_WEBHOOK_URL,
      },
      liquidityMap: {
        id: env.DISCORD_CHANNEL_LIQUIDITY_MAP,
        name: '🔒 liquidity-map',
        category: 'ELITE',
        isEliteOnly: true,
        webhookUrl: env.DISCORD_WEBHOOK_VIP || env.DISCORD_WEBHOOK_URL,
      },
      aiDashboard: {
        id: env.DISCORD_CHANNEL_AI_DASHBOARD,
        name: '🔒 AI dashboard',
        category: 'ELITE',
        isEliteOnly: true,
        webhookUrl: env.DISCORD_WEBHOOK_VIP || env.DISCORD_WEBHOOK_URL,
      },
      vipChat: {
        id: env.DISCORD_CHANNEL_VIP_CHAT,
        name: '🔒 VIP chat',
        category: 'ELITE',
        isEliteOnly: true,
      },

      // Logs & Diagnostics
      auditLogs: {
        id: env.DISCORD_CHANNEL_AUDIT_LOGS,
        name: '🔒 audit-logs',
        category: 'LOGS',
        isEliteOnly: true,
        webhookUrl: env.DISCORD_WEBHOOK_LOGS || env.DISCORD_WEBHOOK_URL,
      },
      botLogs: {
        id: process.env.DISCORD_CHANNEL_BOT_LOGS || '',
        name: '🤖 bot-logs',
        category: 'LOGS',
        isEliteOnly: true,
        webhookUrl: env.DISCORD_WEBHOOK_LOGS || env.DISCORD_WEBHOOK_URL,
      },
      errorLogs: {
        id: env.DISCORD_CHANNEL_ERROR_LOGS,
        name: '⚠️ error-logs',
        category: 'LOGS',
        isEliteOnly: true,
        webhookUrl: env.DISCORD_WEBHOOK_LOGS || env.DISCORD_WEBHOOK_URL,
      },
    };
  }

  /**
   * Resolves target channel ID or webhook URL based on event type and user status.
   */
  public static getTargetChannel(type: 'SIGNALS' | 'ANALYSIS' | 'WHALE' | 'BREAKING', isElite: boolean = false): {
    channelId: string;
    webhookUrl: string;
    isEliteTarget: boolean;
  } {
    const channels = this.getChannels();

    if (isElite) {
      if (type === 'SIGNALS') {
        return {
          channelId: channels.premiumSignals.id || channels.aiSignals.id,
          webhookUrl: channels.premiumSignals.webhookUrl || env.DISCORD_WEBHOOK_URL,
          isEliteTarget: true,
        };
      }
      if (type === 'ANALYSIS') {
        return {
          channelId: channels.eliteAnalysis.id || channels.marketAnalysis.id,
          webhookUrl: channels.eliteAnalysis.webhookUrl || env.DISCORD_WEBHOOK_URL,
          isEliteTarget: true,
        };
      }
    }

    // Default to Free Funnel Channels
    switch (type) {
      case 'SIGNALS':
        return {
          channelId: channels.aiSignals.id,
          webhookUrl: channels.aiSignals.webhookUrl || env.DISCORD_WEBHOOK_URL,
          isEliteTarget: false,
        };
      case 'WHALE':
        return {
          channelId: channels.whaleTracker.id,
          webhookUrl: channels.whaleTracker.webhookUrl || env.DISCORD_WEBHOOK_URL,
          isEliteTarget: false,
        };
      case 'BREAKING':
        return {
          channelId: channels.breakingNews.id,
          webhookUrl: channels.breakingNews.webhookUrl || env.DISCORD_WEBHOOK_URL,
          isEliteTarget: false,
        };
      case 'ANALYSIS':
      default:
        return {
          channelId: channels.marketAnalysis.id,
          webhookUrl: channels.marketAnalysis.webhookUrl || env.DISCORD_WEBHOOK_URL,
          isEliteTarget: false,
        };
    }
  }

  /**
   * Returns role IDs mapped for Discord permission verification.
   */
  public static getRoles() {
    return {
      verified: env.DISCORD_ROLE_VERIFIED,
      unverified: env.DISCORD_ROLE_UNVERIFIED,
      elite: env.DISCORD_ROLE_ELITE || env.DISCORD_ROLE_VIP,
      vip: env.DISCORD_ROLE_VIP,
      moderator: env.DISCORD_ROLE_MODERATOR,
      administrator: env.DISCORD_ROLE_ADMINISTRATOR,
      owner: env.DISCORD_ROLE_OWNER,
      support: env.DISCORD_ROLE_SUPPORT,
      bot: env.DISCORD_ROLE_BOT,
      muted: env.DISCORD_ROLE_MUTED,
      giveawayWinner: env.DISCORD_ROLE_GIVEAWAY_WINNER,
      inviteChampion: env.DISCORD_ROLE_INVITE_CHAMPION,
      lifetime: env.DISCORD_ROLE_LIFETIME,
      developer: env.DISCORD_ROLE_DEVELOPER,
      tester: env.DISCORD_ROLE_TESTER,
    };
  }
}
