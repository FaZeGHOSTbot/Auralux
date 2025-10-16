const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const GuildConfig = require("../models/guildConfig");


module.exports = (client) => {
  // Helper: fetch the log channel from DB
  const getLogChannel = async (guild) => {
    if (!guild) return null;
    const config = await GuildConfig.findOne({ guildId: guild.id });
    if (!config?.logChannelId) return null;
    const channel = guild.channels.cache.get(config.logChannelId);
    return channel || null;
  };

  // Helper: send an embed to the log channel
  const sendLog = async (guild, embed) => {
    const channel = await getLogChannel(guild);
    if (channel) channel.send({ embeds: [embed] }).catch(() => {});
  };

  /* =======================
     🗑️ MESSAGE DELETE
  ======================= */
  client.on("messageDelete", async (message) => {
    if (!message.guild || message.author?.bot) return;

    const embed = new EmbedBuilder()
      .setTitle("🗑️ Message Deleted")
      .addFields(
        { name: "User", value: `${message.author.tag}\n🆔 ${message.author.id}`, inline: true },
        { name: "Channel", value: `${message.channel}`, inline: true },
        {
          name: "Message Content",
          value: message.content ? message.content.slice(0, 1024) : "📎 Attachment / No Text",
        }
      )
      .setColor(0xff0000)
      .setTimestamp();

    if (message.attachments.size > 0) {
      embed.addFields({
        name: "Attachments",
        value: message.attachments.map(a => a.url).join("\n").slice(0, 1024),
      });
    }

    sendLog(message.guild, embed);
  });

  /* =======================
     👋 MEMBER JOIN / LEAVE
  ======================= */
  client.on("guildMemberAdd", async (member) => {
    const embed = new EmbedBuilder()
      .setTitle("✅ Member Joined")
      .setDescription(`${member.user.tag} joined the server.\n🆔 ${member.id}`)
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0x00ff00)
      .setTimestamp();

    sendLog(member.guild, embed);
  });

  client.on("guildMemberRemove", async (member) => {
    const embed = new EmbedBuilder()
      .setTitle("❌ Member Left")
      .setDescription(`${member.user.tag} left the server.\n🆔 ${member.id}`)
      .setThumbnail(member.user.displayAvatarURL())
      .setColor(0xff5555)
      .setTimestamp();

    sendLog(member.guild, embed);
  });

  /* =======================
     🔊 VOICE STATE UPDATES
  ======================= */
  client.on("voiceStateUpdate", async (oldState, newState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;

    let embed;

    if (!oldState.channel && newState.channel) {
      embed = new EmbedBuilder()
        .setTitle("🔊 Voice Channel Join")
        .setDescription(`${member.user.tag} joined ${newState.channel}`)
        .setColor(0x00ff00)
        .setTimestamp();
    } else if (oldState.channel && !newState.channel) {
      embed = new EmbedBuilder()
        .setTitle("🔇 Voice Channel Leave")
        .setDescription(`${member.user.tag} left ${oldState.channel}`)
        .setColor(0xff5555)
        .setTimestamp();
    } else if (oldState.channelId !== newState.channelId) {
      embed = new EmbedBuilder()
        .setTitle("🔁 Voice Channel Move")
        .setDescription(`${member.user.tag} moved from ${oldState.channel} → ${newState.channel}`)
        .setColor(0x3498db)
        .setTimestamp();
    }

    if (embed) sendLog(member.guild, embed);
  });

  /* =======================
     🚫 USER DISCONNECTED BY MOD
  ======================= */
  client.on("voiceStateUpdate", async (oldState, newState) => {
    if (!oldState.channel && !newState.channel) return;

    const fetchedLogs = await oldState.guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MemberDisconnect,
    }).catch(() => {});
    const disconnectLog = fetchedLogs?.entries.first();
    if (disconnectLog && Date.now() - disconnectLog.createdTimestamp < 2000) {
      const { executor, target } = disconnectLog;
      const embed = new EmbedBuilder()
        .setTitle("❌ User Disconnected by Moderator")
        .setDescription(`${target.tag} was disconnected by ${executor.tag}`)
        .setColor(0xff9900)
        .setTimestamp();
      sendLog(oldState.guild, embed);
    }
  });

  /* =======================
     🔗 INVITE CREATION
  ======================= */
  client.on("inviteCreate", async (invite) => {
    const embed = new EmbedBuilder()
      .setTitle("🔗 Invite Created")
      .addFields(
        { name: "Code", value: invite.code, inline: true },
        { name: "Channel", value: `${invite.channel}`, inline: true },
        { name: "Created By", value: `${invite.inviter.tag}\n🆔 ${invite.inviter.id}`, inline: true },
        { name: "Uses", value: `${invite.uses ?? 0}`, inline: true },
        { name: "Max Uses", value: `${invite.maxUses ?? "Unlimited"}`, inline: true },
        {
          name: "Expires",
          value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt / 1000)}:R>` : "Never",
          inline: true,
        }
      )
      .setColor(0x7289da)
      .setTimestamp();

    sendLog(invite.guild, embed);
  });
};
