import { EmbedBuilder } from 'discord.js';

export function createDashboardEmbed(stats: {
  btcPrice: number;
  direction: string;
  confidence: number;
  winRate: number;
  modelVersion: string;
  brierScore: number;
}) {
  return new EmbedBuilder()
    .setTitle('📊 VIXY AI Live Prediction Terminal & Market Dashboard')
    .setColor(0x8B5CF6)
    .addFields(
      { name: 'BTC/USDT Spot', value: `$${stats.btcPrice.toLocaleString()}`, inline: true },
      { name: 'Active Direction', value: `**${stats.direction}**`, inline: true },
      { name: 'Signal Confidence', value: `${stats.confidence}%`, inline: true },
      { name: 'Historical Win Rate', value: `${stats.winRate}%`, inline: true },
      { name: 'Model Version', value: stats.modelVersion, inline: true },
      { name: 'Brier Calibration', value: `${stats.brierScore.toFixed(3)}`, inline: true }
    )
    .setDescription('⚡ *Continuous 15-Minute Prediction Contract Engine • Live Exchange Orderbook Delta*')
    .setFooter({ text: 'VIXY AI Engine • Auto-Updating Dashboard' })
    .setTimestamp();
}
