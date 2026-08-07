import { WebhookManager, DispatchResult } from '../../services/webhookManager';
import { DiscordConfigService } from '../../config/discordConfig';
import { env } from '../../config/env.config';

export type EventType =
  | 'FREE_BOT_SIGNAL'
  | 'FREE_WHALE_ALERT'
  | 'FREE_BREAKING_NEWS'
  | 'FREE_MARKET_ANALYSIS'
  | 'FREE_VIXY_PROTECTION'
  | 'VIP_PREMIUM_SIGNAL'
  | 'VIP_AI_TERMINAL'
  | 'VIP_ANALYTICS'
  | 'VIP_FLOW_FORGE'
  | 'SYSTEM_BOT_LOG'
  | 'SYSTEM_AUDIT_LOG'
  | 'SYSTEM_ERROR_LOG';

export interface SignalEventPayload {
  direction: 'BUY UP' | 'BUY DOWN' | 'WAIT';
  confidence: number;
  lockProgressPct: number;
  institutionalBias: string;
  explanation: string;
  countdownSeconds: number;
  asset?: string;
  spotPrice?: number;
}

export interface VipSignalEventPayload extends SignalEventPayload {
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRating: string;
  tradeGrade: string;
  positionSize: string;
  riskRewardRatio: string;
  reversalRiskPct: number;
  positionHealthPct: number;
  whaleConfirmation: string;
  tradeDurationMins: number;
  recommendedAction: string;
}

export interface WhaleEventPayload {
  sizeUSD: string;
  asset: string;
  action: 'BOUGHT' | 'SOLD' | 'WITHDRAWN' | 'DEPOSITED';
  venue: string;
  historicalBias: 'Bullish' | 'Bearish' | 'Neutral';
  expectedImpact: string;
  estimatedDuration: string;
  confidence: string;
}

export interface BreakingNewsEventPayload {
  headline: string;
  category: 'FED' | 'CPI' | 'ETF' | 'BLACKROCK' | 'EXCHANGE' | 'LIQUIDATION';
  summary: string;
  urgency: 'HIGH' | 'CRITICAL';
}

export interface MarketAnalysisEventPayload {
  trend: string;
  momentum: string;
  volatility: string;
  institutionalBias: string;
  aiConfidence: number;
  asset?: string;
}

export interface ProtectionEventPayload {
  positionHealthPct: number;
  status: 'SAFE' | 'WATCH' | 'DANGER' | 'EXIT RECOMMENDED';
  reversalProbabilityPct: number;
  reasons: string[];
  suggestedAction: string;
}

export interface AiTerminalEventPayload {
  timestamp: string;
  step: string;
  status: string;
  verified: boolean;
  lockPct: number;
}

export interface AnalyticsEventPayload {
  period: 'MORNING BRIEFING' | 'EVENING RECAP' | 'WEEKLY ACCURACY' | 'BACKTEST SUMMARY';
  totalCalls: number;
  winRatePct: number;
  topWinner: string;
  institutionalPositioning: string;
  summary: string;
}

export interface FlowForgeEventPayload {
  delta: string;
  liquiditySummary: string;
  darkPoolActivity: string;
  orderbookImbalance: string;
  historicalSimilarity: string;
  expectedContinuation: string;
}

export interface LogEventPayload {
  title: string;
  details: string;
  userEmail?: string;
  role?: string;
  timestamp?: string;
  severity?: 'INFO' | 'WARN' | 'ERROR';
}

/**
 * Enterprise AI Event Router for VIXY AI Discord Network.
 * Routes discrete market and system intelligence events to the exact Discord channels/webhooks
 * with institutional embed formatting and Zero UI-Spam rules.
 */
