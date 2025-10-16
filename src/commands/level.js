const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const User = require("../models/user");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("level")
        .setDescription("Check your level & XP"),

    async execute(interaction) {
        const user = await User.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
        if (!user) return interaction.reply("You haven’t earned any XP yet.");

        const guildUsers = await User.find({ guildId: interaction.guild.id }).sort({ level: -1, xp: -1 }).lean();
        const rank = guildUsers.findIndex(u => u.userId === interaction.user.id) + 1;

        const levelEmbed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`📊 Level & XP`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: "👤 User", value: interaction.user.username, inline: true },
                { name: "🏆 Rank", value: `#${rank}`, inline: true },
                { name: "⭐ Level", value: `${user.level}`, inline: true },
                { name: "💡 XP", value: `${user.xp}`, inline: true }
            )
            .setFooter({ text: `${interaction.guild.name} leaderboard`, iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        await interaction.reply({ embeds: [levelEmbed] });
    },
};
