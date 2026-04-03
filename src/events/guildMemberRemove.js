const { auditLog } = require('../utils/helpers');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    await auditLog(
      member.guild,
      '🚪 Member Left',
      `**User:** ${member.user.tag} (${member.id})\n**Joined:** ${member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown'}`,
      '#ED4245'
    );
  },
};
