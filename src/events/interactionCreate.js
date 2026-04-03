const { createEmbed, auditLog } = require('../utils/helpers');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // --- Slash Commands ---
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`Error in /${interaction.commandName}:`, err);
        const msg = { content: '❌ An error occurred executing that command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(msg).catch(() => {});
        } else {
          await interaction.reply(msg).catch(() => {});
        }
      }
      return;
    }

    // --- Buttons ---
    if (interaction.isButton()) {
      const { customId } = interaction;

      // Ticket buttons
      if (customId === 'create_ticket') {
        const ticketCmd = client.commands.get('ticket');
        if (ticketCmd?.handleCreate) await ticketCmd.handleCreate(interaction, client);
        return;
      }
      if (customId === 'close_ticket') {
        const ticketCmd = client.commands.get('ticket');
        if (ticketCmd?.handleClose) await ticketCmd.handleClose(interaction, client);
        return;
      }

      // Application buttons
      if (customId.startsWith('app_accept_') || customId.startsWith('app_deny_')) {
        const appCmd = client.commands.get('application');
        if (appCmd?.handleReview) await appCmd.handleReview(interaction, client);
        return;
      }

      // Giveaway button
      if (customId.startsWith('giveaway_enter_')) {
        const gwCmd = client.commands.get('giveaway');
        if (gwCmd?.handleEnter) await gwCmd.handleEnter(interaction, client);
        return;
      }

      // Poll voting
      if (customId.startsWith('poll_vote_')) {
        const pollCmd = client.commands.get('poll');
        if (pollCmd?.handleVote) await pollCmd.handleVote(interaction, client);
        return;
      }
    }

    // --- Select Menus ---
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_type_select') {
        const ticketCmd = client.commands.get('ticket');
        if (ticketCmd?.handleTypeSelect) await ticketCmd.handleTypeSelect(interaction, client);
      }
    }

    // --- Modals ---
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'application_modal') {
        const appCmd = client.commands.get('application');
        if (appCmd?.handleSubmit) await appCmd.handleSubmit(interaction, client);
      }
      if (interaction.customId === 'embed_modal') {
        const embedCmd = client.commands.get('embed');
        if (embedCmd?.handleModal) await embedCmd.handleModal(interaction, client);
      }
    }
  },
};
