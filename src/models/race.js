const mongoose = require("mongoose");

const raceSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  race: { type: String, required: true },
});

module.exports = mongoose.model("Race", raceSchema);
