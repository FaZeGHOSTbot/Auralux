const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const User = require("../models/user");
const fs = require("fs");
const path = require("path");
const GlobalCounter = require("../models/globalCounter");
const GuildConfig = require("../models/guildConfig");
const { levelUpCard } = require("../utils/leveling"); // adjust path if needed




// 🔁 Load ALL character JSONs from data/characters/
const charactersDir = path.join(__dirname, "../data/characters");
let cardsData = [];


try {
  const files = fs.readdirSync(charactersDir).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const filePath = path.join(charactersDir, file);
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (Array.isArray(jsonData)) {
      // If the file exports an array of characters
      cardsData.push(...jsonData);
    } else {
      // If the file exports a single character object
      cardsData.push(jsonData);
    }
  }
  console.log(`✅ Loaded ${cardsData.length} character(s) from data/characters/`);
} catch (err) {
  console.error("❌ Error loading character files:", err);
  cardsData = [];
}

// 🎚️ Rarity system
const RARITY_LEVELS = {
  mortal:    { chance: 60,  color: 0x3498db, emoji: "🩶", multiplier: 1.0 },
  ascended:  { chance: 30,  color: 0x3498db, emoji: "💠", multiplier: 1.7 },
  legendary: { chance: 3,   color: 0x3498db, emoji: "🔥", multiplier: 2.5 }, // NEW
  mythic:    { chance: 0.5,   color: 0x3498db, emoji: "💜", multiplier: 3.8 },
  divine:    { chance: 0.1, color: 0x3498db, emoji: "✨", multiplier: 5.5 },
};

// 🎲 Random rarity generator
function getRandomRarity() {
  const entries = Object.entries(RARITY_LEVELS);
  const total = entries.reduce((s, [, v]) => s + v.chance, 0);
  const rand = Math.random() * total;
  let cumulative = 0;
  for (const [rarity, { chance }] of entries) {
    cumulative += chance;
    if (rand <= cumulative) return rarity;
  }
  // fallback (shouldn't happen) 
  return entries[0][0];
}


// 🧬 Soul Potential with ultra-rare ends (0.1–99.99%)
function gaussianRandom(mean = 0, stdDev = 1) {
  // Box-Muller
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stdDev + mean;
}

function gaussianRandom(mean = 0, stdDev = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stdDev + mean;
}

function getRandomSP() {
  const sigma = 9; // increased from 7 → wider tails
  let sp = gaussianRandom(50, sigma);

  // increased rare-extreme chance
  if (Math.random() < 0.004) { // 0.4% total (0.2% low + 0.2% high)
    sp = Math.random() < 0.5
      ? Math.random() * 5         // 0–5%
      : 95 + Math.random() * 5;   // 95–100%
  }

  return Math.min(99.99, Math.max(0.1, parseFloat(sp.toFixed(2))));
}




// 🩵 Visual Soul bar
function getSPBar(sp) {
  if (sp < 10) return "⚫ Cursed Fragment";
  if (sp < 25) return "🟣 Dim Soul";
  if (sp < 50) return "🔵 Balanced Soul";
  if (sp < 75) return "🟢 Radiant Soul";
  if (sp < 90) return "🟡 Blessed Soul";
  return "🔴 God-Tier Soul";
}

// 📈 Scale stats using rarity × SP × Level
function scaleStats(baseStats, sp, level, rarity) {
  const rarityPower = {
    mortal: 1.0,
    ascended: 1.6,
    legendary: 2.4,
    mythic: 3.5,
    divine: 4.5,
  }[rarity] || 1.0;

  // Level scaling — exponential but capped (smooth at start, sharp near 100)
  const levelMultiplier = 1 + Math.pow(level / 100, 1.3) * 2.5;

  // SP scaling — gives individuality (0.5x to 1.5x)
  const spMultiplier = 0.5 + sp / 100;

  const scaled = {};
  for (const [key, val] of Object.entries(baseStats)) {
    scaled[key] = Math.floor(val * rarityPower * levelMultiplier * spMultiplier);
  }

  return scaled;
}



class SpawnManager {
constructor(client) {
  this.client = client;
  this.spawnedCards = new Map();
  this.messageCounter = new Map();
  this.lastMessageTime = new Map();
  this.IDLE_THRESHOLD = 60 * 60 * 1000; // 1 minute
  this.AUTO_SPAWN_INTERVAL = 30 * 60 * 1000; // check every 30 sec (recommended)

  this.client.once("ready", async () => {
    console.log("✅ Idle spawn system activated.");

    // ✅ Wait a few seconds for guilds to cache fully
    setTimeout(() => {
      console.log(`💤 Tracking ${this.client.guilds.cache.size} guilds for idle spawns.`);
      setInterval(() => this.checkIdleServers(), this.AUTO_SPAWN_INTERVAL);
    }, 5000);
  });
}



