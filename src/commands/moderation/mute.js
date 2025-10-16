const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const ms = require("ms"); // npm i ms
const hasModPermission = require("../../utils/checkModPermission");
const GuildConfig = require("../../models/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mute a user for a specific duration")
    .addUserOption(option => option.setName("target").setDescription("User to mute").setRequired(true))
    .addStringOption(option => option.setName("duration").setDescription("Mute duration (e.g., 10m, 1h)").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for mute"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!(await hasModPermission(interaction)))
      return interaction.reply({ content: "🚫 You don’t have permission to use this command.", ephemeral: true });

    const target = interaction.options.getUser("target");
    const durationStr = interaction.options.getString("duration");
    const reason = interaction.options.getString("reason") || "No reason provided";
    const duration = ms(durationStr);

    if (!duration) return interaction.reply("⚠️ Invalid duration. Example: `10m`, `1h`, `2d`");

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) return interaction.reply("⚠️ User not found in this server.");

    // --- ROLE HIERARCHY CHECK ---
    if (member.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        content: "🚫 You cannot mute this user because their role is higher or equal to yours.",
        ephemeral: true,
      });
    }

    const botMember = await interaction.guild.members.fetch(interaction.guild.members.me.id);
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: "❌ I cannot mute this user because their role is higher or equal to mine.",
        ephemeral: true,
      });
    }

    // DM the user
    try {
      await target.send(
        `You have been muted in **${interaction.guild.name}** by ${interaction.user.tag} (ID: ${interaction.user.id}) for **${durationStr}**.\nReason: ${reason}`
      );
    } catch (err) {
      // Ignore if DMs are closed
    }

    // Apply the mute
    await member.timeout(duration, reason);

    // Reply to moderator
    await interaction.reply(`🔇 **${target.tag}** (ID: ${target.id}) has been muted for ${durationStr}.`);

    // Log to server log channel
    const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (config?.logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setTitle("🔇 User Muted")
          .addFields(
            { name: "User", value: `<@${target.id}> (${target.tag})\n🆔 ${target.id}`, inline: true },
            { name: "Duration", value: durationStr, inline: true },
            { name: "Moderator", value: `<@${interaction.user.id}> (${interaction.user.tag})\n🆔 ${interaction.user.id}`, inline: true },
            { name: "Reason", value: reason }
          )
          .setColor(0x3498db)
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      }
    }
  },
};
