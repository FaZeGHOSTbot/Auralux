const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("forcespawn")
    .setDescription("Force spawn a random card (Owner only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const ownerId = process.env.OWNER_ID; // add your Discord ID in .env
    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "❌ Only the owner can use this command.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    await client.spawnManager.spawnCard(interaction.channel);
    await interaction.followUp({ content: "✅ Forced a card spawn in this channel.", ephemeral: true });
  },
};
