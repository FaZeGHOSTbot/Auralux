const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const charactersDir = path.join(__dirname, "../../data/characters");

function loadCharacters() {
  const files = fs.readdirSync(charactersDir).filter(f => f.endsWith(".json"));
  const data = [];
  for (const file of files) {
    const filePath = path.join(charactersDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (Array.isArray(content)) {
        data.push(...content.filter(c => c && c.name));
      } else if (content && content.name) {
        data.push(content);
      }
    } catch (err) {
      console.error(`❌ Error parsing ${file}:`, err);
    }
  }
  return data;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("godspawn")
    .setDescription("Force spawn a specific card (Owner only)")
    .addStringOption(option =>
      option.setName("name")
        .setDescription("Character name")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("race")
        .setDescription("Race/variant to spawn")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("rarity")
        .setDescription("Rarity to spawn")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("level")
        .setDescription("Level to spawn (1–100)")
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async autocomplete(interaction) {
    try {
      const focused = interaction.options.getFocused(true);
      const allChars = loadCharacters();
      const name = interaction.options.getString("name");
      const race = interaction.options.getString("race");
      let choices = [];

      if (focused.name === "name") {
        choices = allChars.map(c => c.name);
      } else if (focused.name === "race" && name) {
        const selected = allChars.find(
          c => c.name.toLowerCase() === name.toLowerCase()
        );
        if (selected) choices = Object.keys(selected.races || {});
      } else if (focused.name === "rarity" && name && race) {
        const selected = allChars.find(
          c => c.name.toLowerCase() === name.toLowerCase()
        );
        if (selected && selected.races && selected.races[race]) {
          choices = Object.keys(selected.races[race].rarities || {});
        }
      }

      const filtered = (choices || [])
        .filter(choice =>
          choice.toLowerCase().includes(focused.value.toLowerCase())
        )
        .slice(0, 25);

      // ✅ Prevents double-response crash
      if (!interaction.responded) {
        await interaction.respond(
          filtered.map(choice => ({ name: choice, value: choice }))
        );
      }
    } catch (err) {
      console.error("❌ Autocomplete error:", err);
      // Fallback: respond empty if something went wrong
      if (!interaction.responded) {
        await interaction.respond([]);
      }
    }
  },

  async execute(interaction, client) {
    const ownerIds = process.env.OWNER_ID.split(",").map(id => id.trim());

    if (!ownerIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: "❌ Only the bot owner(s) can use this command.",
        ephemeral: true,
      });
    }

    const name = interaction.options.getString("name");
    const race = interaction.options.getString("race")?.toLowerCase();
    const rarity = interaction.options.getString("rarity")?.toLowerCase();
    const level = interaction.options.getInteger("level") || 1;

    const allChars = loadCharacters();
    const chosen = allChars.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!chosen)
      return interaction.reply({ content: `❌ Character "${name}" not found.`, ephemeral: true });

    if (!chosen.races[race])
      return interaction.reply({ content: `❌ Race "${race}" not found for ${name}.`, ephemeral: true });

    const raceData = chosen.races[race];
    if (!raceData.rarities[rarity])
      return interaction.reply({ content: `❌ Rarity "${rarity}" not found for this race.`, ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    const forcedData = {
      card: chosen,
      race,
      rarity,
      level,
      imageUrl: raceData.rarities[rarity].imageUrl || raceData.imageUrl,
      forced: true,
    };

    if (!client.spawnManager || typeof client.spawnManager.spawnCard !== "function") {
      return interaction.followUp({ content: "⚠️ Spawn manager not initialized.", ephemeral: true });
    }

    await client.spawnManager.spawnCard(interaction.channel, forcedData);

    await interaction.followUp({
      content: `✅ Forced **${name}** (${rarity.toUpperCase()}) [${race}] spawned successfully.`,
      ephemeral: true,
    });
  },
};
