import { EmbedBuilder } from 'discord.js';
import { MarketOverview } from '../services/marketData';

export function createMarketAnalysisEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  const color = isBull ? 0x10B981 : 0xF43F5E;

  return new EmbedBuilder()
    .setTitle(`📊 VIXY AI • Hourly Market Analysis Summary`)
    .setColor(color)
    .setDescription(`*Institutional Orderbook Taker Dynamics & Macro Liquidity Pulse*`)
    .addFields(
      {
        name: '🌐 Market Summary',
        value: isBull
          ? `• **Buyers Strengthening**: Taker buy pressure aggressive above key spot levels\n` +
            `• **Whale Inflows Increasing**: Exchange net outflows indicate accumulation\n` +
            `• **Liquidity Building**: Sell-side liquidity thin above current range high`
          : `• **Buyers Weakening**: Taker sell absorption identified at structural resistance\n` +
            `• **Whale Inflows Increasing**: Exchange deposit sweeps detected on Binance/Coinbase\n` +
            `• **Liquidity Building**: Buy-side liquidity stacked below immediate support`,
        inline: false,
      },
      { name: '🧭 Overall Bias', value: `**${isBull ? '🐂 BULLISH' : '🐻 BEARISH'}**`, inline: true },
      { name: '📊 Spot Price', value: `$${data.price.toLocaleString()}`, inline: true },
      { name: '⚡ Volatility Regime', value: `\`${data.prediction.volatility}\``, inline: true },
      {
        name: '💡 Notice',
        value: `*This hourly summary provides macro context only with no trade setups. For trade setups, see VIP channels.*`,
        inline: false,
      }
    )
    .setFooter({ text: 'VIXY AI • Hourly Market Pulse • /vip for trade signals' })
    .setTimestamp();
}