export class AiEventRouter {
  /**
   * Main Dispatch Router: Classifies event, generates embed, resolves target webhook, and posts.
   */
  public static async dispatchEvent(
    eventType: EventType,
    payload: any
  ): Promise<DispatchResult> {
    const channels = DiscordConfigService.getChannels();

    switch (eventType) {
      case 'FREE_BOT_SIGNAL':
        return this.sendFreeBotSignal(payload as SignalEventPayload, channels.aiSignals.webhookUrl);

      case 'FREE_WHALE_ALERT':
        return this.sendWhaleAlert(payload as WhaleEventPayload, channels.whaleTracker.webhookUrl);

      case 'FREE_BREAKING_NEWS':
        return this.sendBreakingNews(payload as BreakingNewsEventPayload, channels.breakingNews.webhookUrl);

      case 'FREE_MARKET_ANALYSIS':
        return this.sendMarketAnalysis(payload as MarketAnalysisEventPayload, channels.marketAnalysis.webhookUrl);

      case 'FREE_VIXY_PROTECTION':
        return this.sendVixyProtection(payload as ProtectionEventPayload, channels.vixysProtection.webhookUrl);

      case 'VIP_PREMIUM_SIGNAL':
        return this.sendVipPremiumSignal(payload as VipSignalEventPayload, channels.premiumSignals.webhookUrl);

      case 'VIP_AI_TERMINAL':
        return this.sendAiTerminalLog(payload as AiTerminalEventPayload, channels.aiTerminal.webhookUrl);

      case 'VIP_ANALYTICS':
        return this.sendAnalyticsReport(payload as AnalyticsEventPayload, channels.analytics.webhookUrl);

      case 'VIP_FLOW_FORGE':
        return this.sendFlowForgeIntel(payload as FlowForgeEventPayload, channels.flowForge.webhookUrl);

      case 'SYSTEM_BOT_LOG':
        return this.sendLog(payload as LogEventPayload, channels.botLogs.webhookUrl, '🤖 VIXY BOT ENGINE LOG');

      case 'SYSTEM_AUDIT_LOG':
        return this.sendLog(payload as LogEventPayload, channels.auditLogs.webhookUrl, '🔒 VIXY AUDIT SECURITY LOG');

      case 'SYSTEM_ERROR_LOG':
        return this.sendLog(payload as LogEventPayload, channels.errorLogs.webhookUrl, '⚠️ VIXY SYSTEM EXCEPTION LOG');

      default:
        return {
          success: false,
          channelOrWebhook: 'UNKNOWN_EVENT',
          attempts: 0,
          error: `Unrecognized EventType: ${eventType}`,
        };
    }
  }

  // 1. FREE BOT SIGNAL (#bot-signals)
  private static async sendFreeBotSignal(
    data: SignalEventPayload,
    webhookUrl?: string
  ): Promise<DispatchResult> {
    const isBuyUp = data.direction === 'BUY UP';
    const isWait = data.direction === 'WAIT';

    const color = isWait ? 0x2b2111 : 0x0f1f18; // Charcoal dark green / amber
    const titleEmoji = '🧠';

    const embed = {
      title: `${titleEmoji} VIXY AI • 15m Market Scan`,
      description: `Institutional activity has increased across BTC during the current 15-minute cycle.`,
      color,
      fields: [
        { name: 'Current AI Confidence', value: `\`${data.confidence.toFixed(1)}%\``, inline: true },
        { name: 'Market Bias', value: `\`${isWait ? 'Neutral' : isBuyUp ? 'Bullish' : 'Bearish'}\``, inline: true },
        { name: 'Probability Score', value: `\`${(data.confidence * 0.96).toFixed(1)}%\``, inline: true },
        {
          name: '🔒 Full trade released to VIXY ELITE',
          value:
            '• **Entry Price**: Locked\n' +
            '• **Stop Loss**: Locked\n' +
            '• **Take Profit**: Locked\n' +
            '• **Risk Rating**: Locked\n' +
            '• **Live Position Updates**: Locked',
          inline: false,
        },
        {
          name: ' ',
          value:
            `🚀 Unlock live entries, exits, VIXY Protection™, and institutional intelligence inside VIXY ELITE.\n\n` +
            `👉 **[ Launch VIXY Vault AI Dashboard → ](${env.APP_URL}/#pricing)**`,
          inline: false,
        },
      ],
      footer: { text: 'VIXY AI Signal Scanner • Confidential Quantitative Intelligence' },
      timestamp: new Date().toISOString(),
    };

    return WebhookManager.sendWebhook(webhookUrl, {
      username: 'VIXY AI Signal Scanner',
      avatar_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&q=80',
      embeds: [embed],
    });
  }