  async handleMessage(message) {
  if (message.author.bot || !message.guild) return;
  this.lastMessageTime.set(message.guild.id, Date.now());

  const guildId = message.guild.id;
  const count = (this.messageCounter.get(guildId) || 0) + 1;
  this.messageCounter.set(guildId, count);

  const randomInterval = Math.floor(Math.random() * 3) + 5;
  if (count >= randomInterval) {
    this.messageCounter.set(guildId, 0);

    // 🧩 Check if a custom spawn channel is set
    const config = await GuildConfig.findOne({ guildId });
    let spawnChannel = message.channel; // default to current

    if (config?.spawnChannelId) {
      const channel = message.guild.channels.cache.get(config.spawnChannelId);
      if (channel && channel.isTextBased()) spawnChannel = channel;
    }

    await this.spawnCard(spawnChannel);
    await User.updateMany(
  { "cards.levelValue": { $exists: true } },
  { $rename: { "cards.$[].levelValue": "cards.$[].level" } }
);

  }
}


async checkIdleServers() {
  const now = Date.now();

  for (const [guildId, guild] of this.client.guilds.cache) {
    const lastActive = this.lastMessageTime.get(guildId) || 0;
    const idleTime = now - lastActive;

    // 🆕 Treat never-active guilds as idle immediately
    if (lastActive === 0 || idleTime >= this.IDLE_THRESHOLD) {
      const config = await GuildConfig.findOne({ guildId });
let defaultChannel = null;

if (config?.spawnChannelId) {
  defaultChannel = guild.channels.cache.get(config.spawnChannelId);
} else {
  defaultChannel =
    guild.systemChannel ||
    guild.channels.cache.find(
      ch =>
        ch.isTextBased() &&
        ch.permissionsFor(guild.members.me)?.has("SendMessages")
    );
}


      if (!defaultChannel) continue;

      const activeSpawn = this.spawnedCards.get(defaultChannel.id);
      if (activeSpawn && !activeSpawn.claimed) continue;

      console.log(`[SPAWN] Idle spawn triggered in ${guild.name}`);
      await this.spawnCard(defaultChannel);

      // 🕒 Reset activity so it doesn’t spawn again instantly
      this.lastMessageTime.set(guildId, now);
    }
  }
}



async spawnCard(channel, forcedData = null) {
    if (forcedData?.forced) {
    const { card, race, rarity, level } = forcedData;
    const raceData = card.races[race];
    const rarityInfo = RARITY_LEVELS[rarity];

    const imageUrl =
      forcedData.imageUrl ||
      raceData.rarities?.[rarity]?.image ||
      raceData.image ||
      null;

    const spawnEmbed = new EmbedBuilder()
      .setTitle(`💫 ${rarityInfo.emoji} A chosen one appears!`)
      .setDescription(
        `👑 **${card.name}** (${rarity.toUpperCase()})\n🧬 Race: ${race.charAt(0).toUpperCase() + race.slice(1)}\n⚡ Level: ${level}`
      )
      .setImage(imageUrl)
      .setColor(rarityInfo.color)
      .setFooter({ text: "This card was summoned by divine command." });

    const claimButton = new ButtonBuilder()
      .setCustomId(`claim_${channel.id}`)
      .setLabel("⚡ Claim")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(claimButton);

    const msg = await channel.send({ embeds: [spawnEmbed], components: [row] });

    this.spawnedCards.set(channel.id, {
      card,
      race,
      rarity,
      level,
      imageUrl,
      messageId: msg.id,
      claimed: false,
      forced: true,
    });

    return; // ✅ Exit early (skip random logic)
  }

  const randomCardData = cardsData[Math.floor(Math.random() * cardsData.length)];
  const rarity = getRandomRarity(); // still roll actual rarity secretly
  const availableRaces = Object.keys(randomCardData.races);
  const chosenRace = availableRaces[Math.floor(Math.random() * availableRaces.length)];
  const raceData = randomCardData.races[chosenRace];

  const rarityInfo = RARITY_LEVELS[rarity];

  // 🟣 Always use mortal image for the spawn (keep surprise)
  const mortalImage = raceData.rarities?.mortal?.image || null;

  const spawnEmbed = new EmbedBuilder()
    .setTitle(`🌫️ A mysterious presence has appeared!`)
    .setDescription(
      `🧬 **Race:** ${chosenRace.charAt(0).toUpperCase() + chosenRace.slice(1)}\n` +
      `⚡ Be the first to claim this unknown champion!`
    )
    .setImage(mortalImage) // always mortal variant
    .setColor(0x5865F2) // neutral color, e.g. Discord blurple
    .setFooter({ text: "Click '⚡ Claim' to uncover its true power!" });

  const claimButton = new ButtonBuilder()
    .setCustomId(`claim_${channel.id}`)
    .setLabel("⚡ Claim")
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(claimButton);

  const msg = await channel.send({ embeds: [spawnEmbed], components: [row] });

  this.spawnedCards.set(channel.id, {
    card: randomCardData,
    race: chosenRace,
    rarity, // still store actual rarity for claim
    messageId: msg.id,
    claimed: false,
  });
}


async handleClaim(interaction) {
  try {
  if (interaction.replied || interaction.deferred) return; // already handled
  await interaction.deferReply({ flags: 64 }).catch(() => {});


    const channelId = interaction.channel.id;
    const spawnData = this.spawnedCards.get(channelId);

    if (!spawnData || spawnData.claimed) {
      return await interaction.editReply({ content: "❌ There’s no claimable card right now!" });
    }

    const { card, race, rarity,level,forced } = spawnData;
    const raceVariant = card.races[race];

    // 🎲 Generate random stats
    const sp = getRandomSP();
    const cardLevel = forced ? (level || 1) : Math.floor(Math.random() * 10) + 1;

    const scaledStats = scaleStats(raceVariant.baseStats, sp, cardLevel, rarity);

      // 📘 Fetch or create user
      let user = await User.findOne({ userId: interaction.user.id });
      if (!user) {
        user = new User({ userId: interaction.user.id, userCardCounter: 0 });
      }

    // 🌐 Get next global card ID
    const globalCounter = await GlobalCounter.findOneAndUpdate(
      { name: "globalCardId" },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const globalCardId = globalCounter.value;

    // 🔢 Increment user's card counter
    user.userCardCounter = (user.userCardCounter || 0) + 1;

    // 🆕 Create new card entry
    const newCard = {
      globalCardId,
      userCardId: user.userCardCounter,
      name: card.name,
      race, // keep spawned race, not user’s
      rarity,
      imageUrl: raceVariant.rarities[rarity]?.image || raceVariant.image || null,
      soulPotential: sp,
      stats: scaledStats,
      level: cardLevel,
    };

    user.cards.push(newCard);
    await user.save();

// 🌟 Award XP to user's selected champion (primary card)
if (user.selectedCardId) {
  const selectedCard = user.cards.find(c => c.userCardId === user.selectedCardId);

  if (selectedCard) {
    // 💎 Dynamic XP Reward Table (rarer cards = more XP)
    const rarityXPRewards = {
      mortal: 150,
      ascended: 500,
      legendary: 1500,
      mythic: 4000,
      divine: 9000,
    };

    // Base XP from rarity of the claimed card
    let gainedXP = rarityXPRewards[rarity] || 100;

    // 🌈 Bonus from SP of the claimed card (0.5× to 1.5×)
    const spMultiplier = 0.5 + (sp / 100);
    gainedXP = Math.floor(gainedXP * spMultiplier);

    // 🧮 Leveling logic
    const oldLevel = selectedCard.level;
    levelUpCard(selectedCard, gainedXP);
    await user.save();

    // ✨ Public XP message
    let msg = `💫 **${interaction.user.username}'s** champion **${selectedCard.name}** gained **${gainedXP.toLocaleString()} XP**!`;
    if (selectedCard.level > oldLevel)
      msg += ` 🎉 It leveled up to **Lv. ${selectedCard.level}**!`;

    await interaction.channel.send(msg);
  }
} else {
  // 🚫 No champion selected
  await interaction.channel.send(
    `⚠️ **${interaction.user.username}**, you don’t have a champion selected!\nUse **/champion select <id>** to set one and start gaining XP.`
  );
}



    // 🧾 Mark spawn as claimed
    spawnData.claimed = true;
    const rarityInfo = RARITY_LEVELS[rarity];

    // 🖼️ Update spawn embed to show claimed
    const claimedEmbed = new EmbedBuilder()
      .setTitle(`${rarityInfo.emoji} ${card.name} has been claimed!`)
      .setDescription(
        `🧬 **Race:** ${race.charAt(0).toUpperCase() + race.slice(1)}\n` +
        `👑 **Claimed by:** ${interaction.user.username}`
      )
      .setImage(raceVariant.rarities[rarity]?.image)
      .setColor(rarityInfo.color)
      .setFooter({ text: "Added to the collection!" });

    // ✏️ Update original spawn message
    await interaction.channel.messages
      .fetch(spawnData.messageId)
      .then(msg => msg.edit({ embeds: [claimedEmbed], components: [] }))
      .catch(() => null);

    // 🎉 Notify the channel
    const rarityDisplay = `${rarityInfo.emoji} **${rarity.toUpperCase()}**`;
    await interaction.channel.send(
      `🎉 **${interaction.user.username}** has claimed **${card.name}** ` +
      `(${race.charAt(0).toUpperCase() + race.slice(1)}) — ${rarityDisplay} card!\n` +
      `🧬 **Soul Potential:** ${sp}% | 🗡️ **Level:** ${cardLevel}`
    );

    await interaction.editReply({
      content: `✅ You successfully claimed **${card.name}** (${rarity.toUpperCase()})!`,
    });

    this.spawnedCards.delete(channelId);

} catch (err) {
  console.error("❌ Interaction Error:", err);
  try {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: "⚠️ Something went wrong.",
        flags: 64, // ephemeral
      });
    } else {
      await interaction.editReply({ content: "⚠️ Something went wrong (handled gracefully)." });
    }
  } catch (e) {
    console.warn("⚠️ Failed to send error reply:", e.message);
  }
}

}



}

module.exports = SpawnManager;
