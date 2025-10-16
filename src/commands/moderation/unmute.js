const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const hasModPermission = require("../../utils/checkModPermission");
const GuildConfig = require("../../models/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmute a user")
    .addUserOption(option =>
      option.setName("target").setDescription("User to unmute").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!(await hasModPermission(interaction)))
      return interaction.reply({ content: "🚫 You don’t have permission to use this command.", ephemeral: true });

    const target = interaction.options.getUser("target");
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.reply("⚠️ User not found in this server.");

    try {
      await member.timeout(null); // Remove timeout
      await interaction.reply(`🔊 **${target.tag}** has been unmuted.`);

      // Log in log channel
      const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
      if (config?.logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle("🔊 User Unmuted")
            .addFields(
              { name: "User", value: `${target.tag}\n🆔 ${target.id}`, inline: true },
              { name: "Moderator", value: `${interaction.user.tag}\n🆔 ${interaction.user.id}`, inline: true },
              { name: "Reason", value: "Unmute" }
            )
            .setColor(0x2ecc71)
            .setTimestamp();

          logChannel.send({ embeds: [embed] });
        }
      }

    } catch (err) {
      console.error(err);
      interaction.reply("❌ Could not unmute the user. Make sure I have permission.");
    }
  },
};
