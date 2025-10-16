const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Aura = require("../../models/aura");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your or another user’s Aura balance.")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Check another user's balance")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") || interaction.user;

    let userData = await Aura.findOne({ userId: target.id, guildId: interaction.guild.id });
    if (!userData) {
      userData = await Aura.create({
        userId: target.id,
        guildId: interaction.guild.id,
      });
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: `${target.username}'s Aura Balance`, iconURL: target.displayAvatarURL({ dynamic: true }) })
      .setColor(0x9b59b6)
      .addFields(
        { name: "💠 Aura", value: `${userData.aura.toLocaleString()} 💎`, inline: true },
        { name: "🏆 Total Earned", value: `${userData.totalEarned.toLocaleString()} 💰`, inline: true },
        { name: "💸 Total Spent", value: `${userData.totalSpent.toLocaleString()} 💸`, inline: true },
        {
          name: "🔥 Streaks",
          value: `**Daily:** ${userData.dailyStreak}\n**Weekly:** ${userData.weeklyStreak}\n**Monthly:** ${userData.monthlyStreak}`,
          inline: false,
        }
      )
      .setFooter({ text: `User ID: ${target.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