  // 2. WHALE TRACKER (#whale-tracker)
  private static async sendWhaleAlert(
    data: WhaleEventPayload,
    webhookUrl?: string
  ): Promise<DispatchResult> {
    const isBull = data.historicalBias === 'Bullish';
    const color = 0x0c1e28; // Deep charcoal cyan

    const embed = {
      title: `🐋 Institutional Surveillance Intercept`,
      description: `**${data.sizeUSD} ${data.asset} ${data.action}** on **${data.venue}**`,
      color,
      fields: [
        { name: 'Venue', value: `\`${data.venue}\``, inline: true },
        { name: 'Impact', value: `\`${data.historicalBias}\``, inline: true },
        { name: 'Confidence', value: `\`${data.confidence}\``, inline: true },
        { name: 'Expected Market Influence', value: `\`${data.expectedImpact}\``, inline: true },
        { name: 'Model Edge', value: `\`+2.3%\``, inline: true },
        {
          name: '🔒 Institutional Orderbook Depth',
          value:
            'VIP members receive sub-second orderbook depth analysis & precise level reaction alerts.',
          inline: false,
        },
        {
          name: ' ',
          value:
            `🚀 Unlock live entries, exits, VIXY Protection™, and institutional intelligence inside VIXY ELITE.\n\n` +
            `👉 **[ Unlock VIXY ELITE Today → ](${env.APP_URL}/#pricing)**`,
          inline: false,
        },
      ],
      footer: { text: 'VIXY AI Signal Scanner • Dark Pool & Block Desk Surveillance' },
      timestamp: new Date().toISOString(),
    };

    return WebhookManager.sendWebhook(webhookUrl, {
      username: 'VIXY AI Signal Scanner',
      avatar_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&q=80',
      embeds: [embed],
    });
  }

  // 3. BREAKING NEWS (#breaking-news)
  private static async sendBreakingNews(
    data: BreakingNewsEventPayload,
    webhookUrl?: string
  ): Promise<DispatchResult> {
    const embed = {
      title: `🚨 Breaking Market Intelligence`,
      description: `**${data.headline}**\n\n${data.summary}\n\nInstitutional volatility expected over the next 30 minutes. VIXY models remain neutral pending confirmation.`,
      color: 0x221118, // Deep dark rose/charcoal
      fields: [
        {
          name: ' ',
          value:
            `🚀 Unlock live entries, exits, VIXY Protection™, and institutional intelligence inside VIXY ELITE.\n\n` +
            `👉 **[ Unlock VIXY ELITE Today → ](${env.APP_URL}/#pricing)**`,
          inline: false,
        },
      ],
      footer: { text: 'VIXY AI Signal Scanner • Bloomberg Terminal Grade Intelligence' },
      timestamp: new Date().toISOString(),
    };

    return WebhookManager.sendWebhook(webhookUrl, {
      username: 'VIXY AI Signal Scanner',
      avatar_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&q=80',
      embeds: [embed],
    });
  }

  // 4. MARKET ANALYSIS (#market-analysis)
  private static async sendMarketAnalysis(
    data: MarketAnalysisEventPayload,
    webhookUrl?: string
  ): Promise<DispatchResult> {
    const embed = {
      title: `📊 Hourly Institutional Market Intelligence`,
      description:
        `• **Market Structure**: ${data.trend}\n` +
        `• **Institutional Flow**: ${data.momentum}\n` +
        `• **Largest Whale Intercept**: $18.4M Coinbase Sweep\n` +
        `• **Volatility Index**: ${data.volatility}\n` +
        `• **Liquidity Wall**: $42M Bids at $64,100\n` +
        `• **AI Model Confidence**: **${data.aiConfidence.toFixed(1)}%**\n` +
        `• **Most Likely Scenario**: VWAP Reclaim Continuation`,
      color: 0x111a2e, // Dark navy charcoal
      fields: [
        {
          name: ' ',
          value:
            `🚀 Unlock live entries, exits, VIXY Protection™, and institutional intelligence inside VIXY ELITE.\n\n` +
            `👉 **[ Launch VIXY Vault AI Dashboard → ](${env.APP_URL}/#pricing)**`,
          inline: false,
        },
      ],
      footer: { text: 'VIXY AI Signal Scanner • Quantitative Desk Synthesis' },
      timestamp: new Date().toISOString(),
    };

    return WebhookManager.sendWebhook(webhookUrl, {
      username: 'VIXY AI Signal Scanner',
      avatar_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&q=80',
      embeds: [embed],
    });
  }

