const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/user");

// List of bot owner IDs
const BOT_OWNERS = ["424568410765262848", "386109687692656640", "644600955295498249","722429663435030618"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear-race")
    .setDescription("Clear the race of a user (bot owners only)")
    .addUserOption(option =>
      option.setName("target")
        .setDescription("The user whose race you want to clear")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!BOT_OWNERS.includes(interaction.user.id)) {
      return interaction.reply({ content: "❌ You are not allowed to use this command!", ephemeral: true });
    }

    const target = interaction.options.getUser("target");
    const user = await User.findOne({ userId: target.id });

    if (!user) {
      return interaction.reply({ content: `⚠️ ${target.tag} does not have a race assigned.`, ephemeral: true });
    }

    await User.deleteOne({ userId: target.id });

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("🧹 Race Cleared")
      .setDescription(`The race of **${target.tag}** has been removed.`)
      .setFooter({ text: `Cleared by ${interaction.user.tag} | User ID: ${target.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
