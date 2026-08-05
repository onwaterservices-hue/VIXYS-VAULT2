import { EmbedBuilder } from 'discord.js';
import { MarketOverview } from '../services/marketData';

export function createWhaleTrackerEmbed(btcAmount: number = 2800, destination: string = 'Coinbase') {
  return new EmbedBuilder()
    .setTitle(`🔥 VIXY AI • WHALE TRACKER`)
    .setColor(0xF59E0B) // Amber
    .setDescription(`🐋 **${btcAmount.toLocaleString()} BTC** transferred to **${destination}**\n\nPossible selling pressure detected.`)
    .setFooter({ text: 'VIXY AI Intelligence • On-Chain Tracker' })
    .setTimestamp();
}

export function createMarketFlowEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  return new EmbedBuilder()
    .setTitle(`📊 VIXY AI • Market Flow Metrics`)
    .setColor(isBull ? 0x10B981 : 0xF43F5E)
    .addFields(
      { name: 'Momentum', value: isBull ? '⬆ **Rising**' : '⬇ **Falling**', inline: true },
      { name: 'Volume', value: '⬆ **Rising**', inline: true },
      { name: 'Liquidity', value: '⚖️ **Neutral / Balanced**', inline: true },
      { name: 'Whale Pressure', value: `\`${data.prediction.whalePressureScore}%\``, inline: true },
      { name: 'Taker Ratio', value: `\`${isBull ? '1.24' : '0.82'}\``, inline: true },
      { name: 'Risk Assessment', value: `\`${data.prediction.riskLevel}\``, inline: true }
    )
    .setFooter({ text: 'VIXY AI • Market Flow Dynamics' })
    .setTimestamp();
}

export function createSniperAlertEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  return new EmbedBuilder()
    .setTitle(`🎯 VIXY AI • HIGH CONFIDENCE SNIPER SETUP`)
    .setColor(0x8B5CF6)
    .setDescription(
      `🔥 **High Confidence Setup Detected** (${data.prediction.confidence}% Confidence)\n\n` +
      `⚡ *VIP received the full alert 90 seconds ago. Public release begins now.*`
    )
    .addFields(
      { name: 'Asset', value: `**${data.asset}**`, inline: true },
      { name: 'Direction', value: `**${isBull ? '🐂 Bullish (YES)' : '🐻 Bearish (NO)'}**`, inline: true },
      { name: 'Model Confidence', value: `\`${data.prediction.confidence}%\``, inline: true },
      {
        name: '🔒 Unlock Exact Entry & Exit Targets',
        value: `VIP received exact Entry, Stop-Loss, and Take-Profit 90s ago.\nType \`/vip\` to upgrade!`,
        inline: false,
      }
    )
    .setFooter({ text: 'VIXY AI Sniper Alert • 90s Delay Notice' })
    .setTimestamp();
}

export function createMacroAlertEmbed(title: string, details: string) {
  return new EmbedBuilder()
    .setTitle(`🚨 VIXY AI ALERT • ${title}`)
    .setColor(0xEF4444)
    .setDescription(details)
    .setFooter({ text: 'VIXY AI Macro & Liquidation Tracker' })
    .setTimestamp();
}
