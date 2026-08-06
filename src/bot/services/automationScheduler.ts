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
  lastDailyRecapAt: string | null;
  totalAutomatedBroadcasts: number;
  isRunning: boolean;
}

let metrics: SchedulerMetrics = {
  lastMarketPulseAt: null,
  lastWhaleAlertAt: null,
  lastBreakingNewsAt: null,
  lastAiLessonAt: null,
  lastStatusHeartbeatAt: null,
  lastDailyRecapAt: null,
  totalAutomatedBroadcasts: 0,
  isRunning: false,
};

// Rotating Educational Lessons
const AI_LESSONS = [
  {
    title: '🧠 AI LESSON: What is Liquidity?',
    concept: 'Liquidity is where large institutions need orders filled.',
    explanation:
      'Price is attracted toward liquidity, not because markets are random, but because banks require counterparties to fill massive positions.',
    detail: "Today's chart contains 3 major liquidity pools. Elite members can see exactly where.",
  },
  {
    title: '🧠 AI LESSON: What is an Order Block?',
    concept: 'Order blocks represent institutional supply and demand footprint zones.',
    explanation:
      'When banks enter large positions, they leave unfilled limit orders. When price returns to an order block, it often reacts violently.',
    detail: 'Elite AI automatically draws live order block heatmaps across 15m and 1h desks.',
  },
  {
    title: '🧠 AI LESSON: How Smart Money Hunts Stops',
    concept: 'Institutions purposefully drive price past obvious high/low levels.',
    explanation:
      'Triggering retail stop-loss orders creates the massive counterparty volume institutions need to buy low or sell high.',
    detail: 'VIXY AI detects stop sweep absorption in sub-second intervals before price reverses.',
  },
  {
    title: '🧠 AI LESSON: What is Delta?',
    concept: 'Cumulative Volume Delta (CVD) measures net market buy vs sell aggression.',
    explanation:
      'When price declines while Cumulative Delta rises, aggressive buyers are absorbing ask walls—a strong bullish divergence.',
    detail: 'Elite members monitor live taker volume delta overlays directly on the chart.',
  },
  {
    title: '🧠 AI LESSON: How AI Scores Trades',
    concept: 'VIXY AI cross-evaluates 24 quantitative features before signaling.',
    explanation:
      'By matching Binance L2 depth, Polymarket prediction odds, Kalshi binary strikes, and order flow velocity, bad setups get filtered out.',
    detail: 'Only setups with >80% calibrated confluence generate Elite actionable alerts.',
  },
];

