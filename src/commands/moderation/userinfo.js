const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get information about a user')
    .addUserOption(o => o.setName('user').setDescription('User to look up (default: yourself)')),

  async execute(interaction, client) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    const createdAt = Math.floor(targetUser.createdTimestamp / 1000);
    const joinedAt = member ? Math.floor(member.joinedTimestamp / 1000) : null;

    const roles = member
      ? member.roles.cache
          .filter(r => r.id !== interaction.guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => `${r}`)
          .slice(0, 10)
          .join(' ') || 'None'
      : 'Not in server';

    const flags = targetUser.flags?.toArray() || [];
    const badges = flags.length
      ? flags.map(f => f.replace(/_/g, ' ')).join(', ')
      : 'None';

    const statusMap = { online: '🟢 Online', idle: '🟡 Idle', dnd: '🔴 Do Not Disturb', offline: '⚫ Offline' };
    const status = member?.presence?.status
      ? statusMap[member.presence.status] || '⚫ Offline'
      : '⚫ Offline';

    const embed = createEmbed({
      title: `👤 ${targetUser.tag}`,
      thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 256 }),
      fields: [
        { name: '🆔 User ID', value: targetUser.id, inline: true },
        { name: '🤖 Bot', value: targetUser.bot ? 'Yes' : 'No', inline: true },
        { name: '📶 Status', value: status, inline: true },
        { name: '📅 Account Created', value: `<t:${createdAt}:D>\n<t:${createdAt}:R>`, inline: true },
        { name: '📥 Joined Server', value: joinedAt ? `<t:${joinedAt}:D>\n<t:${joinedAt}:R>` : 'N/A', inline: true },
        { name: '🎖️ Highest Role', value: member?.roles?.highest?.toString() || 'N/A', inline: true },
        { name: `📋 Roles (${member?.roles?.cache?.size - 1 || 0})`, value: roles },
        { name: '🏅 Badges', value: badges },
      ],
      color: member?.displayHexColor || '#5865F2',
      footer: `Requested by ${interaction.user.tag}`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
