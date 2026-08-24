import { EmbedBuilder } from 'discord.js';
import { MarketOverview } from '../services/marketData';

export function createStructuredPredictionEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  const color = isBull ? 0x10B981 : 0xF43F5E;

  const directionSymbol = isBull ? '🐂 BULLISH' : '🐻 BEARISH';

  return new EmbedBuilder()
    .setTitle(`🧠 VIXY AI • ${data.asset} Structured Prediction`)
    .setColor(color)
    .setDescription(`*Orderbook Taker Flow, Volatility Surface & Institutional Liquidity Breakdown*`)
    .addFields(
      { name: 'Direction', value: `**${directionSymbol}**`, inline: true },
      { name: 'AI Confidence', value: `**${data.prediction.confidence}%**`, inline: true },
      { name: 'Spot Price', value: `$${data.price.toLocaleString()}`, inline: true },
      { name: 'Momentum', value: `\`${data.prediction.momentumScore}%\``, inline: true },
      { name: 'Whale Pressure', value: `\`${data.prediction.whalePressureScore}%\``, inline: true },
      { name: 'Liquidity Depth', value: `\`${data.prediction.liquidityScore}%\``, inline: true },
      { name: 'Volatility Surface', value: `\`${data.prediction.volatility}\``, inline: true },
      { name: 'Risk Assessment', value: `\`${data.prediction.riskLevel}\``, inline: true },
      { name: 'Target Settlement', value: `**$${data.prediction.targetPrice.toLocaleString()}**`, inline: true },
      { name: 'AI Reasoning', value: data.prediction.reasoning, inline: false }
    )
    .setFooter({ text: 'VIXY AI • 15m Settlement Contract • Brier Score: 0.168' })
    .setTimestamp();
}
