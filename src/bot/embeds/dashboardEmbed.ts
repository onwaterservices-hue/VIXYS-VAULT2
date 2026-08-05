import { EmbedBuilder } from 'discord.js';
import { MarketOverview } from '../services/marketData';

export function createDashboardEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  const color = isBull ? 0x10B981 : 0xF43F5E; // Emerald / Rose Cyberpunk Accent

  return new EmbedBuilder()
    .setTitle(`🟢 VIXY AI Terminal • ${data.asset} Live Dashboard`)
    .setColor(color)
    .setDescription(
      `⚡ **STATUS: ONLINE** • *Continuous 15-Minute Prediction Contract Engine*\n` +
      `*Real-time Orderbook Taker Delta & Kalshi / Polymarket Odds Tracker*`
    )
    .addFields(
      {
        name: '₿ Live BTC Price',
        value: `**$${data.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}**`,
        inline: true,
      },
      {
        name: '📈 24h Change',
        value: `**${data.change24h >= 0 ? '+' : ''}${data.change24h}%**`,
        inline: true,
      },
      {
        name: '🧠 AI Prediction',
        value: `**${isBull ? '🐂 BULLISH (YES)' : '🐻 BEARISH (NO)'}**`,
        inline: true,
      },
      {
        name: '🎯 Confidence Score',
        value: `\`${data.prediction.confidence}%\``,
        inline: true,
      },
      {
        name: '📊 Lifetime Win Rate',
        value: `\`${data.prediction.accuracy}%\` (${data.prediction.totalSettled.toLocaleString()} cycles)`,
        inline: true,
      },
      {
        name: '📉 Brier Calibration',
        value: `\`${data.prediction.brierScore.toFixed(3)}\` (Optimal)`,
        inline: true,
      },
      {
        name: '📊 24h High / Low',
        value: `$${data.high24h.toLocaleString()} / $${data.low24h.toLocaleString()}`,
        inline: true,
      },
      {
        name: '🌊 24h Volume',
        value: `${Math.round(data.volume24h).toLocaleString()} BTC`,
        inline: true,
      },
      {
        name: '🎯 Target Price',
        value: `**$${data.prediction.targetPrice.toLocaleString()}**`,
        inline: true,
      }
    )
    .setFooter({
      text: `VIXY AI Engine v4.3 • Auto-updates every 30s • Refreshed at`,
    })
    .setTimestamp();
}
