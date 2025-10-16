const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Shows the bot's latency."),

  async execute(interaction, client) {
    // Send a temporary reply to measure round-trip latency
    const sent = await interaction.reply({ content: "🏓 Pinging...", fetchReply: true });
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);

    // Optional: Bot uptime
    const uptime = client.uptime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);

    // Build embed
    const embed = new EmbedBuilder()
      .setTitle("🏓 Pong!")
      .setColor(0x00ff99)
      .addFields(
        { name: "Round-trip Latency", value: `${roundTrip}ms`, inline: true },
        { name: "API Latency", value: `${apiPing}ms`, inline: true },
        { name: "Uptime", value: `${hours}h ${minutes}m ${seconds}s`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};
