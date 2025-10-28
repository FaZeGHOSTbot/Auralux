const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const User = require("../../models/user");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("champions")
    .setDescription("View your claimed cards list!"),

  async execute(interaction) {
    await interaction.deferReply();

    const user = await User.findOne({
      userId: interaction.user.id,
      guildId: interaction.guild.id,
    });

    if (!user || !user.cards.length) {
      return await interaction.editReply({
        content: "📭 You don’t have any cards yet. Try claiming one first!",
        ephemeral: true,
      });
    }

    let page = 0;
    const cardsPerPage = 10;
    const totalPages = Math.ceil(user.cards.length / cardsPerPage);

    const formatCardList = (cards, startIndex) => {
      return cards
        .map((card, i) => {
          const userCardId = card.userCardId || startIndex + i + 1; // 👤 User-specific ID
          const globalId = card.globalCardId ?? "—"; // 🌍 Corrected global ID field
          const rarityEmoji =
            card.rarity === "divine"
              ? "🌟"
              : card.rarity === "ascended"
              ? "💠"
              : card.rarity === "immortal"
              ? "🔥"
              : card.rarity === "legendary"
              ? "💎"
              : card.rarity === "epic"
              ? "✨"
              : card.rarity === "rare"
              ? "🔷"
              : "⚪";

          return `**#${userCardId} | 🌐 ${globalId} | Lv.${card.level || 1} | ${rarityEmoji} ${card.rarity?.toUpperCase() || "UNKNOWN"}**  
🧬 ${card.name} — **SP:** ${card.soulPotential}%`;
        })
        .join("\n\n");
    };

    const createEmbed = () => {
      const start = page * cardsPerPage;
      const end = start + cardsPerPage;
      const cards = user.cards.slice(start, end);

      return new EmbedBuilder()
        .setTitle(`${interaction.user.username}’s Champions`)
        .setDescription(formatCardList(cards, start))
        .setColor(0x00aeff)
        .setFooter({
          text: `Page ${page + 1} of ${totalPages} • Total Cards: ${user.cards.length}`,
        });
    };

    const getButtons = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev_page")
          .setLabel("⬅️ Prev")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("next_page")
          .setLabel("➡️ Next")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1)
      );

    const message = await interaction.editReply({
      embeds: [createEmbed()],
      components: [getButtons()],
      fetchReply: true,
    });

    const collector = message.createMessageComponentCollector({
      time: 120000,
      filter: (btn) => btn.user.id === interaction.user.id,
    });

    collector.on("collect", async (btn) => {
      if (btn.customId === "prev_page" && page > 0) page--;
      if (btn.customId === "next_page" && page < totalPages - 1) page++;
      await btn.update({
        embeds: [createEmbed()],
        components: [getButtons()],
      });
    });

    collector.on("end", async () => {
      await message.edit({ components: [] }).catch(() => {});
    });
  },
};
