import { Client, GatewayIntentBits } from 'discord.js';

export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

export function generateInviteUrl(clientId?: string): string {
  const id = clientId || process.env.DISCORD_CLIENT_ID || '123456789012345678';
  const permissions = '268435456'; // Send Messages, Embed Links, Read Message History, Manage Roles
  return `https://discord.com/api/oauth2/authorize?client_id=${id}&permissions=${permissions}&scope=bot%20applications.commands`;
}
