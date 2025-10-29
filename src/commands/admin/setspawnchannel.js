const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const GuildConfig = require("../../models/guildConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setspawn")
    .setDescription("Set the channel where cards will spawn.")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Select the channel where cards should spawn")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");

    try {
      // Save or update the spawn channel for this guild
      await GuildConfig.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { spawnChannelId: channel.id },
        { upsert: true, new: true }
      );

      await interaction.reply({
        content: `✅ Spawn channel set to ${channel}!`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error setting spawn channel:", error);
      await interaction.reply({
        content: "⚠️ Failed to set spawn channel.",
        ephemeral: true,
      });
    }
  },
};
