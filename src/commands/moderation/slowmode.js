const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, auditLog } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o =>
      o.setName('seconds')
        .setDescription('Slowmode in seconds (0 to disable)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(21600)
    )
    .addChannelOption(o => o.setName('channel').setDescription('Channel (default: current)')),

  async execute(interaction, client) {
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    await channel.setRateLimitPerUser(seconds);

    const msg = seconds === 0
      ? `✅ Slowmode **disabled** in ${channel}`
      : `✅ Slowmode set to **${seconds}s** in ${channel}`;

    await interaction.reply({
      embeds: [createEmbed({ description: msg, color: '#5865F2' })],
      ephemeral: true,
    });

    await auditLog(
      interaction.guild,
      '⏱️ Slowmode Updated',
      `**Channel:** ${channel}\n**Slowmode:** ${seconds === 0 ? 'Disabled' : `${seconds}s`}\n**Mod:** ${interaction.user.tag}`,
      '#5865F2'
    );
  },
};
