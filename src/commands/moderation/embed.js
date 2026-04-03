const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const { createEmbed, isStaff } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Send a custom embed message')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction, client) {
    if (!isStaff(interaction.member)) {
      return interaction.reply({ content: '❌ You need staff permissions.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('embed_modal')
      .setTitle('📝 Create Embed');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_title')
          .setLabel('Title')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(256)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_description')
          .setLabel('Description')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(2000)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_color')
          .setLabel('Color (hex, e.g. #5865F2)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder('#5865F2')
          .setMaxLength(7)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_footer')
          .setLabel('Footer text')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(256)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('embed_image')
          .setLabel('Image URL (optional)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
      )
    );

    await interaction.showModal(modal);
  },

  async handleModal(interaction, client) {
    const title = interaction.fields.getTextInputValue('embed_title') || undefined;
    const description = interaction.fields.getTextInputValue('embed_description');
    const color = interaction.fields.getTextInputValue('embed_color') || '#5865F2';
    const footer = interaction.fields.getTextInputValue('embed_footer') || undefined;
    const image = interaction.fields.getTextInputValue('embed_image') || undefined;

    const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(color);

    const embed = createEmbed({
      title,
      description,
      color: isValidHex ? color : '#5865F2',
      footer,
      image,
    });

    await interaction.channel.send({ embeds: [embed] });
    await interaction.reply({ content: '✅ Embed sent!', ephemeral: true });
  },
};
