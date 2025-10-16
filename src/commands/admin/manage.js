const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const Aura = require("../../models/aura");
const User = require("../../models/user");

const OWNER_IDS = [
  "424568410765262848",
  "644600955295498249",
  "386109687692656640",
  "729614323978207323"
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("manage")
    .setDescription("Owner-only command to manage Aura and levels")
    .addSubcommand(sub =>
      sub
        .setName("aura")
        .setDescription("Give, take or clear aura of a user")
        .addUserOption(opt => opt.setName("target").setDescription("User").setRequired(true))
        .addStringOption(opt =>
          opt.setName("action")
            .setDescription("Action: give, take, clear")
            .setRequired(true)
            .addChoices(
              { name: "give", value: "give" },
              { name: "take", value: "take" },
              { name: "clear", value: "clear" }
            ))
        .addIntegerOption(opt => opt.setName("amount").setDescription("Amount of Aura (not needed for clear)")))

    .addSubcommand(sub =>
      sub
        .setName("streak")
        .setDescription("Clear streaks for a user")
        .addUserOption(opt => opt.setName("target").setDescription("User").setRequired(true)))

    .addSubcommand(sub =>
      sub
        .setName("resetlevels")
        .setDescription("Reset levels for a user or the entire server")
        .addUserOption(opt => opt.setName("target").setDescription("User (leave empty to reset everyone)"))),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ content: "🚫 Only bot owners can use this command.", ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    // --- AURA MANAGEMENT ---
    if (sub === "aura") {
      const target = interaction.options.getUser("target");
      const action = interaction.options.getString("action");
      const amount = interaction.options.getInteger("amount") || 0;

      let userData = await Aura.findOne({ userId: target.id, guildId: interaction.guild.id });
      if (!userData) userData = await Aura.create({ userId: target.id, guildId: interaction.guild.id });

      if (action === "give") {
        userData.aura += amount;
      } else if (action === "take") {
        userData.aura = Math.max(userData.aura - amount, 0);
      } else if (action === "clear") {
        userData.aura = 0;
        userData.dailyStreak = 0;
        userData.weeklyStreak = 0;
        userData.monthlyStreak = 0;
      }

      await userData.save();
      return interaction.reply(`✅ ${action} done for ${target.tag}. Current Aura: ${userData.aura}`);
    }

    // --- STREAK MANAGEMENT ---
    if (sub === "streak") {
      const target = interaction.options.getUser("target");
      let userData = await Aura.findOne({ userId: target.id, guildId: interaction.guild.id });
      if (!userData) userData = await Aura.create({ userId: target.id, guildId: interaction.guild.id });

      userData.dailyStreak = 0;
      userData.weeklyStreak = 0;
      userData.monthlyStreak = 0;
      await userData.save();

      return interaction.reply(`✅ Cleared all streaks for ${target.tag}`);
    }

    // --- RESET LEVELS ---
    if (sub === "resetlevels") {
      await interaction.deferReply(); // Let Discord know we're processing

      const target = interaction.options.getUser("target");

      if (target) {
        const userData = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
        if (userData) {
          userData.level = 1;
          userData.xp = 0;
          await userData.save();
        }
        return interaction.editReply(`✅ Reset level for ${target.tag}`);
      } else {
        // Bulk update all users in the server
        await User.updateMany({ guildId: interaction.guild.id }, { level: 1, xp: 0 });
        return interaction.editReply(`✅ Reset levels for all users in this server`);
      }
    }
  }
};
