import { EmbedBuilder } from 'discord.js';
import { MarketOverview } from '../services/marketData';

export function createFreeSignalEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  const color = 0x0f1f18; // Dark charcoal green

  const baseUrl = (process.env.APP_URL || 'https://www.vixxyvault.com').replace(/\/$/, '');
  const lock = describeLock(data);

  return new EmbedBuilder()
    .setTitle(`🧠 VIXY AI • 15m Market Scan`)
    .setColor(color)
    // Derived from the lock itself. The previous sentence ("Institutional
    // activity has increased ...") was a constant printed on every cycle
    // regardless of what the engine measured.
    .setDescription(lock.description)
    .addFields(
      // Was "Current AI Confidence" with a % sign: it is the engine's score, not a
      // probability, and scores of 80-90 have won 53-62% of settled locks.
      { name: 'Engine score', value: `\`${data.prediction.confidence} / 100\``, inline: true },
      scoreWinRateField(data),
      { name: 'Market Bias', value: `\`${isBull ? 'Bullish' : 'Bearish'}\``, inline: true },
      // The engine's locked probability for the chosen side. Previously this
      // slot printed confidence * 0.96 under the name "Probability Score", a
      // number no model produced. When no locked probability exists the field
      // is omitted rather than filled with a derived stand-in.
      ...(lock.probabilityPct !== null
        ? [{ name: 'Model P(win), uncalibrated', value: `\`${lock.probabilityPct}%\``, inline: true }]
        : []),
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
          `👉 **[ Launch VIXY Vault AI Dashboard → ](${baseUrl}/vixy-live)**`,
        inline: false,
      }
    )
    .setFooter({ text: 'VIXY AI Signal Scanner • Confidential Quantitative Intelligence' })
    .setTimestamp();
}

// The engine score is not a probability of being right. When enough settled
// locks share its bucket, show what that bucket actually won; otherwise say so.
function scoreWinRateField(data: MarketOverview) {
  const p = data.prediction;
  const n = typeof p.scoreWinRateSampleSize === 'number' ? p.scoreWinRateSampleSize : null;
  const value =
    typeof p.scoreWinRatePct === 'number'
      ? `\`${p.scoreWinRatePct}%\` of ${n} settled locks${p.scoreBucket ? ` (score ${p.scoreBucket})` : ''}`
      : n !== null
        ? `Not enough settled locks at this score yet (${n})`
        : 'Not measured';
  return { name: 'Win rate at this score', value, inline: true };
}

// Facts about the lock that both embeds print. Everything here is read from
// the MarketOverview the caller built from the authoritative lock; nothing is
// estimated in this file.
function describeLock(data: MarketOverview) {
  const p = data.prediction;
  const side = p.direction === 'BULLISH' ? 'UP' : p.direction === 'BEARISH' ? 'DOWN' : 'NEUTRAL';
  const probabilityPct =
    typeof p.lockedProbability === 'number' && p.lockedProbability > 0 && p.lockedProbability <= 1
      ? Math.round(p.lockedProbability * 1000) / 10
      : null;
  const lockedAtUtc = p.lockedAt ? new Date(p.lockedAt) : null;
  const lockedAtLabel =
    lockedAtUtc && !Number.isNaN(lockedAtUtc.getTime())
      ? `${lockedAtUtc.toISOString().slice(11, 19)} UTC`
      : null;
  const spot = Number.isFinite(data.price) && data.price > 0 ? `$${data.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : null;
  const strike = typeof p.strike === 'number' && p.strike > 0 ? `$${p.strike.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : null;
  const parts = [`VIXY locked **${side}** on ${data.asset}`];
  if (lockedAtLabel) parts.push(`at ${lockedAtLabel}`);
  let description = parts.join(' ') + '.';
  if (spot && strike) description += ` Spot at lock ${spot} vs strike ${strike}.`;
  else if (spot) description += ` Spot at lock ${spot}.`;
  return { side, probabilityPct, lockedAtLabel, spot, strike, description };
}

export function createVipSignalEmbed(data: MarketOverview) {
  const isBull = data.prediction.direction === 'BULLISH';
  const color = 0x8B5CF6; // Royal VIP Purple
  const lock = describeLock(data);

  const spot = data.price;
  const entry = Math.round(spot * (isBull ? 0.9995 : 1.0005) * 100) / 100;
  const stop = Math.round(spot * (isBull ? 0.9965 : 1.0035) * 100) / 100;
  const target = Math.round(spot * (isBull ? 1.0065 : 0.9935) * 100) / 100;

  return new EmbedBuilder()
    .setTitle(`💎 VIXY AI CORE • INSTANT PREMIUM SIGNAL`)
    .setColor(color)
    .setDescription(`⚡ **INSTANT VIP BROADCAST** • ${lock.description}`)
    .addFields(
      { name: 'Asset', value: `**${data.asset}**`, inline: true },
      { name: 'Direction', value: `**${isBull ? '🐂 BULLISH (YES)' : '🐻 BEARISH (NO)'}**`, inline: true },
      { name: 'Engine score', value: `\`${data.prediction.confidence} / 100\``, inline: true },
      scoreWinRateField(data),
      ...(lock.probabilityPct !== null
        ? [{ name: 'Model P(win), uncalibrated', value: `\`${lock.probabilityPct}%\``, inline: true }]
        : []),
      // Entry / stop / target are fixed offsets from the spot at lock
      // (-0.05% / -0.35% / +0.65% for a bullish call, mirrored for bearish).
      // They are a house rule, not a model output, and are labelled as such so
      // a subscriber cannot read them as an independent engine opinion.
      { name: `🎯 ENTRY (spot ${isBull ? '−' : '+'}0.05%)`, value: `\`$${entry.toLocaleString()}\``, inline: true },
      { name: `🛑 STOP LOSS (house rule ${isBull ? '−' : '+'}0.35%)`, value: `\`$${stop.toLocaleString()}\``, inline: true },
      { name: `🏁 TARGET (house rule ${isBull ? '+' : '−'}0.65%)`, value: `\`$${target.toLocaleString()}\``, inline: true },
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
      // The value here is the engine's deterministic lock-rule code (for
      // example QUALIFIED_AUTHORITATIVE_ENTRY), not a written rationale, so it
      // is labelled as the rule that fired rather than as "reasoning".
      { name: '🔐 Lock rule', value: `\`${data.prediction.lockRule || data.prediction.reasoning}\``, inline: false }
    )
    .setFooter({ text: 'VIXY AI Core VIP Channel • Confidential Member Signal' })
    .setTimestamp();
}


// Bot Hub delivery test. Carries no engine score, probability, entry, stop or
// target, so it cannot be read as a lock in a subscriber channel.
export function createTestSignalEmbed(data: MarketOverview, tier: 'FREE' | 'ELITE') {
  const spot =
    Number.isFinite(data.price) && data.price > 0
      ? `$${data.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
      : null;
  return new EmbedBuilder()
    .setTitle('🧪 TEST BROADCAST • NOT A SIGNAL')
    .setColor(0x64748b)
    .setDescription(
      `Bot Hub delivery test for the ${tier} channel. No lock was made and nothing in this message is a trade.` +
        (spot ? ` Live spot when sent: ${spot}.` : ''),
    )
    .setFooter({ text: 'VIXY AI • Delivery test' })
    .setTimestamp();
}
