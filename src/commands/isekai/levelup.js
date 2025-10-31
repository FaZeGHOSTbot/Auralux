const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/user");
const { calculateSacrificeXP, levelUpCard } = require("../../utils/leveling");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("levelup")
    .setDescription("Sacrifice cards to level up another card")
    .addIntegerOption(opt =>
      opt.setName("target_id")
        .setDescription("User Card ID of the card you want to level up")
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName("use_rarity")
        .setDescription("Filter fodder cards by rarity")
        .addChoices(
          { name: "Mortal", value: "mortal" },
          { name: "Ascended", value: "ascended" },
          { name: "Legendary", value: "legendary" },
          { name: "Mythic", value: "mythic" },
          { name: "Divine", value: "divine" }))
    .addStringOption(opt =>
      opt.setName("use_race")
        .setDescription("Filter fodder cards by race"))
    .addBooleanOption(opt =>
      opt.setName("use_same_name")
        .setDescription("Only use cards with the same name as the target"))
    .addIntegerOption(opt =>
      opt.setName("amount")
        .setDescription("Number of cards to sacrifice (default: all that match)"))
    .addBooleanOption(opt =>
      opt.setName("confirm")
        .setDescription("Confirm the level-up (otherwise shows preview)")),

  async execute(interaction) {
    await interaction.deferReply();

    const user = await User.findOne({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
    });
    if (!user || !user.cards.length)
      return interaction.editReply("❌ You have no cards.");

    const targetId = interaction.options.getInteger("target_id");
    const useRarity = interaction.options.getString("use_rarity");
    const useRace = interaction.options.getString("use_race");
    const useSameName = interaction.options.getBoolean("use_same_name");
    const amount = interaction.options.getInteger("amount");
    const confirm = interaction.options.getBoolean("confirm") || false;

    const targetCard = user.cards.find(c => c.userCardId === targetId);
    if (!targetCard)
      return interaction.editReply("❌ Target card not found.");

    // Filter fodders
    let fodders = user.cards.filter(c => c.cardId !== targetCard.cardId);
    if (useRarity) fodders = fodders.filter(c => c.rarity === useRarity);
    if (useRace) fodders = fodders.filter(c => c.race === useRace);
    if (useSameName) fodders = fodders.filter(c => c.name === targetCard.name);
    if (!fodders.length) return interaction.editReply("❌ No matching fodder cards found.");
    if (amount) fodders = fodders.slice(0, amount);

    const totalXP = calculateSacrificeXP(targetCard, fodders);

    // 🧮 Simulate preview level-up
    const preview = {
      ...targetCard.toObject(),
      level: targetCard.level,
      xp: targetCard.xp,
    };
    levelUpCard(preview, totalXP);

    const embed = new EmbedBuilder()
      .setTitle(confirm ? "⚔️ Level-Up Result" : "🧪 Level-Up Preview")
      .setDescription(
        `🎯 Target: **${targetCard.name} [${targetCard.rarity}] Lv.${targetCard.level}**\n` +
        `🩸 Fodders: **${fodders.length} cards**\n` +
        `💥 XP Gained: **${totalXP.toLocaleString()}**\n` +
        `📈 New Level: **Lv.${preview.level}**`
      )
      .setColor(confirm ? "Green" : "Aqua");

    if (!confirm) return interaction.editReply({ embeds: [embed] });

    // ✅ Apply for real
    levelUpCard(targetCard, totalXP);
    user.cards = user.cards.filter(c => !fodders.includes(c));
    await user.save();

    return interaction.editReply({ embeds: [embed] });
  },
};
