const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("animated-avatar")
        .setDescription("Sets the bot's avatar to an animated GIF.")
        .addAttachmentOption(option =>
            option
                .setName("avatar")
                .setDescription("Upload a GIF to set as the bot’s avatar.")
                .setRequired(true)
        ),

    async execute(interaction) {
        // 🧠 Step 1: Owner-only protection
        const allowedOwners = [
            "424568410765262848", // 👈 replace this with your Discord user ID
            "644600955295498249",
            "386109687692656640",
            "729614323978207323"  // add more if needed
        ];

        if (!allowedOwners.includes(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setDescription("❌ You don’t have permission to use this command.");
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // 🌀 Step 2: Process the avatar attachment
        const avatar = interaction.options.getAttachment("avatar");
        await interaction.deferReply({ ephemeral: true });

        if (!avatar || avatar.contentType !== "image/gif") {
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setDescription("⚠️ Please upload a valid **GIF** file.");
            return await interaction.editReply({ embeds: [embed] });
        }

        try {
            await interaction.client.user.setAvatar(avatar.url);

            const embed = new EmbedBuilder()
                .setColor("Green")
                .setDescription("✅ Successfully updated the bot’s avatar!");
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setColor("Red")
                .setDescription(`❌ Failed to update avatar:\n\`${error.message}\``);
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
