const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available commands'),

  async execute(interaction, client) {
    const embed = createEmbed({
      title: '📖 Bot Commands',
      description: 'Here\'s a full list of available commands:',
      fields: [
        {
          name: '🎫 Tickets',
          value: [
            '`/ticket panel` — Send the ticket creation panel',
            '`/ticket close [reason]` — Close current ticket',
            '`/ticket add <user>` — Add user to ticket',
            '`/ticket remove <user>` — Remove user from ticket',
          ].join('\n'),
        },
        {
          name: '📋 Applications',
          value: [
            '`/application apply` — Submit a staff application',
            '`/application panel` — Send the application panel (staff)',
          ].join('\n'),
        },
        {
          name: '🎉 Giveaways',
          value: [
            '`/giveaway start <prize> <duration> [winners]` — Start a giveaway',
            '`/giveaway end <message_id>` — End a giveaway early',
            '`/giveaway reroll <message_id>` — Reroll winners',
            '`/giveaway list` — List active giveaways',
          ].join('\n'),
        },
        {
          name: '🔨 Moderation',
          value: [
            '`/mod ban <user> [reason] [days]` — Ban a member',
            '`/mod kick <user> [reason]` — Kick a member',
            '`/mod timeout <user> <minutes> [reason]` — Timeout a member',
            '`/mod untimeout <user>` — Remove timeout',
            '`/mod warn <user> <reason>` — Warn a member',
            '`/mod warnings <user>` — View warnings',
            '`/mod clearwarnings <user>` — Clear warnings',
            '`/mod purge <amount> [user]` — Bulk delete messages',
            '`/mod lockdown <true/false> [reason]` — Lock/unlock channel',
          ].join('\n'),
        },
        {
          name: '🛠️ Utilities',
          value: [
            '`/embed` — Send a custom embed message (staff)',
            '`/stats` — View server statistics',
            '`/poll <question> <options...> [duration] [anonymous]` — Create a poll',
            '`/userinfo [user]` — View user information',
          ].join('\n'),
        },
      ],
      color: '#5865F2',
      footer: 'Use / to access all slash commands',
      thumbnail: client.user?.displayAvatarURL(),
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
