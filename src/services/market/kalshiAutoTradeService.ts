import { KalshiAutoTradeConfig, AutoTradeAuditLog } from '../../types';

export interface KalshiKeyStatusResponse {
  success: boolean;
  configured: boolean;
  keyIdMasked: string;
  environment: 'live' | 'paper';
  autoTradeConfig: KalshiAutoTradeConfig;
  consecutiveFailures: number;
  message?: string;
  error?: string;
}

export interface KalshiHandshakeResponse {
  success: boolean;
  status: 'CONNECTED' | 'DISCONNECTED';
  latencyMs: number;
  statusCode: number;
  balance?: number | null;
  message: string;
  rawResponse?: any;
}

export const KalshiAutoTradeService = {
  /**
   * Fetch current user Kalshi credentials status & auto-trade configuration
   */
  async getStatus(userEmail?: string, userId?: string): Promise<KalshiKeyStatusResponse> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userEmail) headers['x-user-email'] = userEmail;
      if (userId) headers['x-user-id'] = userId;

      const res = await fetch('/api/kalshi/keys', { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          configured: false,
          keyIdMasked: '',
          environment: 'live',
          autoTradeConfig: {
            enabled: false,
            confidenceThreshold: 80,
            maxStakePerTradeUSD: 25,
            maxDailyExposureUSD: 100,
            supportedMarkets: ['BTC', 'ETH', 'SOL'],
            environment: 'live',
            consecutiveFailures: 0,
            autoDisabledReason: null,
          },
          consecutiveFailures: 0,
          error: err?.error || 'Failed to load Kalshi API status',
        };
      }
      return await res.json();
    } catch (e: any) {
      return {
        success: false,
        configured: false,
        keyIdMasked: '',
        environment: 'live',
        autoTradeConfig: {
          enabled: false,
          confidenceThreshold: 80,
          maxStakePerTradeUSD: 25,
          maxDailyExposureUSD: 100,
          supportedMarkets: ['BTC', 'ETH', 'SOL'],
          environment: 'live',
          consecutiveFailures: 0,
          autoDisabledReason: null,
        },
        consecutiveFailures: 0,
        error: e?.message,
      };
    }
  },

  /**
   * Save and encrypt private Kalshi API keys on the server
   */
  async saveKeys(params: {
    keyId: string;
    privateKey: string;
    environment: 'live' | 'paper';
    userEmail?: string;
    userId?: string;
  }): Promise<{ success: boolean; keyIdMasked?: string; message?: string; error?: string }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (params.userEmail) headers['x-user-email'] = params.userEmail;
      if (params.userId) headers['x-user-id'] = params.userId;

      const res = await fetch('/api/kalshi/keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          keyId: params.keyId,
          privateKey: params.privateKey,
          environment: params.environment,
          email: params.userEmail,
          userId: params.userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error || data?.message || 'Failed to save credentials' };
      }
      return { success: true, keyIdMasked: data?.keyIdMasked, message: data?.message };
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  /**
   * Delete stored Kalshi keys
   */
  async deleteKeys(userEmail?: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userEmail) headers['x-user-email'] = userEmail;
      if (userId) headers['x-user-id'] = userId;

      const res = await fetch('/api/kalshi/keys', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ email: userEmail, userId }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  /**
   * Real Signed Handshake Test against Kalshi's API
   */
  async testHandshake(params: {
    keyId?: string;
    privateKey?: string;
    environment?: 'live' | 'paper';
    userEmail?: string;
    userId?: string;
  }): Promise<KalshiHandshakeResponse> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (params.userEmail) headers['x-user-email'] = params.userEmail;
      if (params.userId) headers['x-user-id'] = params.userId;

      const res = await fetch('/api/kalshi/test-handshake', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });

      return await res.json();
    } catch (e: any) {
      return {
        success: false,
        status: 'DISCONNECTED',
        latencyMs: 0,
        statusCode: 500,
        message: `Handshake failed: ${e?.message || 'Unknown network error'}`,
      };
    }
  },

  /**
   * Save Auto-Trading Configuration
   */
  async saveConfig(
    config: Partial<KalshiAutoTradeConfig> & { resetKillSwitch?: boolean },
    userEmail?: string,
    userId?: string
  ): Promise<{ success: boolean; config?: KalshiAutoTradeConfig; error?: string; message?: string }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userEmail) headers['x-user-email'] = userEmail;
      if (userId) headers['x-user-id'] = userId;

      const res = await fetch('/api/kalshi/auto-trade/config', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...config, email: userEmail, userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data?.error || 'Failed to save auto-trade configuration' };
      }
      return data;
    } catch (e: any) {
      return { success: false, error: e?.message };
    }
  },

  /**
   * Fetch user auto-trade audit logs
   */
  async getAuditLogs(userEmail?: string, userId?: string): Promise<{ success: boolean; logs: AutoTradeAuditLog[] }> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userEmail) headers['x-user-email'] = userEmail;
      if (userId) headers['x-user-id'] = userId;

      const res = await fetch('/api/kalshi/auto-trade/logs', { headers });
      if (!res.ok) return { success: false, logs: [] };
      return await res.json();
    } catch {
      return { success: false, logs: [] };
    }
  },
};
