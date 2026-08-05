import { ChatInputCommandInteraction } from 'discord.js';
import { fetchLiveMarketOverview } from '../services/marketData';
import { createDashboardEmbed } from '../embeds/dashboardEmbed';

interface ActiveDashboardMessage {
  channelId: string;
  messageId: string;
  asset: string;
  interaction: ChatInputCommandInteraction;
}

// Registry of active dashboards to edit in-place every 30s
const activeDashboards = new Map<string, ActiveDashboardMessage>();
let updateTimer: NodeJS.Timeout | null = null;

export async function handleDashboardCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const asset = interaction.options.getString('asset')?.toUpperCase() || 'BTC';
  
  const marketData = await fetchLiveMarketOverview(asset);
  const embed = createDashboardEmbed(marketData);

  const replyMessage = await interaction.editReply({ embeds: [embed] });

  // Store in active dashboard registry for in-place 30s editing
  const key = `${interaction.channelId}-${replyMessage.id}`;
  activeDashboards.set(key, {
    channelId: interaction.channelId,
    messageId: replyMessage.id,
    asset,
    interaction,
  });

  // Ensure 30s updater loop is running
  startDashboardUpdaterLoop();
}

function startDashboardUpdaterLoop() {
  if (updateTimer) return;

  updateTimer = setInterval(async () => {
    if (activeDashboards.size === 0) return;

    for (const [key, active] of activeDashboards.entries()) {
      try {
        const marketData = await fetchLiveMarketOverview(active.asset);
        const updatedEmbed = createDashboardEmbed(marketData);
        await active.interaction.editReply({ embeds: [updatedEmbed] });
      } catch (err) {
        console.warn(`[DashboardUpdater] Failed to edit active dashboard ${key}:`, err);
        activeDashboards.delete(key);
      }
    }
  }, 30000); // 30 seconds interval
}
