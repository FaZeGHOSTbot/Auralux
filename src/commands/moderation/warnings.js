const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const Warning = require("../../models/warning");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings of a user")
    .addUserOption(option => option.setName("target").setDescription("User to view warnings").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser("target");

    const warnings = await Warning.find({ guildId: interaction.guild.id, userId: target.id });
    if (!warnings.length) return interaction.reply(`${target.tag} has no warnings.`);

    const pageSize = 5; // Number of warnings per page
    let currentPage = 0;

    const generateEmbed = (page) => {
      const embed = new EmbedBuilder()
        .setTitle(`⚠️ Warnings for ${target.tag}`)
        .setColor(0xffcc00)
        .setTimestamp();

      const start = page * pageSize;
      const paginatedWarnings = warnings.slice(start, start + pageSize);

      paginatedWarnings.forEach((w, i) => {
        embed.addFields({
          name: `Warning ${start + i + 1}`,
          value: `**Reason:** ${w.reason}\n**Moderator:** <@${w.moderatorId}> (ID: ${w.moderatorId})\n**Date:** <t:${Math.floor(w.timestamp.getTime() / 1000)}:f>`
        });
      });

      embed.setFooter({ text: `Page ${page + 1} of ${Math.ceil(warnings.length / pageSize)}` });
      return embed;
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("◀️ Previous")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true), // first page
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Next ▶️")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(warnings.length <= pageSize) // disable if only 1 page
    );

    const message = await interaction.reply({ embeds: [generateEmbed(currentPage)], components: [row], fetchReply: true });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000 // 2 minutes
    });

    collector.on("collect", async (btnInteraction) => {
      if (btnInteraction.user.id !== interaction.user.id) {
        return btnInteraction.reply({ content: "⚠️ You cannot use these buttons.", ephemeral: true });
      }

      if (btnInteraction.customId === "next") currentPage++;
      else if (btnInteraction.customId === "prev") currentPage--;

      const newRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀️ Previous")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("Next ▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === Math.ceil(warnings.length / pageSize) - 1)
      );

      await btnInteraction.update({ embeds: [generateEmbed(currentPage)], components: [newRow] });
    });

    collector.on("end", async () => {
      // Disable buttons after timeout
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev").setLabel("◀️ Previous").setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId("next").setLabel("Next ▶️").setStyle(ButtonStyle.Primary).setDisabled(true)
      );
      await message.edit({ components: [disabledRow] });
    });
  },
};
