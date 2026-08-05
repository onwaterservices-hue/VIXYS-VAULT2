import { EmbedBuilder } from 'discord.js';

export function createSignalEmbed(data: {
  symbol: string;
  direction: 'YES' | 'NO';
  confidence: number;
  edgePct: number;
  currentPrice: number;
  targetPrice: number;
  reasoning: string;
}) {
  const isBullish = data.direction === 'YES';
  return new EmbedBuilder()
    .setTitle(`⚡ VIXY Signal Alert: ${data.symbol} → ${isBullish ? 'BUY UP (YES)' : 'BUY DOWN (NO)'}`)
    .setColor(isBullish ? 0x10B981 : 0xF43F5E)
    .addFields(
      { name: 'Spot Price', value: `$${data.currentPrice.toLocaleString()}`, inline: true },
      { name: 'Target Price', value: `$${data.targetPrice.toLocaleString()}`, inline: true },
      { name: 'Value Edge vs Odds', value: `+${data.edgePct}%`, inline: true },
      { name: 'Model Confidence', value: `${data.confidence}%`, inline: true },
      { name: 'Kalshi Implied Odds', value: `${isBullish ? 54 : 46}% YES`, inline: true },
      { name: 'AI Reasoning', value: data.reasoning, inline: false }
    )
    .setFooter({ text: 'VIXY AI Terminal • Brier Score: 0.168 • Decision Intelligence' })
    .setTimestamp();
}
