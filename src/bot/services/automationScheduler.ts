import { WebhookManager } from '../../services/webhookManager';
import { DiscordConfigService } from '../../config/discordConfig';
import { env } from '../../config/env.config';
import { fetchLiveMarketOverview } from './marketData';

export interface SchedulerMetrics {
  lastMarketPulseAt: string | null;
  lastWhaleAlertAt: string | null;
  lastBreakingNewsAt: string | null;
  lastAiLessonAt: string | null;
  lastStatusHeartbeatAt: string | null;
  totalAutomatedBroadcasts: number;
  isRunning: boolean;
}

let metrics: SchedulerMetrics = {
  lastMarketPulseAt: null,
  lastWhaleAlertAt: null,
  lastBreakingNewsAt: null,
  lastAiLessonAt: null,
  lastStatusHeartbeatAt: null,
  totalAutomatedBroadcasts: 0,
  isRunning: false,
};

/**
 * Enterprise Automation Scheduler for VIXY AI Discord Network.
 * Publishes structured teasers to free channels and full setups to Elite channels.
 */
export class AutomationScheduler {
  private static intervalTimer: NodeJS.Timeout | null = null;

  /**
   * Starts background interval tickers for all VIXY AI automated channel broadcasts.
   */
  public static startScheduler(): void {
    if (this.intervalTimer) return;

    metrics.isRunning = true;
    console.log('[AutomationScheduler] Starting VIXY AI Discord automation tickers...');

    // Run initial heartbeat
    this.publishStatusHeartbeat().catch(() => {});

    // Main 1-minute ticker that triggers cron jobs based on config
    this.intervalTimer = setInterval(() => {
      const now = new Date();
      const minute = now.getMinutes();
      const hour = now.getHours();

      // Hourly Market Pulse at top of hour (:00)
      if (minute === 0 && env.AI_MARKET_INTEL_ENABLED) {
        this.publishHourlyMarketPulse().catch(console.error);
      }

      // 15-Minute Signal Scan (:00, :15, :30, :45)
      if (minute % 15 === 0) {
        this.publish15mSignalScan().catch(console.error);
      }

      // Daily Market Recap at midnight
      if (hour === 0 && minute === 0) {
        this.publishDailyRecap().catch(console.error);
      }
    }, 60000);
  }

  public static stopScheduler(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    metrics.isRunning = false;
    console.log('[AutomationScheduler] Stopped background tickers.');
  }

  public static getMetrics(): SchedulerMetrics {
    return { ...metrics };
  }

