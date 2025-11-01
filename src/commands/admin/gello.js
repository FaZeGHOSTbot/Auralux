const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("hello")
        .setDescription("Replies with hey!"),

    async execute(interaction) {
        await interaction.reply("hey!");
    },
};
