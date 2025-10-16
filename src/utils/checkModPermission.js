const GuildConfig = require("../models/guildConfig");
const { PermissionFlagsBits } = require("discord.js");

module.exports = async function hasModPermission(interaction) {
  // Server admins are always allowed
  if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  // Fetch server config
  const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
  if (!config) return false;

  // Check for multiple mod roles
  const modRoles = config.modRoleIds || [];
  if (modRoles.length === 0) return false;

  // Does member have at least one mod role?
  const hasRole = interaction.member.roles.cache.some(role => modRoles.includes(role.id));
  return hasRole;
};
