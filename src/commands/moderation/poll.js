const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { createEmbed, isStaff, parseDuration } = require('../../utils/helpers');

// polls: messageId -> { question, options: [{label, votes: Set}], hostId, endTime }
const polls = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(o => o.setName('question').setDescription('The poll question').setRequired(true))
    .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(o => o.setName('option3').setDescription('Option 3'))
    .addStringOption(o => o.setName('option4').setDescription('Option 4'))
    .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 1h, 30m) — leave empty for no end'))
    .addBooleanOption(o => o.setName('anonymous').setDescription('Hide vote counts until poll ends')),

  async execute(interaction, client) {
    const question = interaction.options.getString('question');
    const durationStr = interaction.options.getString('duration');
    const anonymous = interaction.options.getBoolean('anonymous') ?? false;

    const optionLabels = [
      interaction.options.getString('option1'),
      interaction.options.getString('option2'),
      interaction.options.getString('option3'),
      interaction.options.getString('option4'),
    ].filter(Boolean);

    const duration = durationStr ? parseDuration(durationStr) : null;
    if (durationStr && !duration) {
      return interaction.reply({ content: '❌ Invalid duration. Use format: `30m`, `1h`, `1d`', ephemeral: true });
    }

    const endTime = duration ? Date.now() + duration : null;

    const EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
    const options = optionLabels.map((label, i) => ({ label, emoji: EMOJIS[i], votes: new Set() }));

    const buildEmbed = (ended = false) => {
      const totalVotes = options.reduce((sum, o) => sum + o.votes.size, 0);
      const optionLines = options.map((o, i) => {
        const count = o.votes.size;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const bar = buildBar(pct);
        const voteDisplay = anonymous && !ended ? '?' : `${count} vote${count !== 1 ? 's' : ''}`;
        return `${o.emoji} **${o.label}**\n${bar} ${anonymous && !ended ? '' : `${pct}%`} (${voteDisplay})`;
      });

      return createEmbed({
        title: `📊 ${question}`,
        description: optionLines.join('\n\n'),
        fields: [
          { name: 'Total Votes', value: anonymous && !ended ? '🔒 Hidden until poll ends' : `${totalVotes}`, inline: true },
          ...(endTime ? [{ name: ended ? 'Ended' : 'Ends', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true }] : []),
        ],
        color: ended ? '#57F287' : '#5865F2',
        footer: `Poll by ${interaction.user.tag}${anonymous ? ' • Anonymous' : ''}${ended ? ' • ENDED' : ''}`,
      });
    };

    const buildButtons = (disabled = false) =>
      chunkArray(options, 4).map(chunk =>
        new ActionRowBuilder().addComponents(
          chunk.map((o, i) =>
            new ButtonBuilder()
              .setCustomId(`poll_vote_placeholder_${i}`)
              .setLabel(o.label)
              .setEmoji(o.emoji)
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled)
          )
        )
      );

    await interaction.deferReply();
    const msg = await interaction.fetchReply();

    // Rebuild components with actual message ID
    const buildFinalButtons = (disabled = false) =>
      chunkArray(options, 4).map(chunk =>
        new ActionRowBuilder().addComponents(
          chunk.map((o, i) =>
            new ButtonBuilder()
              .setCustomId(`poll_vote_${msg.id}_${i}`)
              .setLabel(o.label)
              .setEmoji(o.emoji)
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(disabled)
          )
        )
      );

    const sentMsg = await interaction.editReply({
      embeds: [buildEmbed()],
      components: buildFinalButtons(),
    });

    polls.set(sentMsg.id, { question, options, hostId: interaction.user.id, endTime, anonymous, buildEmbed, buildFinalButtons });

    if (duration) {
      setTimeout(async () => {
        const poll = polls.get(sentMsg.id);
        if (!poll) return;
        const msg = await interaction.channel.messages.fetch(sentMsg.id).catch(() => null);
        if (!msg) return;
        await msg.edit({
          embeds: [poll.buildEmbed(true)],
          components: poll.buildFinalButtons(true),
        });
      }, duration);
    }
  },

  async handleVote(interaction, client) {
    const parts = interaction.customId.split('_');
    const msgId = parts[2];
    const optionIndex = parseInt(parts[3]);

    const poll = polls.get(msgId);
    if (!poll) return interaction.reply({ content: '❌ Poll not found or expired.', ephemeral: true });

    if (poll.endTime && Date.now() > poll.endTime) {
      return interaction.reply({ content: '❌ This poll has ended.', ephemeral: true });
    }

    const userId = interaction.user.id;
    const selectedOption = poll.options[optionIndex];

    // Remove from all options first (change vote)
    poll.options.forEach(o => o.votes.delete(userId));

    selectedOption.votes.add(userId);

    // Update the message
    await interaction.message.edit({
      embeds: [poll.buildEmbed()],
    });

    await interaction.reply({
      content: `✅ You voted for **${selectedOption.label}**`,
      ephemeral: true,
    });
  },
};

function buildBar(pct) {
  const filled = Math.round(pct / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}
