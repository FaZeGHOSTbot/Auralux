const mongoose = require("mongoose");

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  modRoleId: { type: String, default: null },
  logChannelId: { type: String, default: null },
});

module.exports = mongoose.model("GuildConfig", guildConfigSchema);
