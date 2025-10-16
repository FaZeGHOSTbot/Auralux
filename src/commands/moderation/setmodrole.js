const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const GuildConfig = require("../../models/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setmodrole")
    .setDescription("Set a moderator role for moderation commands")
    .addRoleOption(option =>
      option.setName("role").setDescription("Select the moderator role").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // optional, Discord UI hint

  async execute(interaction) {
    // Check server admin permission
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ Only server administrators can use this command.", ephemeral: true });
    }

    const role = interaction.options.getRole("role");

    let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (!config) config = new GuildConfig({ guildId: interaction.guild.id });

    // Support multiple mod roles
    if (!config.modRoleIds) config.modRoleIds = [];
    if (!config.modRoleIds.includes(role.id)) config.modRoleIds.push(role.id);

    await config.save();

    await interaction.reply(`✅ Moderator role set/added: **${role.name}**`);
  },
};
