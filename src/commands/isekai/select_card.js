const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/user");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("champion")
    .setDescription("Manage your primary (champion) card.")
    .addSubcommand(sub =>
      sub
        .setName("select")
        .setDescription("Select a card from your inventory as your primary champion.")
        .addIntegerOption(opt =>
          opt
            .setName("id")
            .setDescription("Your card’s userCardId (check /inventory)")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("view")
        .setDescription("View your current selected champion.")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const user = await User.findOne({ userId, guildId });

    if (!user) {
      return interaction.reply({
        content: "❌ You don’t have any cards yet. Try claiming one first!",
        ephemeral: true,
      });
    }

    // 🩵 /champion select
    if (sub === "select") {
      const chosenId = interaction.options.getInteger("id");
      const card = user.cards.find(c => c.userCardId === chosenId);

      if (!card) {
        return interaction.reply({
          content: `⚠️ No card found with ID **${chosenId}** in your inventory.`,
          ephemeral: true,
        });
      }

      user.selectedCardId = chosenId;
      await user.save();

      const embed = new EmbedBuilder()
        .setTitle("🏆 Champion Selected!")
        .setDescription(
          `Your new champion is **${card.name}** (${card.race.toUpperCase()})\n` +
          `💠 Rarity: **${card.rarity.toUpperCase()}**\n` +
          `📈 Level: **${card.level}**`
        )
        .setImage(card.imageUrl)
        .setColor(0x00ffcc)
        .setFooter({ text: "This card will now gain XP from your future claims!" });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // 👁️ /champion view
    if (sub === "view") {
      if (!user.selectedCardId) {
        return interaction.reply({
          content: "🪞 You haven’t selected a champion yet! Use `/champion select <id>`.",
          ephemeral: true,
        });
      }

      const card = user.cards.find(c => c.userCardId === user.selectedCardId);
      if (!card) {
        user.selectedCardId = null;
        await user.save();
        return interaction.reply({
          content: "⚠️ Your previously selected champion no longer exists.",
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("💫 Your Current Champion")
        .setDescription(
          `**${card.name}** (${card.race.toUpperCase()})\n` +
          `💠 Rarity: **${card.rarity.toUpperCase()}**\n` +
          `📈 Level: **${card.level}** (${card.xp} XP)`
        )
        .setImage(card.imageUrl)
        .setColor(0x00bfff)
        .setFooter({ text: "Gains XP when you claim new cards!" });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
