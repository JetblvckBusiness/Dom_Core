const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { createEmbed, auditLog, isStaff, parseDuration, formatDuration } = require('../../utils/helpers');

// In-memory store: giveawayId -> { prize, hostId, endTime, channelId, messageId, entries: Set }
const giveaways = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway system')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start a giveaway')
        .addStringOption(opt => opt.setName('prize').setDescription('What is being given away').setRequired(true))
        .addStringOption(opt => opt.setName('duration').setDescription('Duration (e.g. 1h, 30m, 1d)').setRequired(true))
        .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners (default: 1)').setMinValue(1).setMaxValue(20))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to host giveaway (default: current)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption(opt => opt.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('reroll')
        .setDescription('Reroll winners for a giveaway')
        .addStringOption(opt => opt.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('List active giveaways')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ You need staff permissions.', ephemeral: true });
      }

      const prize = interaction.options.getString('prize');
      const durationStr = interaction.options.getString('duration');
      const winnersCount = interaction.options.getInteger('winners') || 1;
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

      const duration = parseDuration(durationStr);
      if (!duration) {
        return interaction.reply({ content: '❌ Invalid duration. Use format: `30m`, `1h`, `1d`', ephemeral: true });
      }

      const endTime = Date.now() + duration;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_enter_placeholder')
          .setLabel('🎉 Enter Giveaway (0)')
          .setStyle(ButtonStyle.Primary)
      );

      const embed = createEmbed({
        title: `🎉 GIVEAWAY — ${prize}`,
        description:
          `**Prize:** ${prize}\n` +
          `**Winners:** ${winnersCount}\n` +
          `**Hosted by:** ${interaction.user}\n` +
          `**Ends:** <t:${Math.floor(endTime / 1000)}:R> (<t:${Math.floor(endTime / 1000)}:F>)\n\n` +
          `> Click the button below to enter!`,
        color: '#FEE75C',
        footer: `${winnersCount} winner(s) • Ends`,
      });

      const msg = await targetChannel.send({ embeds: [embed], components: [row] });

      // Update button with correct message ID
      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_enter_${msg.id}`)
          .setLabel('🎉 Enter Giveaway (0)')
          .setStyle(ButtonStyle.Primary)
      );
      await msg.edit({ components: [updatedRow] });

      giveaways.set(msg.id, {
        prize,
        hostId: interaction.user.id,
        endTime,
        channelId: targetChannel.id,
        messageId: msg.id,
        winnersCount,
        entries: new Set(),
        ended: false,
      });

      // Schedule auto-end
      setTimeout(() => this.endGiveaway(msg.id, client), duration);

      await interaction.reply({ content: `✅ Giveaway started in ${targetChannel}!`, ephemeral: true });
    }

    if (sub === 'end') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ You need staff permissions.', ephemeral: true });
      }
      const msgId = interaction.options.getString('message_id');
      await this.endGiveaway(msgId, client);
      await interaction.reply({ content: '✅ Giveaway ended!', ephemeral: true });
    }

    if (sub === 'reroll') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ You need staff permissions.', ephemeral: true });
      }
      const msgId = interaction.options.getString('message_id');
      const gw = giveaways.get(msgId);
      if (!gw || !gw.ended) {
        return interaction.reply({ content: '❌ Giveaway not found or not ended yet.', ephemeral: true });
      }
      const winners = pickWinners([...gw.entries], gw.winnersCount);
      await interaction.reply({
        embeds: [createEmbed({
          title: '🎉 Giveaway Rerolled!',
          description: `**Prize:** ${gw.prize}\n**New Winners:** ${winners.map(id => `<@${id}>`).join(', ') || 'No valid entries'}`,
          color: '#FEE75C',
        })],
      });
    }

    if (sub === 'list') {
      const active = [...giveaways.values()].filter(g => !g.ended);
      if (!active.length) {
        return interaction.reply({ content: '📭 No active giveaways.', ephemeral: true });
      }
      const list = active.map(g =>
        `• **${g.prize}** — Ends <t:${Math.floor(g.endTime / 1000)}:R> | ${g.entries.size} entries`
      ).join('\n');
      await interaction.reply({
        embeds: [createEmbed({ title: '🎉 Active Giveaways', description: list, color: '#FEE75C' })],
        ephemeral: true,
      });
    }
  },

  async handleEnter(interaction, client) {
    const msgId = interaction.customId.replace('giveaway_enter_', '');
    const gw = giveaways.get(msgId);

    if (!gw || gw.ended) {
      return interaction.reply({ content: '❌ This giveaway has ended.', ephemeral: true });
    }

    if (gw.entries.has(interaction.user.id)) {
      gw.entries.delete(interaction.user.id);
      await updateGiveawayButton(interaction.message, msgId, gw.entries.size);
      return interaction.reply({ content: '🚪 You have left the giveaway.', ephemeral: true });
    }

    gw.entries.add(interaction.user.id);
    await updateGiveawayButton(interaction.message, msgId, gw.entries.size);
    return interaction.reply({ content: '✅ You have entered the giveaway! Good luck! 🎉', ephemeral: true });
  },

  async endGiveaway(msgId, client) {
    const gw = giveaways.get(msgId);
    if (!gw || gw.ended) return;
    gw.ended = true;

    const channel = client.channels.cache.get(gw.channelId);
    if (!channel) return;

    const msg = await channel.messages.fetch(msgId).catch(() => null);
    if (!msg) return;

    const winners = pickWinners([...gw.entries], gw.winnersCount);
    const winnerMentions = winners.map(id => `<@${id}>`).join(', ') || 'No entries';

    const embed = createEmbed({
      title: `🎊 GIVEAWAY ENDED — ${gw.prize}`,
      description:
        `**Prize:** ${gw.prize}\n` +
        `**Winners:** ${winnerMentions}\n` +
        `**Total Entries:** ${gw.entries.size}\n` +
        `**Hosted by:** <@${gw.hostId}>`,
      color: '#57F287',
      footer: 'Giveaway ended',
    });

    await msg.edit({ embeds: [embed], components: [] });

    if (winners.length > 0) {
      await channel.send({
        content: `🎉 Congratulations ${winnerMentions}! You won **${gw.prize}**!`,
      });
    }
  },
};

function pickWinners(entries, count) {
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function updateGiveawayButton(message, msgId, count) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_enter_${msgId}`)
      .setLabel(`🎉 Enter Giveaway (${count})`)
      .setStyle(ButtonStyle.Primary)
  );
  await message.edit({ components: [row] }).catch(() => {});
}
