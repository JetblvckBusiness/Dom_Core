const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed, auditLog } = require('../../utils/helpers');

// Simple in-memory warnings store
const warnings = new Map(); // userId -> [{ reason, moderator, timestamp }]

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub.setName('ban')
        .setDescription('Ban a member')
        .addUserOption(o => o.setName('user').setDescription('User to ban').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason'))
        .addIntegerOption(o => o.setName('days').setDescription('Delete messages from last N days (0-7)').setMinValue(0).setMaxValue(7))
    )
    .addSubcommand(sub =>
      sub.setName('kick')
        .setDescription('Kick a member')
        .addUserOption(o => o.setName('user').setDescription('User to kick').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason'))
    )
    .addSubcommand(sub =>
      sub.setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption(o => o.setName('user').setDescription('User to timeout').setRequired(true))
        .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
        .addStringOption(o => o.setName('reason').setDescription('Reason'))
    )
    .addSubcommand(sub =>
      sub.setName('untimeout')
        .setDescription('Remove timeout from a member')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('warn')
        .setDescription('Warn a member')
        .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('warnings')
        .setDescription('View warnings for a user')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('clearwarnings')
        .setDescription('Clear warnings for a user')
        .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('purge')
        .setDescription('Bulk delete messages')
        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user'))
    )
    .addSubcommand(sub =>
      sub.setName('lockdown')
        .setDescription('Lock or unlock a channel')
        .addBooleanOption(o => o.setName('lock').setDescription('True = lock, False = unlock').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason'))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const mod = interaction.member;

    await interaction.deferReply({ ephemeral: true });

    if (sub === 'ban') {
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const days = interaction.options.getInteger('days') || 0;

      if (!target) return interaction.editReply('❌ Member not found.');
      if (!target.bannable) return interaction.editReply('❌ I cannot ban this member.');

      await dmPunishment(target.user, guild, 'banned', reason);
      await target.ban({ deleteMessageDays: days, reason: `${mod.user.tag}: ${reason}` });

      await interaction.editReply({ embeds: [createEmbed({ description: `✅ Banned **${target.user.tag}**\nReason: ${reason}`, color: '#ED4245' })] });
      await auditLog(guild, '🔨 Member Banned', `**User:** ${target.user.tag}\n**Mod:** ${mod.user.tag}\n**Reason:** ${reason}`, '#ED4245');
    }

    if (sub === 'kick') {
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!target) return interaction.editReply('❌ Member not found.');
      if (!target.kickable) return interaction.editReply('❌ I cannot kick this member.');

      await dmPunishment(target.user, guild, 'kicked', reason);
      await target.kick(`${mod.user.tag}: ${reason}`);

      await interaction.editReply({ embeds: [createEmbed({ description: `✅ Kicked **${target.user.tag}**\nReason: ${reason}`, color: '#FFA500' })] });
      await auditLog(guild, '👢 Member Kicked', `**User:** ${target.user.tag}\n**Mod:** ${mod.user.tag}\n**Reason:** ${reason}`, '#FFA500');
    }

    if (sub === 'timeout') {
      const target = interaction.options.getMember('user');
      const minutes = interaction.options.getInteger('minutes');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!target) return interaction.editReply('❌ Member not found.');

      await target.timeout(minutes * 60 * 1000, `${mod.user.tag}: ${reason}`);

      await interaction.editReply({ embeds: [createEmbed({ description: `✅ Timed out **${target.user.tag}** for **${minutes}m**\nReason: ${reason}`, color: '#FEE75C' })] });
      await auditLog(guild, '⏱️ Member Timed Out', `**User:** ${target.user.tag}\n**Duration:** ${minutes}m\n**Mod:** ${mod.user.tag}\n**Reason:** ${reason}`, '#FEE75C');
    }

    if (sub === 'untimeout') {
      const target = interaction.options.getMember('user');
      if (!target) return interaction.editReply('❌ Member not found.');

      await target.timeout(null);
      await interaction.editReply({ embeds: [createEmbed({ description: `✅ Removed timeout from **${target.user.tag}**`, color: '#57F287' })] });
    }

    if (sub === 'warn') {
      const target = interaction.options.getMember('user');
      const reason = interaction.options.getString('reason');

      if (!target) return interaction.editReply('❌ Member not found.');

      const userId = target.user.id;
      if (!warnings.has(userId)) warnings.set(userId, []);
      warnings.get(userId).push({ reason, moderator: mod.user.tag, timestamp: new Date().toISOString() });

      const warnCount = warnings.get(userId).length;
      await dmPunishment(target.user, guild, 'warned', reason);

      await interaction.editReply({ embeds: [createEmbed({ description: `⚠️ Warned **${target.user.tag}** (Warning #${warnCount})\nReason: ${reason}`, color: '#FEE75C' })] });
      await auditLog(guild, '⚠️ Member Warned', `**User:** ${target.user.tag}\n**Warning #:** ${warnCount}\n**Mod:** ${mod.user.tag}\n**Reason:** ${reason}`, '#FEE75C');
    }

    if (sub === 'warnings') {
      const target = interaction.options.getUser('user');
      const userWarnings = warnings.get(target.id) || [];

      if (!userWarnings.length) {
        return interaction.editReply({ embeds: [createEmbed({ description: `✅ **${target.tag}** has no warnings.`, color: '#57F287' })] });
      }

      const warnList = userWarnings.map((w, i) => `**#${i + 1}** — ${w.reason}\n*by ${w.moderator} at ${w.timestamp.split('T')[0]}*`).join('\n\n');

      await interaction.editReply({
        embeds: [createEmbed({
          title: `⚠️ Warnings for ${target.tag}`,
          description: warnList,
          color: '#FEE75C',
          footer: `Total: ${userWarnings.length} warning(s)`,
        })],
      });
    }

    if (sub === 'clearwarnings') {
      const target = interaction.options.getUser('user');
      warnings.delete(target.id);
      await interaction.editReply({ embeds: [createEmbed({ description: `✅ Cleared all warnings for **${target.tag}**`, color: '#57F287' })] });
    }

    if (sub === 'purge') {
      const amount = interaction.options.getInteger('amount');
      const filterUser = interaction.options.getUser('user');

      let messages = await interaction.channel.messages.fetch({ limit: 100 });
      if (filterUser) messages = messages.filter(m => m.author.id === filterUser.id);
      const toDelete = [...messages.values()].slice(0, amount);

      const deleted = await interaction.channel.bulkDelete(toDelete, true).catch(() => new Map());

      await interaction.editReply({ embeds: [createEmbed({ description: `🗑️ Deleted **${deleted.size}** message(s)`, color: '#5865F2' })] });
      await auditLog(guild, '🗑️ Messages Purged', `**Amount:** ${deleted.size}\n**Channel:** ${interaction.channel}\n**Mod:** ${mod.user.tag}`, '#5865F2');
    }

    if (sub === 'lockdown') {
      const lock = interaction.options.getBoolean('lock');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const channel = interaction.channel;

      await channel.permissionOverwrites.edit(guild.id, { SendMessages: lock ? false : null });

      const action = lock ? '🔒 Locked' : '🔓 Unlocked';
      await interaction.editReply({ embeds: [createEmbed({ description: `${action} **${channel.name}**\nReason: ${reason}`, color: lock ? '#ED4245' : '#57F287' })] });
      await channel.send({ embeds: [createEmbed({ title: `${action} Channel`, description: `This channel has been ${lock ? 'locked' : 'unlocked'} by a moderator.\n**Reason:** ${reason}`, color: lock ? '#ED4245' : '#57F287' })] });
      await auditLog(guild, `${action} Channel`, `**Channel:** ${channel}\n**Mod:** ${mod.user.tag}\n**Reason:** ${reason}`, lock ? '#ED4245' : '#57F287');
    }
  },
};

async function dmPunishment(user, guild, action, reason) {
  const embed = createEmbed({
    title: `You have been ${action} in ${guild.name}`,
    description: `**Reason:** ${reason}`,
    color: '#ED4245',
  });
  await user.send({ embeds: [embed] }).catch(() => {});
}
