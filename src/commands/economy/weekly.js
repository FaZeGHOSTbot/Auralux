const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Aura = require("../../models/aura");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("weekly")
    .setDescription("Claim your weekly Aura reward!"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const now = new Date();

    let userData = await Aura.findOne({ userId, guildId });
    if (!userData) {
      userData = await Aura.create({ userId, guildId });
    }

    const cooldown = 7 * 24 * 60 * 60 * 1000; // 7 days
    const lastClaim = userData.lastWeekly || 0;

    if (Date.now() - lastClaim < cooldown) {
      const remaining = cooldown - (Date.now() - lastClaim);
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );

      return interaction.reply({
        content: `⏳ You already claimed your weekly Aura. Try again in **${days}d ${hours}h**.`,
        ephemeral: true,
      });
    }

    // Streak logic: if claimed last week (within 14 days), streak continues
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const lastClaimDate = userData.lastWeekly ? new Date(userData.lastWeekly) : null;

    if (lastClaimDate && now - lastClaimDate < oneWeek * 2) {
      userData.weeklyStreak += 1;
    } else {
      userData.weeklyStreak = 1;
    }

    // Reward — higher base + bigger streak bonus
    const baseReward = 2000;
    const streakBonus = Math.floor(baseReward * 0.25 * (userData.weeklyStreak - 1)); // +25% per streak
    const reward = baseReward + streakBonus;

    // Update user data
    userData.aura += reward;
    userData.totalEarned += reward;
    userData.lastWeekly = Date.now();

    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle("💠 Weekly Aura Claimed!")
      .setColor(0x1abc9c)
      .setDescription(
        `You received **${reward.toLocaleString()} Aura**!\n\n🔥 **Streak:** ${userData.weeklyStreak} weeks\n💰 **Balance:** ${userData.aura.toLocaleString()} Aura`
      )
      .setFooter({ text: `+${streakBonus} bonus for your weekly streak!` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
