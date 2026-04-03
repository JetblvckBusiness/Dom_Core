const { auditLog } = require('../utils/helpers');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    if (!oldMessage.content) return;

    await auditLog(
      newMessage.guild,
      '✏️ Message Edited',
      `**Author:** ${newMessage.author?.tag}\n**Channel:** ${newMessage.channel}\n**Before:**\n> ${oldMessage.content.slice(0, 400)}\n**After:**\n> ${newMessage.content.slice(0, 400)}`,
      '#FEE75C'
    );
  },
};
