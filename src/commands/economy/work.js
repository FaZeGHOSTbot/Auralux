const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Aura = require("../../models/aura");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work to earn some Aura (15 min cooldown)"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const now = Date.now();

    let userData = await Aura.findOne({ userId, guildId });
    if (!userData) {
      userData = await Aura.create({ userId, guildId });
    }

    const cooldown = 15 * 60 * 1000; // 15 minutes
    const lastWork = userData.lastWork || 0;

    if (now - lastWork < cooldown) {
      const remaining = cooldown - (now - lastWork);
      const minutes = Math.floor((remaining / 1000 / 60) % 60);
      const seconds = Math.floor((remaining / 1000) % 60);

      return interaction.reply({
        content: `⏳ You’re tired! Try again in **${minutes}m ${seconds}s**.`,
        ephemeral: true,
      });
    }

    // Random reward: base + variance
    const base = 250;
    const bonus = Math.floor(Math.random() * 250); // 0–250 extra
    const reward = base + bonus;

    // Fun random work messages
    const jobs = [
      "coded a Discord bot",
      "found money under sofa",
      "recorded a cringe song",
      "fixed a server outage",
      "streamed on Twitch",
      "cleaned dirty underwear",
      "asked for money from parents)",
      "babysitting e-girl",
      "bullied a kid",
      "ragebaited strangers"
    ];
    const job = jobs[Math.floor(Math.random() * jobs.length)];

    userData.aura += reward;
    userData.totalEarned += reward;
    userData.lastWork = now;

    await userData.save();

    const embed = new EmbedBuilder()
      .setTitle("💼 You worked hard!")
      .setDescription(`You ${job} and earned **${reward.toLocaleString()} Aura**!`)
      .setColor(0x2ecc71)
      .setFooter({ text: `Balance: ${userData.aura.toLocaleString()} Aura` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
