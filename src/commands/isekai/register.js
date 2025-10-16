const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Race = require("../../models/race");

const races = [
  { name: "Human", description: "Adaptable and resilient." },
  { name: "Elf", description: "Graceful and wise." },
  { name: "Dwarf", description: "Sturdy and strong." },
  { name: "Demon", description: "Fierce and cunning." },
  { name: "Angel", description: "Radiant and noble." },
  { name: "Beastfolk", description: "Wild and instinctive." },
  { name: "Fairies", description: "Magical and small." },
  { name: "Vampires", description: "Elegant and eternal." },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register and get a permanent race"),

  async execute(interaction) {
    // Check if user already has a race
    const existing = await Race.findOne({ userId: interaction.user.id });
    if (existing)
      return interaction.reply({ content: "⚠️ You are already registered!", ephemeral: true });

    // Embed with race info
    // Embed with race info
const raceEmbed = new EmbedBuilder()
  .setTitle("🌟 Choose Your Fate")
  .setDescription(
    "React with ✅ to confirm your registration or ❌ to cancel.\n" +
    "Your race will be **permanently assigned** and **randomly chosen by the gods**!\n\n" +
    "**Available Races:**"
  )
  .setColor(0x00ffcc)
  .setFooter({ text: `Requested by: ${interaction.user.tag} | User ID: ${interaction.user.id}` });

// Updated short stories for each race
const raceStories = [
  { name: "Human", description: "Resourceful and resilient, thriving in all lands." },
  { name: "Elf", description: "Masters of nature, moving gracefully through forests." },
  { name: "Dwarf", description: "Forgers of mighty weapons and underground kingdoms." },
  { name: "Demon", description: "Cunning beings from the depths of chaos." },
  { name: "Angel", description: "Radiant protectors watching over the realms." },
  { name: "Beastfolk", description: "Savage yet noble, attuned to the wild." },
  { name: "Fairies", description: "Tiny tricksters with a spark of magic." },
  { name: "Vampires", description: "Eternal hunters of the night, elegant and feared." },
];

raceStories.forEach(r => raceEmbed.addFields({ name: r.name, value: r.description, inline: false }));

// Send the message to the channel (not ephemeral)
const msg = await interaction.channel.send({ embeds: [raceEmbed] });

// Send ephemeral hint to the user
await interaction.reply({ content: "✅ Check the message above and react to register!", ephemeral: true });

// Add reactions
await msg.react("✅");
await msg.react("❌");

// Reaction collector
const filter = (reaction, user) =>
  ["✅", "❌"].includes(reaction.emoji.name) && user.id === interaction.user.id;

const collector = msg.createReactionCollector({ filter, max: 1, time: 60000 });

collector.on("collect", async reaction => {
  if (reaction.emoji.name === "❌") {
    return msg.edit({ content: "❌ Registration cancelled.", embeds: [] });
  }

  if (reaction.emoji.name === "✅") {
    await msg.edit({ content: "⚡ The gods are deciding your fate...", embeds: [] });

    setTimeout(async () => {
      const chosenRace = raceStories[Math.floor(Math.random() * raceStories.length)];
      await Race.create({ userId: interaction.user.id, race: chosenRace.name });

      const assignedEmbed = new EmbedBuilder()
        .setTitle("✨ Your Race Has Been Chosen!")
        .setDescription(`You are a **${chosenRace.name}**!\n${chosenRace.description}`)
        .setColor(0x00ffcc)
        .setFooter({ text: `Assigned by: ${interaction.user.tag} | User ID: ${interaction.user.id}` })
        .setTimestamp();

      await msg.edit({ content: null, embeds: [assignedEmbed] });
    }, 3000);
  }
});

collector.on("end", collected => {
  if (collected.size === 0) {
    msg.edit({ content: "⏰ You did not react in time. Registration cancelled.", embeds: [] });
  }
});

  },
};
