const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const hasModPermission = require("../../utils/checkModPermission");
const GuildConfig = require("../../models/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server")
    .addUserOption(option => option.setName("target").setDescription("User to ban").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for ban"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!(await hasModPermission(interaction)))
      return interaction.reply({ content: "🚫 You don’t have permission to use this command.", ephemeral: true });

    const target = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason") || "No reason provided";

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.reply("⚠️ User not found in this server.");

    // --- ROLE HIERARCHY CHECK ---
    // Moderator cannot ban higher or equal role
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        content: "🚫 You cannot ban this user because their role is higher or equal to yours.",
        ephemeral: true,
      });
    }

    // Bot cannot ban higher or equal role
    const botMember = await interaction.guild.members.fetch(interaction.guild.members.me.id);
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: "❌ I cannot ban this user because their role is higher or equal to mine.",
        ephemeral: true,
      });
    }

    // DM the user
    try {
      await target.send(
        `You have been banned from **${interaction.guild.name}** by ${interaction.user.tag} (ID: ${interaction.user.id}).\nReason: ${reason}`
      );
    } catch (err) {
      // Ignore if DMs are closed
    }

    // Ban the member
    await member.ban({ reason });

    // Reply to moderator
    await interaction.reply(`🔨 **${target.tag}** (ID: ${target.id}) has been banned. Reason: ${reason}`);

    // Log to server log channel
    const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (config?.logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("⛔ User Banned")
          .addFields(
            { name: "User", value: `<@${target.id}> (${target.tag})\n🆔 ${target.id}`, inline: true },
            { name: "Moderator", value: `<@${interaction.user.id}> (${interaction.user.tag})\n🆔 ${interaction.user.id}`, inline: true },
            { name: "Reason", value: reason }
          )
          .setColor(0xff0000)
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      }
    }
  },
};
