const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("forcespawn")
    .setDescription("Force spawn a random card (Owner only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
   const ownerIds = process.env.OWNER_ID.split(",").map(id => id.trim());

if (!ownerIds.includes(interaction.user.id)) {
  return interaction.reply({
    content: "❌ Only the bot owner(s) can use this command.",
    ephemeral: true,
  });
}

    await interaction.deferReply({ ephemeral: true });
    await client.spawnManager.spawnCard(interaction.channel);
    await interaction.followUp({ content: "✅ Forced a card spawn in this channel.", ephemeral: true });
  },
};
