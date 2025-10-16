const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Aura = require("../../models/aura");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("monthly")
    .setDescription("Claim your monthly Aura reward!"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const now = new Date();

    let userData = await Aura.findOne({ userId, guildId });
    if (!userData) {
      userData = await Aura.create({ userId, guildId });
    }

    const cooldown = 30 * 24 * 60 * 60 * 1000; // 30 days
    const lastClaim = userData.lastMonthly || 0;

    if (Date.now() - lastClaim < cooldown) {
      const remaining = cooldown - (Date.now() - lastClaim);
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );

      return interaction.reply({
        content: `🕓 You already claimed your monthly Aura. Try again in **${days}d ${hours}h**.`,
        ephemeral: true,
      });
    }

    // Streak logic: continues if claimed within 60 days
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    const lastClaimDate = userData.lastMonthly ? new Date(userData.lastMonthly) : null;

    if (lastClaimDate && now - lastClaimDate < oneMonth * 2) {
      userData.monthlyStreak += 1;
    } else {
      userData.monthlyStreak = 1;
    }

    // Reward — largest base + 50% per streak
    const baseReward = 10000;
    const streakBonus = Math.floor(baseReward * 0.5 * (userData.monthlyStreak - 1)); // +50% per streak
    const reward = baseReward + streakBonus;

    userData.aura += reward;
    userData.totalEarned += reward;
    userData.lastMonthly = Date.now();

    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle("🌕 Monthly Aura Claimed!")
      .setColor(0x9b59b6)
      .setDescription(
        `You received **${reward.toLocaleString()} Aura**!\n\n🔥 **Streak:** ${userData.monthlyStreak} months\n💰 **Balance:** ${userData.aura.toLocaleString()} Aura`
      )
      .setFooter({ text: `+${streakBonus} bonus for your monthly streak!` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
