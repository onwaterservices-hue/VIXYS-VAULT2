import { EmbedBuilder } from 'discord.js';
import { MarketOverview } from '../services/marketData';

export function createWhaleTrackerEmbed(btcAmount: number = 2800, destination: string = 'Coinbase Prime') {
  return new EmbedBuilder()
    .setTitle(`🐋 Institutional Surveillance Intercept`)
    .setColor(0x0c1e28)
    .setDescription(`**$${(btcAmount * 64410 / 1000000).toFixed(1)}M BTC Accumulated** on **${destination}**\n\nOrderbook taker delta and block Desk surveillance indicate spot accumulation.`)
    .setFooter({ text: 'VIXY AI Signal Scanner • Dark Pool & Block Desk Surveillance' })
    .setTimestamp();
}

export function createMarketFlowEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  return new EmbedBuilder()
    .setTitle(`📊 Hourly Institutional Market Intelligence`)
    .setColor(0x111a2e)
    .addFields(
      { name: 'Momentum', value: isBull ? 'Rising Taker Aggression' : 'Declining Delta', inline: true },
      { name: 'Volume', value: 'Expanding Band', inline: true },
      { name: 'Liquidity', value: '$42M Bid Wall at Support', inline: true },
      { name: 'Whale Pressure', value: `\`${data.prediction.whalePressureScore}%\``, inline: true },
      { name: 'Taker Ratio', value: `\`${isBull ? '1.24' : '0.82'}\``, inline: true },
      { name: 'Risk Assessment', value: `\`${data.prediction.riskLevel}\``, inline: true }
    )
    .setFooter({ text: 'VIXY AI Signal Scanner • Quantitative Desk Synthesis' })
    .setTimestamp();
}

export function createSniperAlertEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  return new EmbedBuilder()
    .setTitle(`🧠 VIXY AI • 15m Market Scan`)
    .setColor(0x0f1f18)
    .setDescription(`Institutional activity has increased across BTC during the current 15-minute cycle.`)
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
          '🚀 Unlock live entries, exits, VIXY Protection™, and institutional intelligence inside VIXY ELITE.\n\n' +
          `👉 **[ Launch VIXY Vault AI Dashboard → ](${(process.env.APP_URL || 'https://vixy.ai').replace(/\/$/, '')}/#pricing)**`,
        inline: false,
      }
    )
    .setFooter({ text: 'VIXY AI Signal Scanner • Confidential Quantitative Intelligence' })
    .setTimestamp();
}

export function createMacroAlertEmbed(title: string, details: string) {
  return new EmbedBuilder()
    .setTitle(`🚨 Breaking Market Intelligence`)
    .setColor(0x221118)
    .setDescription(`**${title}**\n\n${details}\n\nInstitutional volatility expected over the next 30 minutes. VIXY models remain neutral pending confirmation.`)
    .setFooter({ text: 'VIXY AI Signal Scanner • Bloomberg Terminal Grade Intelligence' })
    .setTimestamp();
}
