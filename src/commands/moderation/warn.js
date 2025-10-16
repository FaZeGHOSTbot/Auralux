const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const hasModPermission = require("../../utils/checkModPermission");
const GuildConfig = require("../../models/guildConfig");
const Warning = require("../../models/warning");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .addUserOption(option => option.setName("target").setDescription("User to warn").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for warning"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!(await hasModPermission(interaction)))
      return interaction.reply({ content: "🚫 You don’t have permission to use this command.", ephemeral: true });

    const target = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") || "No reason provided";

    // Save the warning in database
    const warning = new Warning({
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: interaction.user.id,
      reason,
    });
    await warning.save();

    // DM the user
    try {
      await target.send(
        `You have received a warning in **${interaction.guild.name}** by ${interaction.user.tag}.\nReason: ${reason}`
      );
    } catch (err) {
      // Ignore if DMs are closed
    }

    // Reply to moderator with simplified embed
    const replyEmbed = new EmbedBuilder()
      .setDescription(`⚠️ <@${target.id}> was warned!\n**Reason:** ${reason}`)
      .setColor(0xffcc00)
      .setFooter({ text: `Moderator: ${interaction.user.tag} (ID: ${interaction.user.id})` })
      .setTimestamp();

    await interaction.reply({ embeds: [replyEmbed] });

    // Log to server log channel
    const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (config?.logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setDescription(`⚠️ <@${target.id}> was warned!\n**Reason:** ${reason}`)
          .setColor(0xffcc00)
          .setFooter({ text: `Moderator: ${interaction.user.tag} (ID: ${interaction.user.id})` })
          .setTimestamp();

        logChannel.send({ embeds: [logEmbed] });
      }
    }
  },
};
