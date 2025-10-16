const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Aura = require("../../models/aura");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily Aura reward!"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const now = new Date();

    let userData = await Aura.findOne({ userId, guildId });
    if (!userData) {
      userData = await Aura.create({ userId, guildId });
    }

    const cooldown = 24 * 60 * 60 * 1000; // 24 hours
    const lastClaim = userData.lastDaily || 0;

    if (Date.now() - lastClaim < cooldown) {
      const remaining = cooldown - (Date.now() - lastClaim);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      return interaction.reply({
        content: `⏳ You already claimed your daily Aura. Try again in **${hours}h ${minutes}m**.`,
        ephemeral: true,
      });
    }

    // Calculate streak — if they claimed yesterday, streak continues; else reset
    const oneDay = 24 * 60 * 60 * 1000;
    const lastClaimDate = userData.lastDaily ? new Date(userData.lastDaily) : null;

    if (lastClaimDate && now - lastClaimDate < oneDay * 2) {
      userData.dailyStreak += 1;
    } else {
      userData.dailyStreak = 1;
    }

    // Calculate reward (base 200 + streak bonus)
    const baseReward = 200;
    const streakBonus = Math.floor(baseReward * 0.15 * (userData.dailyStreak - 1)); // +15% per streak
    const reward = baseReward + streakBonus;

    // Update balances
    userData.aura += reward;
    userData.totalEarned += reward;
    userData.lastDaily = Date.now();

    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle("💎 Daily Aura Claimed!")
      .setColor(0x2ecc71)
      .setDescription(
        `You claimed **${reward.toLocaleString()} Aura**!\n\n🔥 **Streak:** ${userData.dailyStreak} days\n💠 **Balance:** ${userData.aura.toLocaleString()} Aura`
      )
      .setFooter({ text: `+${streakBonus} bonus for your streak!` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
