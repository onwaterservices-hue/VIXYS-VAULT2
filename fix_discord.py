import sys

with open("src/bot/discordBotService.ts", "r") as f:
    content = f.read()

target = """  // Try Webhook first if provided or active
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embedPayload),
      });

      if (res.ok) {
        botState.lastBroadcastAt = new Date().toISOString();
        botState.totalAlertsDispatched += 1;
        return { success: true, method: 'WEBHOOK', message: 'Signal successfully posted to Discord Webhook!' };
      }
    } catch (err) {
      console.warn('[DiscordBot] Webhook dispatch failed, falling back:', err);
    }
  }

  // Fallback to active bot client if logged in
  if (discordClient && discordClient.isReady()) {
    try {
      botState.lastBroadcastAt = new Date().toISOString();
      botState.totalAlertsDispatched += 1;
      return { success: true, method: 'DISCORD_BOT', message: 'Signal dispatched to Discord channels via VIXY AI Bot!' };
    } catch (err) {
      console.error('[DiscordBot] Client broadcast error:', err);
    }
  }

  return {
    success: false,
    method: 'NONE',
    message: 'No active Discord Bot Token or Webhook URL configured.',
  };"""

replacement = """  // Try Webhook first if provided or active
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embedPayload),
      });

      if (res.ok) {
        botState.lastBroadcastAt = new Date().toISOString();
        botState.totalAlertsDispatched += 1;
        return { success: true, method: 'WEBHOOK', message: 'Signal successfully posted to Discord Webhook!' };
      } else {
        const errorText = await res.text().catch(() => 'unknown');
        console.error(`[DiscordBot] Webhook dispatch returned HTTP ${res.status}: ${errorText}`);
        return { success: false, method: 'WEBHOOK', message: `Webhook failed with status ${res.status}` };
      }
    } catch (err) {
      console.error('[DiscordBot] Webhook dispatch failed:', err);
      return { success: false, method: 'WEBHOOK', message: 'Webhook dispatch exception' };
    }
  }

  return {
    success: false,
    method: 'NONE',
    message: 'No active Discord Webhook URL configured.',
  };"""

if target in content:
    content = content.replace(target, replacement)
    with open("src/bot/discordBotService.ts", "w") as f:
        f.write(content)
    print("Discord fixed successfully.")
else:
    print("Target not found.")

