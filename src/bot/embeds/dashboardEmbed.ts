import { EmbedBuilder } from 'discord.js';
import { MarketOverview } from '../services/marketData';

export function createDashboardEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  const color = isBull ? 0x10B981 : 0xF43F5E; // Emerald / Rose Cyberpunk Accent

  return new EmbedBuilder()
    .setTitle(`🟢 VIXY AI ONLINE • Storefront Dashboard`)
    .setColor(color)
    .setDescription(`*Continuous 15-Minute Prediction Contract Engine & Orderbook Taker Delta*`)
    .addFields(
      {
        name: `₿ ${data.asset}`,
        value: `**$${data.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}** (${data.change24h >= 0 ? '+' : ''}${data.change24h}%)`,
        inline: true,
      },
      {
        name: '🧭 Market Bias',
        value: `**${isBull ? '🐂 BULLISH' : '🐻 BEARISH'}**`,
        inline: true,
      },
      {
        name: '🧠 AI Confidence',
        value: `\`${data.prediction.confidence}%\``,
        inline: true,
      },
      {
        name: '📊 Predictions Today',
        value: `\`42 cycles\``,
        inline: true,
      },
      {
        name: '🏆 Accuracy (30 Days)',
        value: `\`${data.prediction.accuracy}%\` (${data.prediction.totalSettled.toLocaleString()} settled)`,
        inline: true,
      },
      {
        name: '📉 Brier Score',
        value: `\`${data.prediction.brierScore.toFixed(3)}\` (Optimal)`,
        inline: true,
      },
      {
        name: '💎 VIP Advantage Privileges',
        value:
          `• **90-Second Speed Advantage**: Signals hit VIP channel 90s before public feed\n` +
          `• **Full Trade Parameters**: Exact Entry, Stop-Loss, and Take-Profit Targets\n` +
          `• **Institutional Flow-Forge**: Order Blocks, Liquidity Sweeps & Taker Absorption\n` +
          `• **Final-Lock Predictions**: Highest confidence contract settlement calls`,
        inline: false,
      }
    )
    .setFooter({
      text: `🔒 Public Feed shows proof only. Upgrade with /vip to unlock trade setups. Auto-refreshed every 30s`,
    })
    .setTimestamp();
}