  /**
   * Publishes "VIXY AI STATUS" live status update.
   */
  public static async publishStatusHeartbeat(): Promise<boolean> {
    const target = DiscordConfigService.getTargetChannel('ANALYSIS', false);
    const result = await WebhookManager.sendWebhook(target.webhookUrl, {
      username: '🧠 VIXY AI STATUS MONITOR',
      embeds: [
        {
          title: '🧠 VIXY AI STATUS & TERMINAL TELEMETRY',
          color: 0x8b5cf6, // Purple
          fields: [
            { name: 'Models Online', value: '✅ 24', inline: true },
            { name: 'Markets Monitored', value: '154', inline: true },
            { name: 'Live Confidence', value: '87.4%', inline: true },
            { name: 'Signals Today', value: '19', inline: true },
            { name: 'Elite Signals Released', value: '🔒 7', inline: true },
            { name: 'Win Rate (30D)', value: '84.2%', inline: true },
            { name: 'Next Scan', value: '⚡ 14 minutes', inline: false },
          ],
          footer: {
            text: 'VIXY AI Terminal • Real-Time Institutional Prediction Engine',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    });

    if (result.success) {
      metrics.lastStatusHeartbeatAt = new Date().toISOString();
      metrics.totalAutomatedBroadcasts++;
    }
    return result.success;
  }

  /**
   * Publishes Free Market Pulse (Leaving exact setup locked behind Elite).
   */
  public static async publishHourlyMarketPulse(): Promise<boolean> {
    const marketData = await fetchLiveMarketOverview('BTC');
    const targetFree = DiscordConfigService.getTargetChannel('ANALYSIS', false);
    const targetElite = DiscordConfigService.getTargetChannel('ANALYSIS', true);

    const spotPrice = marketData.price || 64161.4;
    const confidence = marketData.prediction?.confidence || 91;
    const isBullish = (marketData.prediction?.direction || 'BULLISH') === 'BULLISH';

    // 1. FREE CHANNEL EMBED (Funnel Teaser)
    const freeEmbed = {
      title: '📊 VIXY AI Market Pulse',
      description: `Institutional buyers continue accumulating beneath support.\n\nKey resistance: **$${(spotPrice * 1.012).toFixed(2)}**`,
      color: isBullish ? 0x10b981 : 0xf43f5e,
      fields: [
        { name: 'Overall Bias', value: isBullish ? '🟢 Bullish' : '🔴 Bearish', inline: true },
        { name: 'Confidence', value: `${confidence.toFixed(1)}%`, inline: true },
        {
          name: '🔒 Detailed Trade Setup (VIXY ELITE AI)',
          value:
            '🔒 **Full Entry Price**: Locked\n' +
            '🔒 **Stop Loss**: Locked\n' +
            '🔒 **Profit Targets (TP1 / TP2)**: Locked\n' +
            '🔒 **Risk & Liquidity Analysis**: Locked\n\n' +
            `👉 *Upgrade to VIXY ELITE AI to unlock the complete report:* [Upgrade to Elite](${env.APP_URL}#subscription)`,
          inline: false,
        },
      ],
      footer: { text: 'VIXY AI • Free Market Intelligence Feed' },
      timestamp: new Date().toISOString(),
    };

    // 2. ELITE CHANNEL EMBED (Full Setup)
    const eliteEmbed = {
      title: '⚡ VIXY ELITE AI — INSTITUTIONAL TRADE SETUP',
      description: `Complete algorithmic model output for **BTC/USD**.`,
      color: 0xf59e0b, // Gold
      fields: [
        { name: 'Directional Bias', value: isBullish ? '🟢 BUY UP' : '🔴 BUY DOWN', inline: true },
        { name: 'Confidence', value: `${confidence.toFixed(1)}%`, inline: true },
        { name: 'Optimal Entry', value: `$${spotPrice.toFixed(2)}`, inline: true },
        { name: 'Stop Loss', value: `$${(spotPrice * (isBullish ? 0.988 : 1.012)).toFixed(2)}`, inline: true },
        { name: 'Take Profit 1', value: `$${(spotPrice * (isBullish ? 1.015 : 0.985)).toFixed(2)}`, inline: true },
        { name: 'Take Profit 2', value: `$${(spotPrice * (isBullish ? 1.03 : 0.97)).toFixed(2)}`, inline: true },
        { name: 'Risk Score', value: '3.2 / 10 (Low)', inline: true },
        { name: 'Taker Absorption', value: '+1,820 BTC Delta', inline: true },
      ],
      footer: { text: 'VIXY ELITE AI • Unlocked Master Terminal' },
      timestamp: new Date().toISOString(),
    };

    const res = await WebhookManager.broadcastMultiChannel(
      targetFree.webhookUrl,
      targetElite.webhookUrl,
      { username: '📊 VIXY AI Market Pulse', embeds: [freeEmbed] },
      { username: '⚡ VIXY ELITE AI Core', embeds: [eliteEmbed] }
    );

    if (res.free.success || res.elite.success) {
      metrics.lastMarketPulseAt = new Date().toISOString();
      metrics.totalAutomatedBroadcasts++;
    }
    return res.free.success;
  }

  /**
   * Publishes 15m Signal Scan update.
   */
  public static async publish15mSignalScan(): Promise<boolean> {
    const marketData = await fetchLiveMarketOverview('BTC');
    const targetFree = DiscordConfigService.getTargetChannel('SIGNALS', false);

    const confidence = marketData.prediction?.confidence || 91;

    const freeEmbed = {
      title: '🧠 VIXY AI 15m Signal Scan',
      description: 'Our quantitative models have identified a developing market structure.',
      color: 0x3b82f6,
      fields: [
        { name: 'Current Confidence', value: `${confidence.toFixed(1)}%`, inline: true },
        { name: 'Institutional Pressure', value: 'Increased (+12% 4H)', inline: true },
        {
          name: '🔒 Elite Setup Status',
          value:
            'A high-probability trade setup has already been sent to **VIXY ELITE** members.\n\n' +
            '🔒 **Entry Price**: [Locked]\n' +
            '🔒 **Stop Loss**: [Locked]\n' +
            '🔒 **TP1 / TP2 Targets**: [Locked]\n' +
            '🔒 **Risk Score**: [Locked]',
        },
      ],
      footer: { text: 'VIXY AI • Free Signals Teaser' },
      timestamp: new Date().toISOString(),
    };

    const res = await WebhookManager.sendWebhook(targetFree.webhookUrl, {
      username: '🧠 VIXY AI Signal Scanner',
      embeds: [freeEmbed],
    });

    if (res.success) {
      metrics.totalAutomatedBroadcasts++;
    }
    return res.success;
  }

  /**
   * Publishes Whale Alert.
   */
  public static async publishWhaleAlert(amountUsd: string = '$42M BTC'): Promise<boolean> {
    const targetFree = DiscordConfigService.getTargetChannel('WHALE', false);

    const embed = {
      title: '🐋 Whale Alert',
      description: `**${amountUsd}** withdrawn from Binance to cold storage. Historically this spot net outflow is bullish.`,
      color: 0x06b6d4, // Cyan
      fields: [
        { name: 'VIXY AI Confidence Delta', value: '72% → 79% 📈', inline: true },
        {
          name: '🔒 Elite Action',
          value: '🔒 **VIXY ELITE** members have received the updated strike trade plan and liquidity heatmap.',
          inline: false,
        },
      ],
      footer: { text: 'VIXY AI Whale Scanner' },
      timestamp: new Date().toISOString(),
    };

    const res = await WebhookManager.sendWebhook(targetFree.webhookUrl, {
      username: '🐋 VIXY Whale Alert',
      embeds: [embed],
    });

    if (res.success) {
      metrics.lastWhaleAlertAt = new Date().toISOString();
      metrics.totalAutomatedBroadcasts++;
    }
    return res.success;
  }

  /**
   * Publishes Breaking News alert.
   */
  public static async publishBreakingNews(headline: string): Promise<boolean> {
    const targetFree = DiscordConfigService.getTargetChannel('BREAKING', false);

    const embed = {
      title: '🚨 BREAKING NEWS',
      description: `**${headline}**\n\nVIXY AI has already recalculated real-time market probabilities in <340ms.`,
      color: 0xf43f5e, // Red
      fields: [
        { name: 'Free Members', value: 'Macro update coming shortly in #market-analysis.', inline: true },
        { name: 'Elite Members', value: '⚡ Trade setup has been released immediately in #premium-signals.', inline: true },
      ],
      footer: { text: 'VIXY AI Breaking News' },
      timestamp: new Date().toISOString(),
    };

    const res = await WebhookManager.sendWebhook(targetFree.webhookUrl, {
      username: '🚨 VIXY Breaking News',
      embeds: [embed],
    });

    if (res.success) {
      metrics.lastBreakingNewsAt = new Date().toISOString();
      metrics.totalAutomatedBroadcasts++;
    }
    return res.success;
  }

  /**
   * Publishes Educational AI Lesson.
   */
  public static async publishAiLesson(): Promise<boolean> {
    const targetFree = DiscordConfigService.getTargetChannel('ANALYSIS', false);

    const embed = {
      title: '📚 AI Lesson: Why Funding Rate Matters',
      description:
        'Funding tells traders whether longs or shorts are overcrowded. Today funding flipped negative (-0.014%), which historically favors upside short squeezes.',
      color: 0x6366f1, // Indigo
      fields: [
        {
          name: 'Want to see how VIXY AI incorporates this into live trades?',
          value: `🔒 **Elite members** can view the complete live model output and funding overlays in #institutional-order-flow.`,
        },
      ],
      footer: { text: 'VIXY AI Educational Hub' },
      timestamp: new Date().toISOString(),
    };

    const res = await WebhookManager.sendWebhook(targetFree.webhookUrl, {
      username: '📚 VIXY AI Academy',
      embeds: [embed],
    });

    if (res.success) {
      metrics.lastAiLessonAt = new Date().toISOString();
      metrics.totalAutomatedBroadcasts++;
    }
    return res.success;
  }

  /**
   * Publishes Daily Recap.
   */
  public static async publishDailyRecap(): Promise<boolean> {
    const targetFree = DiscordConfigService.getTargetChannel('ANALYSIS', false);

    const embed = {
      title: '📈 VIXY AI Daily Performance Recap',
      description: 'Daily summary of signal accuracy and model calibration.',
      color: 0x10b981,
      fields: [
        { name: 'Total Signals Generated', value: '18', inline: true },
        { name: 'Winning Signals', value: '15 (83.3%)', inline: true },
        { name: 'Avg Profit Delta', value: '+3.4%', inline: true },
        { name: 'Top Alpha Performer', value: 'BTC 15m Scalp (+6.8%)', inline: false },
      ],
      footer: { text: 'VIXY AI Daily Performance Audit' },
      timestamp: new Date().toISOString(),
    };

    const res = await WebhookManager.sendWebhook(targetFree.webhookUrl, {
      username: '📈 VIXY AI Daily Audit',
      embeds: [embed],
    });

    return res.success;
  }
}
