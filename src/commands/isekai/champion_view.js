// src/commands/general/carddex.js
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// Load all cards (same logic as in spawnManager)
const charactersDir = path.join(__dirname, "../../data/characters");
let cardsData = [];

try {
  const files = fs.readdirSync(charactersDir).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const filePath = path.join(charactersDir, file);
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (Array.isArray(jsonData)) cardsData.push(...jsonData);
    else cardsData.push(jsonData);
  }
  console.log(`✅ Loaded ${cardsData.length} characters for carddex`);
} catch (err) {
  console.error("❌ Error loading character files:", err);
}

// Same rarity table as spawnManager
const RARITY_LEVELS = {
  mortal: { chance: 60, color: 0x95a5a6, emoji: "🩶", multiplier: 1.0 },
  ascended: { chance: 30, color: 0x00ffff, emoji: "💠", multiplier: 1.2 },
  legendary: { chance: 3, color: 0xffa500, emoji: "🔥", multiplier: 1.5 },
  mythic: { chance: 0.5, color: 0x9b59b6, emoji: "💜", multiplier: 2.0 },
  divine: { chance: 0.1, color: 0xf1c40f, emoji: "✨", multiplier: 2.5 },
};

// Scale stats using rarity multiplier (same idea as spawnManager)
function scaleStats(baseStats, rarity) {
  const mult = RARITY_LEVELS[rarity]?.multiplier || 1.0;
  const scaled = {};
  for (const [key, val] of Object.entries(baseStats)) {
    scaled[key] = Math.floor(val * mult);
  }
  return scaled;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("champion-view")
    .setDescription("View information about a character from the Carddex")
    .addStringOption(option =>
      option
        .setName("name")
        .setDescription("Name of the character")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = cardsData.map(c => c.name);
    const filtered = choices.filter(c => c.toLowerCase().includes(focused));
    await interaction.respond(
      filtered.slice(0, 25).map(c => ({ name: c, value: c }))
    );
  },

  async execute(interaction) {
    const name = interaction.options.getString("name");
    const card = cardsData.find(c => c.name.toLowerCase() === name.toLowerCase());

    if (!card) {
      return interaction.reply({
        content: `❌ No card named **${name}** found.`,
        ephemeral: true,
      });
    }

    const races = Object.keys(card.races);
    const rarities = Object.keys(RARITY_LEVELS);

    const createEmbed = (race, rarity) => {
      const variant = card.races[race];
      const baseStats = variant.baseStats;
      const scaledStats = scaleStats(baseStats, rarity);
      const rarityInfo = RARITY_LEVELS[rarity];
      const imageUrl =
        variant.rarities?.[rarity]?.image || variant.image || null;

      return new EmbedBuilder()
        .setTitle(`${card.name} — ${race.charAt(0).toUpperCase() + race.slice(1)} (${rarity.toUpperCase()})`)
        .setColor(rarityInfo.color)
        .setDescription(
          `${rarityInfo.emoji} **${rarity.toUpperCase()} ${race}** variant of ${card.name}`
        )
        .addFields(
          { name: "🗡️ Attack", value: `${scaledStats.attack}`, inline: true },
          { name: "🛡️ Defense", value: `${scaledStats.defense}`, inline: true },
          { name: "💨 Speed", value: `${scaledStats.speed}`, inline: true },
          { name: "❤️ HP", value: `${scaledStats.hp}`, inline: true },
          { name: "🔮 Magic", value: `${scaledStats.magic}`, inline: true },
          { name: "👁️ Spirit", value: `${scaledStats.spirit}`, inline: true },
        )
        .setImage(imageUrl)
        .setFooter({
          text: `Champion Entry — ${card.name} (${race}, ${rarity})`,
        })
        .setTimestamp();
    };

    const defaultRace = races[0];
    const defaultRarity = "mortal";
    const embed = createEmbed(defaultRace, defaultRarity);

    // Dropdown for race & rarity selection
    const raceSelect = new StringSelectMenuBuilder()
      .setCustomId(`race_${interaction.user.id}`)
      .setPlaceholder("Select race")
      .addOptions(
        races.map(r => ({
          label: r.charAt(0).toUpperCase() + r.slice(1),
          value: r,
        }))
      );

    const raritySelect = new StringSelectMenuBuilder()
      .setCustomId(`rarity_${interaction.user.id}`)
      .setPlaceholder("Select rarity")
      .addOptions(
        rarities.map(r => ({
          label: r.charAt(0).toUpperCase() + r.slice(1),
          value: r,
        }))
      );

    let currentRace = defaultRace;
    let currentRarity = defaultRarity;

    const row1 = new ActionRowBuilder().addComponents(raceSelect);
    const row2 = new ActionRowBuilder().addComponents(raritySelect);

    const msg = await interaction.reply({
      embeds: [embed],
      components: [row1, row2],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: 3,
      time: 120000,
    });

    collector.on("collect", async i => {
      if (i.user.id !== interaction.user.id)
        return i.reply({
          content: "❌ Only the original user can use this menu.",
          ephemeral: true,
        });

      if (i.customId.startsWith("race_")) currentRace = i.values[0];
      else if (i.customId.startsWith("rarity_")) currentRarity = i.values[0];

      const updatedEmbed = createEmbed(currentRace, currentRarity);
      await i.update({ embeds: [updatedEmbed], components: [row1, row2] });
    });

    collector.on("end", async () => {
      const disabledRow1 = new ActionRowBuilder().addComponents(
        raceSelect.setDisabled(true)
      );
      const disabledRow2 = new ActionRowBuilder().addComponents(
        raritySelect.setDisabled(true)
      );
      await msg.edit({ components: [disabledRow1, disabledRow2] }).catch(() => {});
    });
  },
};
