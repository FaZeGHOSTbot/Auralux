const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const hasModPermission = require("../../utils/checkModPermission");
const GuildConfig = require("../../models/guildConfig");
const Warning = require("../../models/warning");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearwarnings")
    .setDescription("Clear all warnings of a user")
    .addUserOption(option => option.setName("target").setDescription("User to clear warnings for").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!(await hasModPermission(interaction)))
      return interaction.reply({ content: "🚫 You don’t have permission to use this command.", ephemeral: true });

    const target = interaction.options.getUser("target");

    // Delete warnings
    const result = await Warning.deleteMany({ guildId: interaction.guild.id, userId: target.id });

    await interaction.reply(`✅ Cleared **${result.deletedCount}** warnings for **${target.tag}** (ID: ${target.id}).`);

    // Log to server log channel
    const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (config?.logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("🗑️ Warnings Cleared")
          .addFields(
            { name: "User", value: `<@${target.id}> (${target.tag})\n🆔 ${target.id}`, inline: true },
            { name: "Moderator", value: `<@${interaction.user.id}> (${interaction.user.tag})\n🆔 ${interaction.user.id}`, inline: true },
            { name: "Cleared Warnings", value: `${result.deletedCount}` }
          )
          .setColor(0xff0000)
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      }
    }
  },
};
