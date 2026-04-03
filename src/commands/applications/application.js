const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { createEmbed, auditLog, isStaff } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('application')
    .setDescription('Application system')
    .addSubcommand(sub => sub.setName('apply').setDescription('Submit an application'))
    .addSubcommand(sub => sub.setName('panel').setDescription('Send the application panel (staff only)')),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'apply') {
      const modal = new ModalBuilder()
        .setCustomId('application_modal')
        .setTitle('📝 Staff Application');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('app_age')
            .setLabel('How old are you?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('e.g. 18')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('app_timezone')
            .setLabel('What is your timezone?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('e.g. EST, PST, GMT')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('app_experience')
            .setLabel('Do you have prior moderation experience?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Describe your previous experience...')
            .setMaxLength(500)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('app_why')
            .setLabel('Why do you want to be staff?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Tell us why you want to join our team...')
            .setMaxLength(500)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('app_extra')
            .setLabel('Anything else you want to add?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setPlaceholder('Optional...')
            .setMaxLength(300)
        )
      );

      await interaction.showModal(modal);
    }

    if (sub === 'panel') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ You need staff permissions.', ephemeral: true });
      }

      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('open_application')
          .setLabel('📝 Apply Now')
          .setStyle(ButtonStyle.Primary)
      );

      const embed = createEmbed({
        title: '📋 Staff Applications',
        description:
          '> Want to join our team? Click the button below to submit your application!\n\n' +
          '**Requirements:**\n' +
          '• Be active in the server\n' +
          '• Be mature and professional\n' +
          '• Have good communication skills\n' +
          '• No recent punishments',
        color: '#5865F2',
        footer: 'Applications are reviewed by admins',
      });

      await interaction.channel.send({ embeds: [embed], components: [button] });
      await interaction.reply({ content: '✅ Application panel sent!', ephemeral: true });
    }
  },

  async handleSubmit(interaction, client) {
    const age = interaction.fields.getTextInputValue('app_age');
    const timezone = interaction.fields.getTextInputValue('app_timezone');
    const experience = interaction.fields.getTextInputValue('app_experience');
    const why = interaction.fields.getTextInputValue('app_why');
    const extra = interaction.fields.getTextInputValue('app_extra') || 'N/A';

    const appChannelId = process.env.APPLICATION_CHANNEL_ID;
    if (!appChannelId) {
      return interaction.reply({ content: '❌ Application channel not configured.', ephemeral: true });
    }

    const appChannel = interaction.guild.channels.cache.get(appChannelId);
    if (!appChannel) {
      return interaction.reply({ content: '❌ Application channel not found.', ephemeral: true });
    }

    const appId = `APP-${Date.now().toString(36).toUpperCase()}`;

    const embed = createEmbed({
      title: `📝 New Application — ${appId}`,
      description: `**Applicant:** ${interaction.user} (${interaction.user.tag})`,
      fields: [
        { name: '🎂 Age', value: age, inline: true },
        { name: '🕐 Timezone', value: timezone, inline: true },
        { name: '📋 Experience', value: experience },
        { name: '💬 Why Staff?', value: why },
        { name: '➕ Additional Info', value: extra },
      ],
      color: '#FEE75C',
      footer: `Application ID: ${appId}`,
      thumbnail: interaction.user.displayAvatarURL(),
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`app_accept_${interaction.user.id}_${appId}`)
        .setLabel('✅ Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`app_deny_${interaction.user.id}_${appId}`)
        .setLabel('❌ Deny')
        .setStyle(ButtonStyle.Danger)
    );

    await appChannel.send({ embeds: [embed], components: [row] });
    await interaction.reply({
      embeds: [createEmbed({
        title: '✅ Application Submitted!',
        description: `Your application (**${appId}**) has been submitted and is under review.\nYou'll be notified of the decision.`,
        color: '#57F287',
      })],
      ephemeral: true,
    });
  },

  async handleReview(interaction, client) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ Only staff can review applications.', ephemeral: true });
    }

    const [, action, userId, appId] = interaction.customId.split('_');
    const isAccept = action === 'accept';

    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

    const color = isAccept ? '#57F287' : '#ED4245';
    const label = isAccept ? '✅ Accepted' : '❌ Denied';

    // Update the embed
    const oldEmbed = interaction.message.embeds[0];
    const updatedEmbed = createEmbed({
      title: oldEmbed.title,
      description: `${oldEmbed.description}\n\n**Status:** ${label}\n**Reviewed by:** ${interaction.user}`,
      fields: oldEmbed.fields,
      color,
      footer: oldEmbed.footer?.text,
      thumbnail: oldEmbed.thumbnail?.url,
    });

    await interaction.message.edit({ embeds: [updatedEmbed], components: [] });

    // DM the applicant
    const dm = createEmbed({
      title: `Application ${label}`,
      description: isAccept
        ? `🎉 Congratulations! Your application in **${interaction.guild.name}** has been accepted!`
        : `Unfortunately, your application in **${interaction.guild.name}** has been denied. Feel free to reapply in the future.`,
      color,
    });
    await user.send({ embeds: [dm] }).catch(() => {});

    await interaction.reply({ content: `${label} — notified ${user.tag}`, ephemeral: true });
    await auditLog(interaction.guild, `Application ${label}`, `**Applicant:** ${user.tag}\n**Reviewed by:** ${interaction.user.tag}\n**App ID:** ${appId}`, color);
  },
};
