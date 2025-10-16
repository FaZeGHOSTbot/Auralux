const mongoose = require("mongoose");

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  modRoleIds: { type: [String], default: [] }, // <-- change from single modRoleId
  logChannelId: { type: String, default: null },
});

module.exports = mongoose.model("GuildConfig", guildConfigSchema);
