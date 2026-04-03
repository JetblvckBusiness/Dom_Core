const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

/**
 * Creates a styled embed with consistent branding
 */
function createEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || '#5865F2')
    .setTimestamp();

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.fields) embed.addFields(options.fields);
  if (options.footer) embed.setFooter({ text: options.footer });
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);

  return embed;
}

/**
 * Sends a log to the audit log channel
 */
async function auditLog(guild, action, details, color = '#FF9900') {
  const logChannelId = process.env.LOG_CHANNEL_ID;
  if (!logChannelId) return;

  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const embed = createEmbed({
    title: `📋 ${action}`,
    description: details,
    color,
    footer: `Audit Log • ${guild.name}`,
  });

  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

/**
 * Check if a member has a staff/mod role
 */
function isStaff(member) {
  const staffRoles = [
    process.env.STAFF_ROLE_ID,
    process.env.MOD_ROLE_ID,
    process.env.ADMIN_ROLE_ID,
  ].filter(Boolean);

  return (
    member.permissions.has(PermissionFlagsBits.ManageMessages) ||
    member.roles.cache.some(r => staffRoles.includes(r.id))
  );
}

/**
 * Format milliseconds into readable time
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Parse duration string (e.g. "1h", "30m", "1d") to milliseconds
 */
function parseDuration(str) {
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;
  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * multipliers[unit];
}

module.exports = { createEmbed, auditLog, isStaff, formatDuration, parseDuration };
