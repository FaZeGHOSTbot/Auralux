const { EmbedBuilder } = require("discord.js");
const GuildConfig = require("../models/guildConfig");

module.exports = async (client) => {
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot || !msg.guild) return;

    const content = msg.content.toLowerCase();

    if (content.startsWith("sybau")) {
      if (!msg.member.permissions.has("ModerateMembers")) return;

      const target = msg.mentions.members.first();
      if (!target) return msg.channel.send("⚠️ You need to mention a user to shut up!");

      const duration = 60 * 60 * 1000; // 1 hour

      try {
        await target.timeout(duration, "SYBAU quick mute");

        // Chat embed
        const embed = new EmbedBuilder()
          .setDescription(`🤐 ${msg.member} has shut ${target}'s bitch ass up!`)
          .setColor(0x3498db)
          .setTimestamp();

        await msg.channel.send({ embeds: [embed] });

        // Logging embed (using your log channel setup)
        const config = await GuildConfig.findOne({ guildId: msg.guild.id });
        if (config?.logChannelId) {
          const logChannel = msg.guild.channels.cache.get(config.logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setTitle("🔇 SYBAU Mute")
              .addFields(
                { name: "User", value: `${target.user.tag}\n🆔 ${target.id}`, inline: true },
                { name: "Moderator", value: `${msg.author.tag}\n🆔 ${msg.author.id}`, inline: true },
                { name: "Duration", value: "1 hour", inline: true },
                { name: "Reason", value: "SYBAU quick mute" }
              )
              .setColor(0xff9900)
              .setTimestamp();

            logChannel.send({ embeds: [logEmbed] });
          }
        }

      } catch (err) {
        console.error(err);
        return msg.channel.send("❌ you don't have permission to shut his bitch ass up.");
      }
    }
  });
};
