// src/events/interactionCreate.js
const User = require("../models/user");

module.exports = async (client, interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction, client);
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith("claim_")) {
        const user = await User.findOne({
          userId: interaction.user.id,
          guildId: interaction.guild.id,
        });

        if (!user || !user.race) {
          return interaction.reply({
            content: "⚠️ You must choose a race before claiming cards!",
            ephemeral: true,
          });
        }

        await client.spawnManager.handleClaim(interaction, user.race);
      }
    }
  } catch (err) {
    console.error("❌ Interaction Error:", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "⚠️ Something went wrong.",
        ephemeral: true,
      });
    }
  }
};
