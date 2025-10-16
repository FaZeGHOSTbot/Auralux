const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const GuildConfig = require("../../models/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setmodrole")
    .setDescription("Set a moderator role for moderation commands")
    .addRoleOption(option =>
      option.setName("role").setDescription("Select the moderator role").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const role = interaction.options.getRole("role");

    let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
    if (!config) config = new GuildConfig({ guildId: interaction.guild.id });

    config.modRoleId = role.id;
    await config.save();

    await interaction.reply(`✅ Moderator role set to **${role.name}**`);
  },
};
