import { Client, GatewayIntentBits, Interaction } from 'discord.js';

export type DiscordBotMode = 'READY' | 'CONNECTING' | 'RECONNECT_WAIT' | 'DEGRADED' | 'DISABLED';

export interface DiscordBotDiagnostics {
  discordState: DiscordBotMode;
  discordClientInstances: number;
  discordLoginInProgress: boolean;
  discordReconnectAttempts: number;
  discordLastConnect: string | null;
  discordLastDisconnect: string | null;
  discordLastError: string | null;
  discordBackoffMs: number;
  discordTokenConfigured: boolean;
}

export class DiscordBotManager {
  private static instance: DiscordBotManager | null = null;
  private client: Client;
  private mode: DiscordBotMode = 'DISABLED';
  private loginInProgress: boolean = false;
  private reconnectAttempts: number = 0;
  private lastConnectAt: string | null = null;
  private lastDisconnectAt: string | null = null;
  private lastError: string | null = null;
  private currentBackoffMs: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private attemptHistory: number[] = []; // Timestamps of attempts in sliding window
  private circuitTrippedUntil: number = 0;
  private maxAttemptsPerWindow: number = 5;
  private windowDurationMs: number = 10 * 60 * 1000; // 10 minutes
  private circuitCooldownMs: number = 15 * 60 * 1000; // 15 minutes
  private interactionHandlers: Array<(interaction: Interaction) => Promise<void>> = [];

