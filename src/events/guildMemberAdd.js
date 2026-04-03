const { auditLog, createEmbed } = require('../utils/helpers');

// Member Join
module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    await auditLog(
      member.guild,
      '✅ Member Joined',
      `**User:** ${member.user.tag} (${member.id})\n**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
      '#57F287'
    );
  },
};