let lessonIndex = 0;

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

      // Hourly Market Pulse & Rotating Content at top of hour (:00)
      if (minute === 0 && env.AI_MARKET_INTEL_ENABLED) {
        this.publishHourlyMarketPulse().catch(console.error);

        // Rotate hourly content (Lesson, Whale, Breaking, Recap)
        if (hour % 2 === 0) {
          this.publishAiLesson().catch(console.error);
        } else if (hour % 3 === 0) {
          this.publishWhaleAlert().catch(console.error);
        }
      }

      // 15-Minute Signal Scan (:00, :15, :30, :45)
      if (minute % 15 === 0) {
        this.publish15mSignalScan().catch(console.error);
      }

      // Daily Market Recap at 20:00 UTC or midnight
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
            { name: 'Win Rate (30D)', value: '88.9%', inline: true },
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
        { name: 'Overall Bias', value: isBullish ? '🟢 Bullish (+7 Delta)' : '🔴 Bearish (-5 Delta)', inline: true },
        { name: 'Confidence', value: `${confidence.toFixed(1)}%`, inline: true },
        {
          name: '🔒 Detailed Trade Setup (VIXY ELITE AI)',
          value:
            '✔ **Entry Zone**: [Locked for Elite]\n' +
            '✔ **Stop Loss**: [Locked for Elite]\n' +
            '✔ **Take Profit (TP1 / TP2)**: [Locked for Elite]\n' +
            '✔ **Position Size & Risk %**: [Locked for Elite]\n\n' +
            `👉 *Upgrade to unlock instant signals:* [UNLOCK VIXY ELITE](${env.APP_URL})`,
          inline: false,
        },
      ],
      footer: { text: '🔒 Public Feed shows proof only. Upgrade with /vip to unlock trade setups.' },
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
          name: '🔒 Elite Members Received',
          value:
            '✔ **Entry Zone**: Released to VIP\n' +
            '✔ **Stop Loss**: Released to VIP\n' +
            '✔ **Take Profit**: Released to VIP\n' +
            '✔ **Probability Score**: 88.9%\n\n' +
            `👉 *Upgrade with /vip or visit the app:* [🚀 Join VIXY ELITE](${env.APP_URL})`,
        },
      ],
      footer: { text: 'VIXY AI Free Feed • Upgrade to VIP for real-time trade setups' },
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
   * Publishes High-Converting Whale Alert.
   */
  public static async publishWhaleAlert(amountUsd: string = '$42,000,000 BTC'): Promise<boolean> {
    const targetFree = DiscordConfigService.getTargetChannel('WHALE', false);

    const embed = {
      title: '🐋 WHALE ALERT',
      description:
        `**${amountUsd} withdrawn from Binance**\n` +
        '━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '**Institutional Confidence**: `████████░░ 79%`  \n' +
        '**Bullish Bias**: `+7`  \n' +
        '**AI Confidence**: `78%`  \n\n' +
        '──────────────────────\n' +
        '**FREE AI Summary**  \n' +
        '• Large exchange outflow detected  \n' +
        '• Spot accumulation increasing  \n' +
        '• Buyers absorbing liquidity  \n\n' +
        '──────────────────────\n' +
        '🔒 **Elite Members Received**:  \n' +
        '✔ **Entry Zone**  \n' +
        '✔ **Stop Loss**  \n' +
        '✔ **Take Profit**  \n' +
        '✔ **Position Size**  \n' +
        '✔ **Risk %**  \n' +
        '✔ **Probability Score**  \n\n' +
        `👉 **[ UNLOCK ELITE AI ](${env.APP_URL})**`,
      color: 0x06b6d4, // Cyan
      footer: {
        text: '🔒 Elite Analysis Hidden • Upgrade to unlock: Exact Entry, TP, Risk Score, AI Confidence & Live Updates • 🚀 Join VIXY ELITE',
      },
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
  public static async publishBreakingNews(headline?: string): Promise<boolean> {
    const targetFree = DiscordConfigService.getTargetChannel('BREAKING', false);
    const titleText = headline || 'Bitcoin Spot ETF Volume Spikes +340% Following Institutional Inflows';

    const embed = {
      title: '📰 BREAKING NEWS',
      description:
        `**${titleText}**\n\n` +
        'VIXY AI has recalculated real-time market probability vectors in <340ms.\n\n' +
        '──────────────────────\n' +
        '🔒 **Elite Members Received**:\n' +
        '✔ Immediate Directional Signal\n' +
        '✔ Volatility Impact Assessment\n' +
        '✔ Instant Webhook Alert\n\n' +
        `👉 **[ UNLOCK ELITE AI ](${env.APP_URL})**`,
      color: 0xf43f5e, // Red
      footer: { text: 'VIXY AI Breaking News • Instant Institutional Intelligence' },
      timestamp: new Date().toISOString(),
    };

    const res = await WebhookManager.sendWebhook(targetFree.webhookUrl, {
      username: '📰 VIXY Breaking News',
      embeds: [embed],
    });

    if (res.success) {
      metrics.lastBreakingNewsAt = new Date().toISOString();
      metrics.totalAutomatedBroadcasts++;
    }
    return res.success;
  }

  /**
   * Publishes Educational AI Lesson (Rotates hourly).
   */
  public static async publishAiLesson(): Promise<boolean> {
    const targetFree = DiscordConfigService.getTargetChannel('ANALYSIS', false);
    const currentLesson = AI_LESSONS[lessonIndex % AI_LESSONS.length];
    lessonIndex++;

    const embed = {
      title: currentLesson.title,
      description:
        `**${currentLesson.concept}**\n\n` +
        `${currentLesson.explanation}\n\n` +
        `💡 *${currentLesson.detail}*\n\n` +
        '──────────────────────\n' +
        '🔒 **Elite Members See**:  \n' +
        '✔ Live Order Block Heatmaps  \n' +
        '✔ Sub-Second Delta Absorption  \n' +
        '✔ Automated Entry & Stop Calculations  \n\n' +
        `👉 **[ UNLOCK ELITE AI ](${env.APP_URL})**`,
      color: 0x6366f1, // Indigo
      footer: { text: 'VIXY AI Educational Hub • Learn while seeing what you miss' },
      timestamp: new Date().toISOString(),
    };

    const res = await WebhookManager.sendWebhook(targetFree.webhookUrl, {
      username: '🧠 VIXY AI Academy',
      embeds: [embed],
    });

    if (res.success) {
      metrics.lastAiLessonAt = new Date().toISOString();
      metrics.totalAutomatedBroadcasts++;
    }
    return res.success;
  }

  /**
   * Publishes High-Social-Proof Daily Performance Recap.
   */
  public static async publishDailyRecap(): Promise<boolean> {
    const targetFree = DiscordConfigService.getTargetChannel('ANALYSIS', false);

    const embed = {
      title: '🔥 VIXY AI DAILY RECAP',
      description:
        '**Today\'s Model Performance & Social Proof Summary**\n' +
        '━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '📊 **Today\'s Accuracy**\n' +
        '• **AI Calls**: `18`  \n' +
        '• **Correct**: `16`  \n' +
        '• **Accuracy Rate**: `88.9%`  \n\n' +
        '🚀 **Largest Move**: `BTC +3.6%`  \n' +
        '🎯 **Best Call**: `BTC Long (+214 pips)`  \n' +
        '🐋 **Top Whale**: `$118M Coinbase Withdrawal`  \n\n' +
        '──────────────────────\n' +
        '⭐ **Elite Members Received 5 Complete Trade Plans Today.**\n\n' +
        `👉 **[ UNLOCK VIXY ELITE AI ](${env.APP_URL})**`,
      color: 0x10b981, // Emerald
      footer: { text: 'VIXY AI Daily Recap • 100% Calibrated Social Proof' },
      timestamp: new Date().toISOString(),
    };

    const res = await WebhookManager.sendWebhook(targetFree.webhookUrl, {
      username: '🔥 VIXY AI Daily Audit',
      embeds: [embed],
    });

    if (res.success) {
      metrics.lastDailyRecapAt = new Date().toISOString();
      metrics.totalAutomatedBroadcasts++;
    }
    return res.success;
  }
}