  private constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
    });
    this.attachClientListeners();
  }

  public static getInstance(): DiscordBotManager {
    if (!DiscordBotManager.instance) {
      DiscordBotManager.instance = new DiscordBotManager();
    }
    return DiscordBotManager.instance;
  }

  public getClient(): Client {
    return this.client;
  }

  public getMode(): DiscordBotMode {
    return this.mode;
  }

  public isReady(): boolean {
    return Boolean(this.client && this.client.isReady() && this.mode === 'READY');
  }

  public registerInteractionHandler(handler: (interaction: Interaction) => Promise<void>): void {
    this.interactionHandlers.push(handler);
  }

  private cleanAttemptHistory(): void {
    const cutoff = Date.now() - this.windowDurationMs;
    this.attemptHistory = this.attemptHistory.filter((t) => t > cutoff);
  }

  private isCircuitTripped(): boolean {
    if (Date.now() < this.circuitTrippedUntil) {
      return true;
    }
    this.cleanAttemptHistory();
    if (this.attemptHistory.length >= this.maxAttemptsPerWindow) {
      this.circuitTrippedUntil = Date.now() + this.circuitCooldownMs;
      console.warn(
        `[DiscordBotManager] 🚨 Connection rate limit exceeded (${this.attemptHistory.length} attempts in 10m). Circuit breaker tripped for 15 minutes. Mode -> DEGRADED.`
      );
      return true;
    }
    return false;
  }

  public getDiagnostics(): DiscordBotDiagnostics {
    const isTokenConfigured = Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_BOT_TOKEN.trim().length > 10);
    return {
      discordState: this.mode,
      discordClientInstances: 1,
      discordLoginInProgress: this.loginInProgress,
      discordReconnectAttempts: this.reconnectAttempts,
      discordLastConnect: this.lastConnectAt,
      discordLastDisconnect: this.lastDisconnectAt,
      discordLastError: this.lastError,
      discordBackoffMs: this.currentBackoffMs,
      discordTokenConfigured: isTokenConfigured,
    };
  }

  public getDiagnosticText(): string {
    const d = this.getDiagnostics();
    return [
      `[VIXY_DISCORD_DIAGNOSTIC]`,
      `discordState=${d.discordState}`,
      `discordClientInstances=${d.discordClientInstances}`,
      `discordLoginInProgress=${d.discordLoginInProgress}`,
      `discordReconnectAttempts=${d.discordReconnectAttempts}`,
      `discordLastConnect=${d.discordLastConnect || 'null'}`,
      `discordLastDisconnect=${d.discordLastDisconnect || 'null'}`,
      `discordLastError=${d.discordLastError || 'none'}`,
      `discordBackoffMs=${d.discordBackoffMs}`,
      `discordTokenConfigured=${d.discordTokenConfigured}`,
    ].join('\n');
  }

  private attachClientListeners(): void {
    // Safe error handling on the client to guarantee Node process isolation
    this.client.on('error', (err: any) => {
      const errStr = err?.message || String(err);
      console.warn('[DiscordBotManager] Discord client error (isolated):', errStr);
      this.lastError = errStr;
    });

    this.client.on('shardError', (err: any) => {
      const errStr = err?.message || String(err);
      console.warn('[DiscordBotManager] Discord shard error (isolated):', errStr);
      this.lastError = errStr;
    });

    this.client.on('shardDisconnect', (event: any) => {
      console.warn('[DiscordBotManager] Discord shard disconnected:', event);
      this.handleDisconnect('Shard disconnected');
    });

    this.client.on('invalidated', () => {
      console.warn('[DiscordBotManager] Discord session invalidated.');
      this.handleDisconnect('Session invalidated');
    });

    this.client.on('ready', (c) => {
      this.loginInProgress = false;
      this.mode = 'READY';
      this.reconnectAttempts = 0;
      this.currentBackoffMs = 5000;
      this.lastConnectAt = new Date().toISOString();
      this.lastError = null;
      console.log(`[DiscordBotManager] ✅ Connected successfully as ${c.user.tag}! Active across ${c.guilds.cache.size} guilds.`);

      c.user.setPresence({
        activities: [{ name: 'VIXY AI Signals | /dashboard | /predict', type: 3 }],
        status: 'online',
      });
    });

    this.client.on('interactionCreate', async (interaction) => {
      for (const handler of this.interactionHandlers) {
        try {
          await handler(interaction);
        } catch (err: any) {
          console.warn('[DiscordBotManager] Error executing interaction handler:', err?.message || err);
        }
      }
    });
  }

  public async initialize(): Promise<boolean> {
    const rawToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
    if (!rawToken || rawToken.trim().length < 10) {
      console.log('[DiscordBotManager] No DISCORD_BOT_TOKEN present. Bot subsystem set to DISABLED.');
      this.mode = 'DISABLED';
      return false;
    }

    const token = rawToken.replace(/^["']|["']$/g, '').trim();
    if (
      !token ||
      token.length < 25 ||
      token.includes('YOUR_') ||
      token.includes('your_') ||
      token.includes('placeholder') ||
      token.includes('xxx')
    ) {
      console.log('[DiscordBotManager] DISCORD_BOT_TOKEN is unconfigured or placeholder. Bot subsystem set to DISABLED.');
      this.mode = 'DISABLED';
      return false;
    }

    if (this.mode === 'READY' && this.client.isReady()) {
      return true;
    }

    if (this.loginInProgress) {
      console.log('[DiscordBotManager] Login already in progress. Ignoring duplicate initialize request.');
      return false;
    }

    if (this.isCircuitTripped()) {
      this.mode = 'DEGRADED';
      this.lastError = 'Connection rate limit circuit breaker active';
      return false;
    }

    try {
      this.loginInProgress = true;
      this.mode = 'CONNECTING';
      this.attemptHistory.push(Date.now());
      this.reconnectAttempts++;

      console.log(`[DiscordBotManager] Attempting Discord gateway connection (Attempt #${this.reconnectAttempts})...`);
      await this.client.login(token);
      return true;
    } catch (err: any) {
      this.loginInProgress = false;
      const errStr = String(err?.message || err);
      const isTokenInvalid =
        errStr.includes('TokenInvalid') ||
        errStr.includes('40001') ||
        errStr.includes('401') ||
        errStr.includes('An invalid token was provided') ||
        errStr.includes('Used disallowed intents');

      this.lastError = errStr;
      this.lastDisconnectAt = new Date().toISOString();

      if (isTokenInvalid) {
        console.log(
          `[DiscordBotManager] Discord bot token unconfigured or rejected by API (${errStr}). Subsystem set to DEGRADED mode without retrying. VIXY engine continues unaffected.`
        );
        this.mode = 'DEGRADED';
        this.circuitTrippedUntil = Date.now() + this.circuitCooldownMs;
        return false;
      }

      console.warn(`[DiscordBotManager] Discord gateway connection error: ${errStr}`);

      // Schedule bounded exponential backoff retry if circuit allows
      this.scheduleReconnect();
      return false;
    }
  }

  private handleDisconnect(reason: string): void {
    this.lastDisconnectAt = new Date().toISOString();
    this.lastError = reason;
    this.loginInProgress = false;

    if (this.mode === 'DEGRADED' || this.mode === 'DISABLED') {
      return;
    }

    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.isCircuitTripped()) {
      this.mode = 'DEGRADED';
      return;
    }

    if (this.reconnectAttempts >= this.maxAttemptsPerWindow) {
      console.warn('[DiscordBotManager] Max reconnect attempts reached in window. Transitioning to DEGRADED state.');
      this.mode = 'DEGRADED';
      this.circuitTrippedUntil = Date.now() + this.circuitCooldownMs;
      return;
    }

    this.mode = 'RECONNECT_WAIT';
    // Bounded exponential backoff + jitter
    const jitter = Math.floor(Math.random() * 2000);
    const delay = Math.min(60000, this.currentBackoffMs) + jitter;
    this.currentBackoffMs = Math.min(60000, Math.floor(this.currentBackoffMs * 1.5));

    console.log(`[DiscordBotManager] Scheduling reconnect attempt in ${Math.round(delay / 1000)}s...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.initialize().catch((e) => {
        console.warn('[DiscordBotManager] Reconnect error:', e?.message || e);
      });
    }, delay);
  }

  public destroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.client.destroy();
    } catch (e) {
      // Ignore
    }
    this.mode = 'DISABLED';
    this.loginInProgress = false;
  }
}

// Global Singleton Instance & Exports
export const discordBotManager = DiscordBotManager.getInstance();
export const discordClient = discordBotManager.getClient();

export function generateInviteUrl(clientId?: string): string {
  const id = clientId || process.env.DISCORD_CLIENT_ID || '1534690638937981028';
  const permissions = process.env.DISCORD_PERMISSIONS || process.env.DISCORD_BOT_PERMISSIONS || '2416004096';
  return `https://discord.com/api/oauth2/authorize?client_id=${id}&permissions=${permissions}&scope=bot%20applications.commands`;
}

export async function initializeDiscordBot(): Promise<boolean> {
  return await discordBotManager.initialize();
}
