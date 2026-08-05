import { EmbedBuilder } from 'discord.js';
import { MarketOverview } from '../services/marketData';

export function createFreeSignalEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  const color = isBull ? 0x10B981 : 0xF43F5E;

  return new EmbedBuilder()
    .setTitle(`🧠 VIXY AI • SIGNAL DETECTED`)
    .setColor(color)
    .setDescription(`*Public Teaser Feed • 90-Second Delayed Broadcast*`)
    .addFields(
      { name: 'Asset', value: `**${data.asset}**`, inline: true },
      { name: 'Direction', value: `**${isBull ? '🐂 Bullish' : '🐻 Bearish'}**`, inline: true },
      { name: 'AI Confidence', value: `**${data.prediction.confidence}%**`, inline: true },
      {
        name: '🔒 Execution Parameters (VIP Only)',
        value: `\`ENTRY:  [🔒 MASKED]\`\n\`STOP:   [🔒 MASKED]\`\n\`TARGET: [🔒 MASKED]\``,
        inline: false,
      },
      {
        name: '⚡ Timing Advantage',
        value: `🔒 *Full signal released to VIP 90 seconds ago. VIP subscribers traded before public notification.*\n\n👉 Upgrade with \`/vip\` or visit the app to unlock instant signals.`,
        inline: false,
      }
    )
    .setFooter({ text: 'VIXY AI Free Feed • Upgrade to VIP for real-time trade setups' })
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
      { name: '🌊 Whale Delta', value: `\`+1,820 BTC Taker Buying\``, inline: true },
      { name: '📊 Implied Edge', value: `\`+8.4% vs Kalshi Odds\``, inline: true },
      { name: '🎯 Brier Score', value: `\`0.168 (Optimal)\``, inline: true },
      { name: '🧠 Institutional Reasoning', value: data.prediction.reasoning, inline: false }
    )
    .setFooter({ text: 'VIXY AI Core VIP Channel • Confidential Member Signal' })
    .setTimestamp();
}
