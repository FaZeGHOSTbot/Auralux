const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const GuildConfig = require("../../models/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removemodrole")
    .setDescription("Remove a specific moderator role from this server")
    .addRoleOption(option =>
      option.setName("role")
        .setDescription("Select the moderator role to remove")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // optional, Discord UI hint

  async execute(interaction) {
    // Check server admin permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ Only server administrators can use this command.", ephemeral: true });
    }

    const role = interaction.options.getRole("role");

    let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (!config || !config.modRoleIds || config.modRoleIds.length === 0) {
      return interaction.reply({ content: "⚠️ There are no moderator roles set for this server.", ephemeral: true });
    }

    if (!config.modRoleIds.includes(role.id)) {
      return interaction.reply({ content: `⚠️ **${role.name}** is not a moderator role.`, ephemeral: true });
    }

    // Remove the role from the array
    config.modRoleIds = config.modRoleIds.filter(r => r !== role.id);
    await config.save();

    await interaction.reply(`✅ **${role.name}** has been removed from moderator roles.`);
  },
};
