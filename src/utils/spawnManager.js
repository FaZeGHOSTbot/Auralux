const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const User = require("../models/user");
const fs = require("fs");
const path = require("path");
const GlobalCounter = require("../models/globalCounter");


const cardsFile = path.join(__dirname, "../data/characters.json");
const cardsData = JSON.parse(fs.readFileSync(cardsFile, "utf8"));

// 🎚️ Rarity system
const RARITY_LEVELS = {
  mortal: { chance: 60, color: 0x95a5a6, emoji: "🩶", multiplier: 1.0 },
  ascended: { chance: 33, color: 0x3498db, emoji: "💠", multiplier: 1.2 },
  mythic: { chance: 6, color: 0x9b59b6, emoji: "💜", multiplier: 1.5 },
  divine: { chance: 1, color: 0xf1c40f, emoji: "✨", multiplier: 2.0 },
};

// 🎲 Random rarity generator
function getRandomRarity() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const [rarity, { chance }] of Object.entries(RARITY_LEVELS)) {
    cumulative += chance;
    if (rand <= cumulative) return rarity;
  }
  return "mortal";
}

// 🧬 Soul Potential with ultra-rare ends (0.1–99.99%)
function getRandomSP() {
  const extremeChance = Math.random();
  let sp;
  if (extremeChance < 0.05) {
    // 5% chance to roll extremely high or low
    sp = Math.random() < 0.5
      ? Math.random() * 5 // 0–5%
      : 95 + Math.random() * 5; // 95–100%
  } else {
    // Normal mid rolls (bell-like)
    const base = Math.random() - 0.5; // -0.5 to +0.5
    const curved = Math.pow(base * 2, 3); // cubic curve
    sp = 50 + curved * 50;
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
  const rarityMultiplier = RARITY_LEVELS[rarity]?.multiplier || 1.0;
  const spMultiplier = 0.5 + (sp / 100); // SP affects 0.5x → 1.5x
  const levelMultiplier = 1 + (level - 1) * 0.05; // +5% per level
  const scaled = {};
  for (const [key, val] of Object.entries(baseStats)) {
    scaled[key] = Math.floor(val * spMultiplier * levelMultiplier * rarityMultiplier);
  }
  return scaled;
}

class SpawnManager {
  constructor(client) {
    this.client = client;
    this.spawnedCards = new Map();
    this.messageCounter = new Map();
  }

  async handleMessage(message) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const count = (this.messageCounter.get(guildId) || 0) + 1;
    this.messageCounter.set(guildId, count);

    const randomInterval = Math.floor(Math.random() * 3) + 5;
    if (count >= randomInterval) {
      this.messageCounter.set(guildId, 0);
      await this.spawnCard(message.channel);
    }
  }

  async spawnCard(channel) {
    const randomCardData = cardsData[Math.floor(Math.random() * cardsData.length)];
    const rarity = getRandomRarity();
    const availableRaces = Object.keys(randomCardData.races);
    const chosenRace = availableRaces[Math.floor(Math.random() * availableRaces.length)];
    const raceData = randomCardData.races[chosenRace];

    const rarityInfo = RARITY_LEVELS[rarity];

    const spawnEmbed = new EmbedBuilder()
      .setTitle(`${rarityInfo.emoji} A mysterious presence has showed!`)
      .setDescription(
        `🧬 **Race:** ${chosenRace.charAt(0).toUpperCase() + chosenRace.slice(1)}\n` +
        `⚡ Be the first to claim this champion!`
      )
      .setImage(raceData.image)
      .setColor(rarityInfo.color)
      .setFooter({ text: "Click '⚡ Claim' to add to your collection!" });

    const claimButton = new ButtonBuilder()
      .setCustomId(`claim_${channel.id}`)
      .setLabel("⚡ Claim")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(claimButton);

    const msg = await channel.send({ embeds: [spawnEmbed], components: [row] });

    this.spawnedCards.set(channel.id, {
      card: randomCardData,
      race: chosenRace,
      rarity,
      messageId: msg.id,
      claimed: false,
    });
  }

  async handleClaim(interaction, userRace) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const channelId = interaction.channel.id;
      const spawnData = this.spawnedCards.get(channelId);

      if (!spawnData || spawnData.claimed) {
        return await interaction.editReply({ content: "❌ There’s no claimable card right now!" });
      }

      const { card, race, rarity } = spawnData;
      const raceKeys = Object.keys(card.races).map(r => r.toLowerCase());
      const normalizedUserRace = userRace.toLowerCase();

      if (!raceKeys.includes(normalizedUserRace)) {
        return await interaction.editReply({
          content: `${card.name} doesn’t have a ${userRace} variant, so you can’t claim this one!`,
        });
      }

      const matchedRaceKey = Object.keys(card.races).find(
        r => r.toLowerCase() === normalizedUserRace
      );
      const raceVariant = card.races[matchedRaceKey];

      const sp = getRandomSP();
      const level = Math.floor(Math.random() * 10) + 1;
      const scaledStats = scaleStats(raceVariant.stats, sp, level, rarity);

      const user = await User.findOneAndUpdate(
        { userId: interaction.user.id, guildId: interaction.guild.id },
        { $setOnInsert: { userId: interaction.user.id, guildId: interaction.guild.id, userCardCounter: 0 } },
        { upsert: true, new: true }
      );
        // 🧭 Get next global card ID
let globalCounter = await GlobalCounter.findOneAndUpdate(
  { name: "globalCardId" },
  { $inc: { value: 1 } },
  { new: true, upsert: true }
);

const globalCardId = globalCounter.value;

// 🧍 Increment user's personal card counter safely
user.userCardCounter = (user.userCardCounter || 0) + 1;

// 🆕 Create the card with both IDs
const newCard = {
  globalCardId,              // 🌍 global numeric ID
  userCardId: user.userCardCounter, // 👤 per-user numeric ID
  name: card.name,
  race: userRace,
  rarity,
  imageUrl: raceVariant.image,
  soulPotential: sp,
  stats: scaledStats,
  level,
};

// 💾 Save card and user
user.cards.push(newCard);
await user.save();

      spawnData.claimed = true;
      const rarityInfo = RARITY_LEVELS[rarity];

      const claimedEmbed = new EmbedBuilder()
        .setTitle(`${rarityInfo.emoji} ${interaction.user.username} claimed **${card.name}**!`)
        .setDescription(
          `🧬 **Race:** ${userRace.charAt(0).toUpperCase() + userRace.slice(1)}\n` +
          `💎 **Rarity:** ${rarity.toUpperCase()}\n` +
          `🔥 **Soul Potential:** ${sp}% (${getSPBar(sp)})\n` +
          `⚔️ **Level:** ${level}\n`+
          `🆔 **Global ID:** #${globalCounter.value} | **Your Card ID:** #${user.userCardCounter}`
        )
        .setImage(raceVariant.image)
        .setColor(rarityInfo.color)
        .setFooter({ text: "Added to your collection!" });

      await interaction.channel.messages
        .fetch(spawnData.messageId)
        .then(msg => msg.edit({ embeds: [claimedEmbed], components: [] }))
        .catch(() => null);

      await interaction.editReply({
        content: `✅ You successfully claimed **${card.name}** (${rarity.toUpperCase()})!`,
      });

      this.spawnedCards.delete(channelId);
    } catch (err) {
      console.error("❌ Interaction Error:", err);
      if (!interaction.replied) {
        await interaction.reply({
          content: "⚠️ Something went wrong.",
          ephemeral: true,
        }).catch(() => null);
      }
    }
  }
}

module.exports = SpawnManager;
