const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { createEmbed, auditLog, isStaff } = require('../../utils/helpers');

const TICKET_TYPES = [
  { label: '🛠️ Support', value: 'support', description: 'General support request' },
  { label: '💰 Billing', value: 'billing', description: 'Billing or payment issues' },
  { label: '🐛 Bug Report', value: 'bug', description: 'Report a bug or issue' },
  { label: '🤝 Partnership', value: 'partnership', description: 'Partnership inquiries' },
  { label: '⚠️ Report User', value: 'report', description: 'Report a user' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket management')
    .addSubcommand(sub => sub.setName('panel').setDescription('Send the ticket creation panel'))
    .addSubcommand(sub =>
      sub
        .setName('close')
        .setDescription('Close the current ticket')
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for closing'))
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a user to this ticket')
        .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a user from this ticket')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: '❌ You need staff permissions.', ephemeral: true });
      }

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_type_select')
          .setPlaceholder('📩 Select a ticket type...')
          .addOptions(TICKET_TYPES)
      );

      const embed = createEmbed({
        title: '🎫 Support Tickets',
        description:
          '> Need help? Open a ticket and our team will assist you.\n\n' +
          TICKET_TYPES.map(t => `${t.label} — ${t.description}`).join('\n'),
        color: '#5865F2',
        footer: 'Select a category below to open a ticket',
      });

      await interaction.channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: '✅ Ticket panel sent!', ephemeral: true });
    }

    if (sub === 'close') {
      await this.handleClose(interaction, client);
    }

    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });

      await interaction.channel.permissionOverwrites.edit(member, {
        ViewChannel: true,
        SendMessages: true,
      });
      await interaction.reply({
        embeds: [createEmbed({ description: `✅ Added ${user} to the ticket.`, color: '#57F287' })],
      });
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: '❌ Member not found.', ephemeral: true });

      await interaction.channel.permissionOverwrites.edit(member, {
        ViewChannel: false,
      });
      await interaction.reply({
        embeds: [createEmbed({ description: `✅ Removed ${user} from the ticket.`, color: '#ED4245' })],
      });
    }
  },

  async handleTypeSelect(interaction, client) {
    const type = interaction.values[0];
    const typeInfo = TICKET_TYPES.find(t => t.value === type);
    const guild = interaction.guild;
    const member = interaction.member;

    // Check if user already has an open ticket
    const existing = guild.channels.cache.find(
      c => c.name === `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}` &&
           c.topic?.includes(member.id)
    );
    if (existing) {
      return interaction.reply({
        content: `❌ You already have an open ticket: ${existing}`,
        ephemeral: true,
      });
    }

    const categoryId = process.env.TICKET_CATEGORY_ID;
    const staffRoleId = process.env.STAFF_ROLE_ID;

    const permissionOverwrites = [
      { id: guild.id, deny: ['ViewChannel'] },
      { id: member.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
    ];
    if (staffRoleId) {
      permissionOverwrites.push({
        id: staffRoleId,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'ManageMessages'],
      });
    }

    const channel = await guild.channels.create({
      name: `ticket-${member.user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: categoryId || null,
      topic: `Ticket by ${member.user.tag} (${member.id}) | Type: ${type}`,
      permissionOverwrites,
    });

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close_ticket')
        .setLabel('🔒 Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    const embed = createEmbed({
      title: `${typeInfo.label} Ticket`,
      description:
        `Welcome ${member}, our staff will be with you shortly.\n\n` +
        `**Type:** ${typeInfo.label}\n` +
        `**Opened by:** ${member}\n` +
        `**Opened at:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
        `> Please describe your issue in detail.`,
      color: '#5865F2',
      footer: 'Click the button below to close this ticket',
    });

    await channel.send({ content: `${member} ${staffRoleId ? `<@&${staffRoleId}>` : ''}`, embeds: [embed], components: [closeRow] });

    await auditLog(guild, 'Ticket Opened', `**User:** ${member.user.tag}\n**Type:** ${typeInfo.label}\n**Channel:** ${channel}`, '#5865F2');

    await interaction.reply({ content: `✅ Your ticket has been created: ${channel}`, ephemeral: true });
  },

  async handleClose(interaction, client) {
    const channel = interaction.channel;
    if (!channel.topic?.includes('Ticket by')) {
      return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
    }

    const reason = interaction.options?.getString?.('reason') || 'No reason provided';

    const embed = createEmbed({
      title: '🔒 Ticket Closed',
      description: `**Closed by:** ${interaction.user}\n**Reason:** ${reason}\n\nThis channel will be deleted in 5 seconds.`,
      color: '#ED4245',
    });

    await interaction.reply({ embeds: [embed] });
    await auditLog(
      interaction.guild,
      'Ticket Closed',
      `**Channel:** ${channel.name}\n**Closed by:** ${interaction.user.tag}\n**Reason:** ${reason}`,
      '#ED4245'
    );

    setTimeout(() => channel.delete().catch(() => {}), 5000);
  },
};
