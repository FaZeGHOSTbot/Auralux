const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const User = require("../../models/user"); // adjust path if needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resetplayer")
    .setDescription("⚙️ [Owner Only] Reset a player's data or everyone's data globally.")
    .addStringOption(option =>
      option.setName("target")
        .setDescription("Target user ID or 'all' to reset everyone globally.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    const ownerIds = ["424568410765262848"]; // 🔥 Replace with your Discord ID(s)
    if (!ownerIds.includes(interaction.user.id)) {
      return interaction.reply({
        content: "❌ You don’t have permission to use this command.",
        ephemeral: true,
      });
    }

    const target = interaction.options.getString("target");

    try {
      if (target.toLowerCase() === "all") {
  const users = await User.find({});
  for (const user of users) {
    user.cards = [];
    user.xp = 0;
    user.level = 1;
    user.selectedCardId = null;
    user.userCardCounter = 0;
    await user.save();
  }

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setTitle("🌍 Global Player Reset")
    .setDescription(`All player data (cards, XP, levels) have been reset globally.`)
    .setFooter({ text: `Reset by ${interaction.user.tag}` })
    .setTimestamp();

  return interaction.reply({ embeds: [embed] });
}


      // ✅ Reset single user by ID
      const userId = target;
      const userData = await User.findOne({ userId });

      if (!userData) {
        return interaction.reply({
          content: "⚠️ That user doesn't exist in the database.",
          ephemeral: true,
        });
      }

      userData.cards = [];
      userData.xp = 0;
      userData.level = 1;
      userData.selectedCardId = null;
      userData.userCardCounter = 0;

      await userData.save();

      const embed = new EmbedBuilder()
        .setColor("Orange")
        .setTitle("🧹 Player Data Reset")
        .setDescription(`All data for <@${userId}> has been reset globally.`)
        .addFields(
          { name: "XP", value: "0", inline: true },
          { name: "Level", value: "1", inline: true },
          { name: "Cards", value: "0 total", inline: true }
        )
        .setFooter({ text: `Reset by ${interaction.user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      console.error("Error resetting player(s):", err);
      return interaction.reply({
        content: "❌ Something went wrong while resetting player data.",
        ephemeral: true,
      });
    }
  },
};
