const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View server statistics'),

  async execute(interaction, client) {
    await interaction.deferReply();
    const guild = interaction.guild;
    await guild.members.fetch();

    const totalMembers = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = totalMembers - bots;
    const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
    const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
    const categories = guild.channels.cache.filter(c => c.type === 4).size;
    const roles = guild.roles.cache.size - 1;
    const emojis = guild.emojis.cache.size;
    const boosts = guild.premiumSubscriptionCount || 0;
    const boostLevel = guild.premiumTier;
    const createdAt = Math.floor(guild.createdTimestamp / 1000);

    const embed = createEmbed({
      title: `📊 ${guild.name} — Server Stats`,
      thumbnail: guild.iconURL({ dynamic: true }),
      fields: [
        { name: '👥 Members', value: `Total: **${totalMembers}**\nHumans: **${humans}**\nBots: **${bots}**\nOnline: **${online}**`, inline: true },
        { name: '💬 Channels', value: `Text: **${textChannels}**\nVoice: **${voiceChannels}**\nCategories: **${categories}**`, inline: true },
        { name: '🔧 Other', value: `Roles: **${roles}**\nEmojis: **${emojis}**\nBoosts: **${boosts}** (Tier ${boostLevel})`, inline: true },
        { name: '🆔 Server ID', value: guild.id, inline: true },
        { name: '👑 Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: '📅 Created', value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: true },
      ],
      color: '#5865F2',
      footer: `Requested by ${interaction.user.tag}`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
