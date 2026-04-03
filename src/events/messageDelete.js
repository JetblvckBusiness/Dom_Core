const { auditLog } = require('../utils/helpers');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;
    if (!message.content) return; // Uncached message

    await auditLog(
      message.guild,
      '🗑️ Message Deleted',
      `**Author:** ${message.author?.tag || 'Unknown'}\n**Channel:** ${message.channel}\n**Content:**\n> ${message.content.slice(0, 900) || '*(no text content)*'}`,
      '#ED4245'
    );
  },
};
