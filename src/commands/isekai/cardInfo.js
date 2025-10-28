const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../../models/user");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cardinfo")
    .setDescription("View detailed information about one of your cards.")
    .addIntegerOption(option =>
      option
        .setName("id")
        .setDescription("Your card's personal ID number (from /champions)")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const cardId = interaction.options.getInteger("id");

    const user = await User.findOne({ userId, guildId });

    if (!user || !user.cards.length) {
      return await interaction.editReply({
        content: "📭 You don’t have any cards yet. Try claiming one first!",
        ephemeral: true,
      });
    }

    const card = user.cards.find(c => c.userCardId === cardId);
    if (!card) {
      return await interaction.editReply({
        content: `❌ No card found with ID **#${cardId}**.`,
        ephemeral: true,
      });
    }

    // 🎨 Rarity style mapping (only 4)
    const rarityStyles = {
      mortal: { color: 0x9ca3af, emoji: "🩶", flavor: "🩶 **A humble mortal, yet full of potential.**" },
      ascended: { color: 0x00ffff, emoji: "💠", flavor: "💠 **One who has surpassed their mortal limits.**" },
      mythic: { color: 0xff4500, emoji: "🔥", flavor: "🔥 **A legend whose name echoes across realms.**" },
      divine: { color: 0xffd700, emoji: "🌟", flavor: "🌟 **A being of pure, unchallenged divinity.**" },
    };

    const rarityKey = card.rarity?.toLowerCase() || "mortal";
    const { color, emoji, flavor } = rarityStyles[rarityKey] || rarityStyles.mortal;

    // 🧾 Build the stylized embed
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} #${card.userCardId} — ${card.name}`)
      .setDescription(
        `**Rarity:** ${card.rarity?.toUpperCase() || "MORTAL"} | **Race:** ${card.race || "—"}\n` +
        `**Level:** ${card.level || 1} | **Soul Potential:** ${card.soulPotential}%`
      )
      .setImage(card.imageUrl || null)
      .setFooter({
        text: `🌐 Global ID: ${card.globalCardId ?? "—"} • Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      });

    // 📊 Display stats in 2-column layout
    if (card.stats && Object.keys(card.stats).length > 0) {
      const statsArray = Object.entries(card.stats).map(([k, v]) => ({
        name: `🔸 ${k.charAt(0).toUpperCase() + k.slice(1)}`,
        value: `**${v}**`,
        inline: true,
      }));

      embed.addFields(statsArray);
    }

    // ✨ Add flavor text based on rarity
    embed.addFields({ name: "\u200B", value: flavor, inline: false });

    await interaction.editReply({ embeds: [embed] });
  },
};
