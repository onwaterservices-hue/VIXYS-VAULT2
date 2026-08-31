import { EmbedBuilder } from 'discord.js';
import { MarketOverview } from '../services/marketData';

export function createFreeSignalEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  const color = 0x0f1f18; // Dark charcoal green

  const baseUrl = (process.env.APP_URL || 'https://vixy.ai').replace(/\/$/, '');

  return new EmbedBuilder()
    .setTitle(`🧠 VIXY AI • 15m Market Scan`)
    .setColor(color)
    .setDescription(`Institutional activity has increased across ${data.asset} during the current 15-minute cycle.`)
    .addFields(
      { name: 'Current AI Confidence', value: `\`${data.prediction.confidence}%\``, inline: true },
      { name: 'Market Bias', value: `\`${isBull ? 'Bullish' : 'Bearish'}\``, inline: true },
      { name: 'Probability Score', value: `\`${(data.prediction.confidence * 0.96).toFixed(1)}%\``, inline: true },
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
          `👉 **[ Launch VIXY Vault AI Dashboard → ](${baseUrl}/#pricing)**`,
        inline: false,
      }
    )
    .setFooter({ text: 'VIXY AI Signal Scanner • Confidential Quantitative Intelligence' })
    .setTimestamp();
}

export function createVipSignalEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  const color = 0x8B5CF6; // Royal VIP Purple

  const spot = data.price;
  const entry = Math.round(spot * (isBull ? 0.9995 : 1.0005) * 100) / 100;
  const stop = Math.round(spot * (isBull ? 0.9965 : 1.0035) * 100) / 100;
  const target = Math.round(spot * (isBull ? 1.0065 : 0.9935) * 100) / 100;

  return new EmbedBuilder()
    .setTitle(`💎 VIXY AI CORE • INSTANT PREMIUM SIGNAL`)
    .setColor(color)
    .setDescription(`⚡ **INSTANT VIP BROADCAST** • *Sub-Second Orderbook Execution Signal*`)
    .addFields(
      { name: 'Asset', value: `**${data.asset}**`, inline: true },
      { name: 'Direction', value: `**${isBull ? '🐂 BULLISH (YES)' : '🐻 BEARISH (NO)'}**`, inline: true },
      { name: 'AI Confidence', value: `\`${data.prediction.confidence}%\``, inline: true },
      { name: '🎯 ENTRY', value: `\`$${entry.toLocaleString()}\``, inline: true },
      { name: '🛑 STOP LOSS', value: `\`$${stop.toLocaleString()}\``, inline: true },
      { name: '🏁 TARGET PROFIT', value: `\`$${target.toLocaleString()}\``, inline: true },
      // These three fields were previously hardcoded string literals
      // ("+1,820 BTC Taker Buying", "+8.4% vs Kalshi Odds", "0.168 (Optimal)")
      // and were therefore identical on every signal regardless of market
      // conditions. They are now rendered ONLY when the caller supplies a real,
      // non-zero engine value; when the underlying metric is unavailable the
      // field is omitted entirely rather than showing a fabricated number.
      ...(data.prediction.whalePressureScore
        ? [{ name: '🌊 Whale Pressure', value: `\`${data.prediction.whalePressureScore}\``, inline: true }]
        : []),
      ...(data.prediction.brierScore
        ? [{ name: '🎯 Brier Score', value: `\`${data.prediction.brierScore.toFixed(3)}\``, inline: true }]
        : []),
      { name: '🧠 Institutional Reasoning', value: data.prediction.reasoning, inline: false }
    )
    .setFooter({ text: 'VIXY AI Core VIP Channel • Confidential Member Signal' })
    .setTimestamp();
}
