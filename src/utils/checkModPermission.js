const GuildConfig = require("../models/guildConfig");

module.exports = async function hasModPermission(interaction) {
  const member = interaction.member;
  if (!member) return false;

  // Allow admins
  if (member.permissions.has("Administrator")) return true;

  // Check custom moderator role
  const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
  if (!config || !config.modRoleId) return false;

  return member.roles.cache.has(config.modRoleId);
};
