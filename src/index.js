require("dotenv").config();
const BOT_ACTIVE = String(process.env.BOT_ACTIVE || "").toLowerCase() === "false";
const fs = require("fs");
const path = require("path");
const { Client, Collection, IntentsBitField, REST, Routes, Partials } = require("discord.js");

const express = require("express");
const app = express();

// Respond to both HEAD and GET requests
app.use("/", (req, res) => {
  res.status(200).send(`Auralux bot is running! Last ping: ${new Date().toLocaleString()}`);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server is running on port " + (process.env.PORT || 3000));
});

// Database + Models
const connectDB = require("./database");
const User = require("./models/user");
connectDB();

// ---------------- Discord Client ----------------
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

// ---------------- Load Event Logs ----------------

// 🔥 Load interactionCreate event manually
client.on("interactionCreate", (interaction) => 
  require("./events/interactionCreate")(client, interaction)
);


// 🟢 NEW: SpawnManager system
const SpawnManager = require("./utils/spawnManager");
const spawnManager = new SpawnManager(client);
client.spawnManager = spawnManager;

// 🟢 NEW: Hook into message activity for random spawns

// ---------------- Load Commands ----------------
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");

function getCommandFiles(dir) {
  let files = [];
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      files = files.concat(getCommandFiles(filePath));
    } else if (file.endsWith(".js")) {
      files.push(filePath);
    }
  }
  return files;
}

console.log("📦 Loading slash commands...");
const commandFiles = getCommandFiles(commandsPath);
const commandsData = [];

for (const file of commandFiles) {
  const command = require(file);
  if (!command?.data?.name) {
    console.warn(`⚠️ Skipping invalid command file: ${file}`);
    continue;
  }

  client.commands.set(command.data.name, command);
  commandsData.push(command.data.toJSON());

  const relativePath = path.relative(commandsPath, file);
  const folder = path.dirname(relativePath);
  const folderDisplay = folder === "." ? "" : `[${folder}] `;
  console.log(`✅ ${folderDisplay}/${command.data.name}`);
}

console.log(`✅ Total commands loaded: ${client.commands.size}\n`);

// ---------------- Deploy Commands ----------------
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

async function deployCommands() {
  try {
    if (process.env.GUILD_ID) {
      console.log("📡 Registering slash commands to test server...");
      const data = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commandsData }
      );

      console.log(`✅ Successfully registered ${data.length} commands to guild ${process.env.GUILD_ID}`);
      console.log("🔍 Commands registered:");
      for (const cmd of data) console.log(`   • /${cmd.name}`);
      console.log("─────────────────────────────");
    }

    if (process.env.DEPLOY_GLOBAL === "true") {
      console.log("🌐 Registering global commands...");
      const data = await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commandsData }
      );

      console.log(`✅ Successfully registered ${data.length} global commands.`);
      for (const cmd of data) console.log(`   • /${cmd.name}`);
      console.log("─────────────────────────────");
    }
  } catch (err) {
    console.error("❌ Error registering slash commands:", err);
  }
}

deployCommands();

// ---------------- Events ----------------
client.once("ready", async () => {
  console.log(`🤖 ${client.user.tag} is online!`);

  for (const [guildId, guild] of client.guilds.cache) {
    await guild.members.fetch();
    for (const [memberId, member] of guild.members.cache) {
      if (member.user.bot) continue;
      let user = await User.findOne({ userId: memberId, guildId });
      if (!user) {
        user = new User({ userId: memberId, guildId, xp: 0, level: 1 });
        await user.save();
      }
    }
  }
});


// XP System
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  try {
    // Handle XP system normally
    const xpGain = Math.floor(Math.random() * 10) + 5;
    let user = await User.findOne({ userId: message.author.id, guildId: message.guild.id });
    if (!user) user = new User({ userId: message.author.id, guildId: message.guild.id, xp: 0, level: 1 });

    user.xp += xpGain;
    const xpNeeded = user.level * 100;
    if (user.xp >= xpNeeded) {
      user.level++;
      user.xp -= xpNeeded;
      message.channel.send(`🎉 <@${message.author.id}> leveled up to **Level ${user.level}**!`);
    }
    await user.save();

    // 🔥 Let the spawn manager handle random card spawning
    await spawnManager.handleMessage(message);
  } catch (err) {
    console.error("⚠️ Error in messageCreate event:", err);
  }
});

// ---------------- Login ----------------
if (BOT_ACTIVE) {
  client.login(process.env.TOKEN);
  console.log("✅ Bot is active and logging in...");
} else {
  console.log("⚠️ Bot is in maintenance mode. Not logging in.");
}
