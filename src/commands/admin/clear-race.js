const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const User = require("../../models/user");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear-isekai")
    .setDescription("⚠️ Deletes all players' xp, race, level, and cards (Owner only)")
    .setDefaultPermission(false),

  async execute(interaction) {
    const ownerIds = process.env.OWNER_ID.split(",").map(id => id.trim());
    if (!ownerIds.includes(interaction.user.id)) {
      return interaction.reply({ content: "❌ Only bot owner(s) can use this command.", ephemeral: true });
    }

    // 🧠 Ask for confirmation
    const confirmEmbed = new EmbedBuilder()
      .setTitle("⚠️ Confirm Isekai Data Wipe")
      .setDescription(
        "This will **reset all players’ XP, level, race, and cards.**\n\n" +
        "User accounts will stay — but all progress will be wiped.\n\nAre you absolutely sure?"
      )
      .setColor("Red")
      .setFooter({ text: "You have 15 seconds to confirm." });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm_clear")
        .setLabel("✅ Yes, clear everything")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancel_clear")
        .setLabel("❌ Cancel")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });

    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id,
      time: 15000,
    });

    collector.on("collect", async i => {
      if (i.customId === "cancel_clear") {
        await i.update({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Cancelled")
              .setDescription("No data was deleted.")
              .setColor("Grey"),
          ],
          components: [],
        });
        collector.stop();
        return;
      }

      if (i.customId === "confirm_clear") {
        try {
          // 🗑️ Reset specific fields for all users
          const result = await User.updateMany(
            {},
            {
              $set: { xp: 0, level: 1, race: null, userCardCounter: 0 },
              $unset: { cards: 1 },
            }
          );

          await i.update({
            embeds: [
              new EmbedBuilder()
                .setTitle("🔥 All Player Data Cleared")
                .setDescription(
                  `All players’ **XP, Level, Race, and Cards** have been wiped.\n` +
                  `Affected documents: **${result.modifiedCount}**`
                )
                .setColor("DarkRed"),
            ],
            components: [],
          });
        } catch (err) {
          console.error("❌ Clear command error:", err);
          await i.update({
            content: "⚠️ An error occurred while clearing data.",
            components: [],
          });
        }
        collector.stop();
      }
    });

    collector.on("end", async collected => {
      if (collected.size === 0) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("⌛ Timed Out")
              .setDescription("You didn’t confirm in time. Operation cancelled.")
              .setColor("Grey"),
          ],
          components: [],
        });
      }
    });
  },
};
