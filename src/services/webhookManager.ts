import { env } from '../config/env.config';

export interface WebhookPayload {
  username?: string;
  avatar_url?: string;
  content?: string;
  embeds?: any[];
}

export interface DispatchResult {
  success: boolean;
  channelOrWebhook: string;
  attempts: number;
  error?: string;
}

/**
 * Enterprise Resilient Webhook Manager for VIXY AI Discord Network.
 * Handles rate limiting (429), exponential retries, and multi-endpoint broadcasting.
 */
export class WebhookManager {
  private static MAX_RETRIES = 3;
  private static INITIAL_BACKOFF_MS = 500;

  /**
   * Dispatches a webhook payload with built-in retries and exponential backoff.
   */
  public static async sendWebhook(
    targetUrl: string | undefined,
    payload: WebhookPayload
  ): Promise<DispatchResult> {
    const webhookUrl = targetUrl || env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      return {
        success: false,
        channelOrWebhook: 'NO_WEBHOOK_URL',
        attempts: 0,
        error: 'No active Discord Webhook URL configured.',
      };
    }

    let attempt = 0;
    let delay = this.INITIAL_BACKOFF_MS;

    while (attempt < this.MAX_RETRIES) {
      attempt++;
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: payload.username || 'VIXY AI Intelligence Core',
            avatar_url:
              payload.avatar_url || 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=120',
            content: payload.content,
            embeds: payload.embeds,
          }),
        });

        if (response.ok || response.status === 204) {
          return {
            success: true,
            channelOrWebhook: webhookUrl.substring(0, 35) + '...',
            attempts: attempt,
          };
        }

        // Handle Rate Limit (HTTP 429)
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : delay;
          console.warn(`[WebhookManager] Rate limited (429). Retrying after ${retryMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryMs));
          delay *= 2;
          continue;
        }

        const errorText = await response.text();
        console.warn(`[WebhookManager] HTTP ${response.status} - Attempt ${attempt}: ${errorText}`);
      } catch (err: any) {
        console.warn(`[WebhookManager] Network error - Attempt ${attempt}: ${err.message || String(err)}`);
      }

      if (attempt < this.MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    return {
      success: false,
      channelOrWebhook: webhookUrl.substring(0, 35) + '...',
      attempts: attempt,
      error: 'Max retries exceeded sending Discord Webhook.',
    };
  }

  /**
   * Multi-broadcast helper to post simultaneously to Free Funnel and Elite VIP channels.
   */
  public static async broadcastMultiChannel(
    freeWebhook: string | undefined,
    eliteWebhook: string | undefined,
    freePayload: WebhookPayload,
    elitePayload: WebhookPayload
  ): Promise<{ free: DispatchResult; elite: DispatchResult }> {
    const [freeRes, eliteRes] = await Promise.all([
      this.sendWebhook(freeWebhook, freePayload),
      this.sendWebhook(eliteWebhook || freeWebhook, elitePayload),
    ]);

    return { free: freeRes, elite: eliteRes };
  }
}
