const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const hasModPermission = require("../../utils/checkModPermission");
const GuildConfig = require("../../models/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user from the server")
    .addStringOption(option =>
      option.setName("userid")
        .setDescription("ID of the user to unban")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("Reason for unban"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!(await hasModPermission(interaction))) {
      return interaction.reply({ content: "🚫 You don’t have permission to use this command.", ephemeral: true });
    }

    const userId = interaction.options.getString("userid");
    const reason = interaction.options.getString("reason") || "No reason provided";

    // Try to unban
    try {
      const banList = await interaction.guild.bans.fetch();
      const bannedUser = banList.get(userId);
      if (!bannedUser) return interaction.reply(`⚠️ User with ID \`${userId}\` is not banned.`);

      await interaction.guild.members.unban(userId, reason);
      await interaction.reply(`✅ Successfully unbanned **${bannedUser.user.tag}** (ID: ${userId}).`);

      // DM the user
      try {
        await bannedUser.user.send(
          `You have been unbanned from **${interaction.guild.name}** by ${interaction.user.tag} (ID: ${interaction.user.id}).\nReason: ${reason}`
        );
      } catch (err) {
        // Ignore if DMs are closed
      }

      // Log the unban
      const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
      if (config?.logChannelId) {
        const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle("✅ User Unbanned")
            .addFields(
              { name: "User", value: `<@${userId}> (ID: ${userId})`, inline: true },
              { name: "Moderator", value: `<@${interaction.user.id}> (${interaction.user.tag})\n🆔 ${interaction.user.id}`, inline: true },
              { name: "Reason", value: reason }
            )
            .setColor(0x00ff00)
            .setTimestamp();

          logChannel.send({ embeds: [embed] });
        }
      }

    } catch (error) {
      console.error(error);
      return interaction.reply(`❌ Failed to unban user. Make sure the ID is correct and I have permission.`);
    }
  }
};