  // 5. VIXY PROTECTION (#vixys-protection)
  private static async sendVixyProtection(
    data: ProtectionEventPayload,
    webhookUrl?: string
  ): Promise<DispatchResult> {
    const isSafe = data.status === 'SAFE';
    const color = isSafe ? 0x0a1e16 : 0x240d13; // Dark charcoal green / red

    // Build block progress bar
    const filledBlocks = Math.round(data.positionHealthPct / 10);
    const emptyBlocks = 10 - filledBlocks;
    const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

    const embed = {
      title: `🛡️ VIXY Protection Alert`,
      description:
        `**Position Risk Status**: \`${data.status === 'SAFE' ? 'Position Risk Low' : 'Position Risk Elevated'}\`\n\n` +
        `**Current Position Health**\n` +
        `\`${progressBar}\` **${data.positionHealthPct}%**\n\n` +
        `**Reversal Risk**: \`${data.reversalProbabilityPct}%\``,
      color,
      fields: [
        {
          name: 'Sentinel Observation',
          value: data.reasons.map((r) => `• ${r}`).join('\n') || '• Real-time sentinel monitoring intact',
          inline: false,
        },
        {
          name: 'Recommendation',
          value: `**${data.suggestedAction}**`,
          inline: false,
        },
      ],
      footer: { text: 'VIXY Protection™ • Active Real-Time Risk Officer' },
      timestamp: new Date().toISOString(),
    };

    return WebhookManager.sendWebhook(webhookUrl, {
      username: 'VIXY AI Signal Scanner',
      avatar_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&q=80',
      embeds: [embed],
    });
  }

  // 6. VIP PREMIUM SIGNAL (#premium-signals)
  private static async sendVipPremiumSignal(
    data: VipSignalEventPayload,
    webhookUrl?: string
  ): Promise<DispatchResult> {
    const color = 0x1d0f38; // VIP Deep Charcoal Purple

    const embed = {
      title: `💎 VIXY ELITE • HIGH-CONVICTION INSTITUTIONAL SETUP`,
      description: `⚡ **INSTANT VIP EXECUTION ALERT** — ${data.direction} BTC/USD`,
      color,
      fields: [
        { name: 'Direction', value: `**${data.direction}**`, inline: true },
        { name: 'Model Confidence', value: `\`${data.confidence.toFixed(1)}%\``, inline: true },
        { name: 'Trade Grade', value: `\`${data.tradeGrade}\``, inline: true },
        { name: '🎯 Exact Entry', value: `\`$${data.entryPrice.toLocaleString()}\``, inline: true },
        { name: '🛑 Stop Loss', value: `\`$${data.stopLoss.toLocaleString()}\``, inline: true },
        { name: '🏁 Take Profit 1', value: `\`$${data.takeProfit1.toLocaleString()}\``, inline: true },
        { name: '🏁 Take Profit 2', value: `\`$${data.takeProfit2.toLocaleString()}\``, inline: true },
        { name: 'Risk / Reward', value: `\`${data.riskRewardRatio}\``, inline: true },
        { name: 'Position Size', value: `\`${data.positionSize}\``, inline: true },
        { name: 'AI Lock Score', value: `\`${data.lockProgressPct}% LOCKED\``, inline: true },
        { name: 'Reversal Risk', value: `\`${data.reversalRiskPct}%\``, inline: true },
        { name: 'Position Health', value: `\`${data.positionHealthPct}%\``, inline: true },
        { name: 'Whale Confirmation', value: `\`${data.whaleConfirmation}\``, inline: false },
        { name: 'Institutional Notes', value: `Orderbook taker delta swept L2 liquidity wall. Kalshi implied odds pricing +8.4% value edge.`, inline: false },
        { name: 'Recommended Action', value: `**${data.recommendedAction}**`, inline: false },
      ],
      footer: { text: '🔒 VIXY ELITE Confidential Feed • Proprietary Model Output' },
      timestamp: new Date().toISOString(),
    };

    return WebhookManager.sendWebhook(webhookUrl, {
      username: 'VIXY AI Signal Scanner',
      avatar_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&q=80',
      embeds: [embed],
    });
  }

