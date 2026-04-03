module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`\n🤖 Bot is online as ${client.user.tag}`);
    console.log(`📡 Serving ${client.guilds.cache.size} guild(s)`);
    client.user.setPresence({
      activities: [{ name: '/help | Ticket Bot', type: 3 }],
      status: 'online',
    });
  },
};
