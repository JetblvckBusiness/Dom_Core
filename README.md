# 🤖 Discord Bot — Full Featured

A fully-featured Discord bot with **Tickets**, **Applications**, **Giveaways**, **Polls**, **Moderation**, **Audit Logs**, and more — built with [discord.js v14](https://discord.js.org/).

---

## ✨ Features

### 🎫 Tickets
- Dropdown panel with multiple ticket categories (Support, Billing, Bug Report, Partnership, Report)
- Auto-creates private channels per user
- Staff-only close button
- Add/remove users from tickets
- Audit log on open/close

### 📋 Applications
- Full modal-based application form (5 questions)
- Staff review panel with Accept/Deny buttons
- Auto-DM applicants on decision
- Audit log for reviews

### 🎉 Giveaways
- Start giveaways with custom prize, duration, and winner count
- Live entry counter button
- Toggle entry (enter/leave)
- Auto-end with winner announcement
- Manual end, reroll, and list active giveaways

### 📊 Polls
- Up to 4 options
- Live vote count with visual progress bars
- Optional anonymous mode (hides counts until poll ends)
- Optional auto-end with duration
- Vote changing supported

### 🔨 Moderation
| Command | Description |
|--------|-------------|
| `/mod ban` | Ban a member with optional message purge |
| `/mod kick` | Kick a member |
| `/mod timeout` | Timeout a member (in minutes) |
| `/mod untimeout` | Remove a member's timeout |
| `/mod warn` | Warn a member |
| `/mod warnings` | View warnings for a user |
| `/mod clearwarnings` | Clear all warnings for a user |
| `/mod purge` | Bulk delete messages (optionally filter by user) |
| `/mod lockdown` | Lock or unlock a channel |
| `/unban` | Unban a user by ID |
| `/slowmode` | Set channel slowmode |

### 🛠️ Utilities
| Command | Description |
|--------|-------------|
| `/embed` | Send a custom embed via a modal |
| `/stats` | View detailed server statistics |
| `/userinfo` | View info about any user |
| `/help` | View all commands |

### 📋 Audit Logs
Automatically logs:
- ✅ Member joins
- 🚪 Member leaves
- ✏️ Message edits
- 🗑️ Message deletes
- All moderation actions

---

## 🚀 Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v16.9.0 or higher
- A Discord bot token ([create one here](https://discord.com/developers/applications))

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Copy `.env.example` to `.env` and fill in the values:
```bash
cp .env.example .env
```

```env
BOT_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id
GUILD_ID=your_server_id

# Optional: Channel/Role IDs for full functionality
TICKET_CATEGORY_ID=
LOG_CHANNEL_ID=
GIVEAWAY_CHANNEL_ID=
APPLICATION_CHANNEL_ID=
STAFF_ROLE_ID=
MOD_ROLE_ID=
ADMIN_ROLE_ID=
```

### 4. Deploy Slash Commands
```bash
node deploy-commands.js
```

### 5. Start the Bot
```bash
node index.js
```

---

## 📁 Project Structure

```
discord-bot/
├── index.js                        # Bot entry point
├── deploy-commands.js              # Slash command deployer
├── .env.example                    # Environment template
├── package.json
└── src/
    ├── commands/
    │   ├── tickets/
    │   │   └── ticket.js           # Ticket system
    │   ├── applications/
    │   │   └── application.js      # Application system
    │   ├── giveaways/
    │   │   └── giveaway.js         # Giveaway system
    │   └── moderation/
    │       ├── mod.js              # Core moderation commands
    │       ├── embed.js            # Custom embed builder
    │       ├── stats.js            # Server statistics
    │       ├── poll.js             # Poll system
    │       ├── help.js             # Help command
    │       ├── userinfo.js         # User info command
    │       ├── unban.js            # Unban command
    │       └── slowmode.js         # Slowmode command
    ├── events/
    │   ├── ready.js                # Bot ready event
    │   ├── interactionCreate.js    # Main interaction router
    │   ├── guildMemberAdd.js       # Member join log
    │   ├── guildMemberRemove.js    # Member leave log
    │   ├── messageDelete.js        # Message delete log
    │   └── messageUpdate.js        # Message edit log
    └── utils/
        └── helpers.js              # Shared utility functions
```

---

## ⚙️ Required Bot Permissions
When adding your bot to a server, grant these permissions:
- `Read Messages / View Channels`
- `Send Messages`
- `Embed Links`
- `Manage Messages`
- `Manage Channels`
- `Manage Roles`
- `Kick Members`
- `Ban Members`
- `Moderate Members` (for timeout)
- `Read Message History`

Or just use **Administrator** for development.

---

## 📝 Required Intents
In the [Discord Developer Portal](https://discord.com/developers/applications), enable:
- ✅ `SERVER MEMBERS INTENT`
- ✅ `MESSAGE CONTENT INTENT`
- ✅ `PRESENCE INTENT` (for userinfo status)

---

## 💡 Tips
- Run `node deploy-commands.js` every time you add or change slash commands
- Set `LOG_CHANNEL_ID` to enable audit logs
- Set `TICKET_CATEGORY_ID` to organize ticket channels under a category
- Warnings are stored **in-memory** — they reset on bot restart. For persistence, integrate a database like SQLite or MongoDB.
