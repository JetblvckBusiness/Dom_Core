const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, auditLog } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(o => o.setName('user_id').setDescription('User ID to unban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for unban')),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const ban = await interaction.guild.bans.fetch(userId);
      await interaction.guild.members.unban(userId, `${interaction.user.tag}: ${reason}`);

      await interaction.editReply({
        embeds: [createEmbed({
          description: `✅ Unbanned **${ban.user.tag}**\nReason: ${reason}`,
          color: '#57F287',
        })],
      });

      await auditLog(
        interaction.guild,
        '🔓 Member Unbanned',
        `**User:** ${ban.user.tag}\n**Mod:** ${interaction.user.tag}\n**Reason:** ${reason}`,
        '#57F287'
      );
    } catch {
      await interaction.editReply({ content: '❌ User not found in ban list.' });
    }
  },
};