  // 7. VIP AI TERMINAL (#ai-terminal)
  private static async sendAiTerminalLog(
    data: AiTerminalEventPayload,
    webhookUrl?: string
  ): Promise<DispatchResult> {
    const embed = {
      title: `🧠 AI TERMINAL • REAL-TIME REASONING LOG`,
      description: `\`[${data.timestamp}]\` **${data.step}** ${data.verified ? '✓' : '○'}\nStatus: **${data.status}**`,
      color: 0x17122e,
      fields: [
        { name: 'Lock Progress', value: `\`${data.lockPct}% LOCKED\``, inline: true },
      ],
      footer: { text: 'VIXY AI Terminal Stream • Sub-Second Model Execution' },
      timestamp: new Date().toISOString(),
    };

    return WebhookManager.sendWebhook(webhookUrl, {
      username: 'VIXY AI Signal Scanner',
      avatar_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&q=80',
      embeds: [embed],
    });
  }

  // 8. VIP ANALYTICS (#analytics)
  private static async sendAnalyticsReport(
    data: AnalyticsEventPayload,
    webhookUrl?: string
  ): Promise<DispatchResult> {
    const embed = {
      title: `📊 VIXY AI ANALYTICS REPORT [${data.period}]`,
      description: data.summary,
      color: 0x0d1f18,
      fields: [
        { name: 'Total Calls', value: `\`${data.totalCalls}\``, inline: true },
        { name: 'Win Rate', value: `\`${data.winRatePct.toFixed(1)}%\``, inline: true },
        { name: 'Top Winner', value: `\`${data.topWinner}\``, inline: true },
        { name: 'Institutional Positioning', value: data.institutionalPositioning, inline: false },
      ],
      footer: { text: 'VIXY Performance Analytics • Institutional Calibration' },
      timestamp: new Date().toISOString(),
    };

    return WebhookManager.sendWebhook(webhookUrl, {
      username: 'VIXY AI Signal Scanner',
      avatar_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&q=80',
      embeds: [embed],
    });
  }

  // 9. VIP FLOW FORGE (#flow-forge)
  private static async sendFlowForgeIntel(
    data: FlowForgeEventPayload,
    webhookUrl?: string
  ): Promise<DispatchResult> {
    const embed = {
      title: `⚡ FLOW FORGE • INSTITUTIONAL ORDER FLOW`,
      description: `Institutional Orderbook & Taker Delta Telemetry`,
      color: 0x091b26,
      fields: [
        { name: 'Cumulative Delta', value: `\`${data.delta}\``, inline: true },
        { name: 'Orderbook Imbalance', value: `\`${data.orderbookImbalance}\``, inline: true },
        { name: 'Dark Pool Activity', value: `\`${data.darkPoolActivity}\``, inline: true },
        { name: 'Liquidity Structure', value: data.liquiditySummary, inline: false },
        { name: 'Expected Continuation', value: `\`${data.expectedContinuation}\``, inline: true },
      ],
      footer: { text: 'VIXY Flow Forge Intelligence • High-Frequency Orderbook Metrics' },
      timestamp: new Date().toISOString(),
    };

    return WebhookManager.sendWebhook(webhookUrl, {
      username: 'VIXY AI Signal Scanner',
      avatar_url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&q=80',
      embeds: [embed],
    });
  }

  // 10. SYSTEM LOGS (#bot-logs, #audit-logs, #error-logs)
  private static async sendLog(
    data: LogEventPayload,
    webhookUrl?: string,
    username: string = '🔒 VIXY SYSTEM LOG'
  ): Promise<DispatchResult> {
    const isError = data.severity === 'ERROR';
    const isWarn = data.severity === 'WARN';
    const color = isError ? 0xf43f5e : isWarn ? 0xf59e0b : 0x64748b;

    const embed = {
      title: data.title,
      description: data.details,
      color,
      fields: [
        ...(data.userEmail ? [{ name: 'User Email', value: data.userEmail, inline: true }] : []),
        ...(data.role ? [{ name: 'Role', value: data.role, inline: true }] : []),
      ],
      footer: { text: 'VIXY System Telemetry • Confidential Internal Log' },
      timestamp: data.timestamp || new Date().toISOString(),
    };

    return WebhookManager.sendWebhook(webhookUrl, {
      username,
      embeds: [embed],
    });
  }
}
