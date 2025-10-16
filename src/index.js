require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, Collection, IntentsBitField, REST, Routes } = require("discord.js");

const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Web server running on port 3000'));


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
  ],
});

// ---------------- Load Event Logs ----------------
const logs = require("./events/log");
logs(client);

// SYBAU command
const messageCreateHandler = require("./events/messageCreate");
messageCreateHandler(client);

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
    // Guild commands (instant update)
    if (process.env.GUILD_ID) {
      console.log("📡 Registering commands to test server...");
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commandsData }
      );
      console.log("✅ Commands registered to test server!");
    }

    // Global commands (optional)
    if (process.env.DEPLOY_GLOBAL === "true") {
      console.log("🌐 Registering global commands...");
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsData });
      console.log("✅ Global commands registered!");
    }
  } catch (err) {
    console.error("❌ Error registering commands:", err);
  }
}

// Run deploy at startup
deployCommands();

// ---------------- Events ----------------

// Bot Ready
client.once("ready", async () => {
  console.log(`🤖 ${client.user.tag} is online!`);

  // Ensure XP profiles exist
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

// Handle Slash Commands
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  console.log(`⚡ Executing command: /${interaction.commandName} (User: ${interaction.user.tag})`);

  try {
    await command.execute(interaction, client);
    console.log(`✅ Successfully executed: /${interaction.commandName}`);
  } catch (error) {
    console.error(`❌ Error executing /${interaction.commandName}:`, error);
    await interaction.reply({ content: "❌ There was an error executing this command!", ephemeral: true });
  }
});

// XP System
client.on("messageCreate", async msg => {
  if (msg.author.bot || !msg.guild) return;

  const xpGain = Math.floor(Math.random() * 10) + 5;
  let user = await User.findOne({ userId: msg.author.id, guildId: msg.guild.id });
  if (!user) user = new User({ userId: msg.author.id, guildId: msg.guild.id, xp: 0, level: 1 });

  user.xp += xpGain;
  const xpNeeded = user.level * 100;

  if (user.xp >= xpNeeded) {
    user.level++;
    user.xp -= xpNeeded;
    msg.channel.send(`🎉 <@${msg.author.id}> leveled up to **Level ${user.level}**!`);
  }

  await user.save();
});

// ---------------- Login ----------------
client.login(process.env.TOKEN);
