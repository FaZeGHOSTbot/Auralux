const RARITY_XP_VALUES = {
  mortal: 400,
  ascended: 1200,
  legendary: 4000,
  mythic: 10000,
  divine: 22500,
};

function calculateSacrificeXP(targetCard, sacrificeCards) {
  let totalXP = 0;

  for (const s of sacrificeCards) {
    const baseXP = RARITY_XP_VALUES[s.rarity] || 0;
    let multiplier = 1.0;

    if (s.name === targetCard.name && s.race === targetCard.race) multiplier = 2.0;
    else if (s.name === targetCard.name) multiplier = 1.5;
    else if (s.race === targetCard.race) multiplier = 1.25;

    totalXP += baseXP * multiplier;
  }

  return Math.floor(totalXP);
}

function xpNeededForLevel(level) {
  const BASE = 150;
  const EXP = 1.5;
  return Math.floor(BASE * Math.pow(level, EXP));
}

function levelUpCard(card, gainedXP) {
  card.xp = (card.xp || 0) + gainedXP;

  while (card.xp >= xpNeededForLevel(card.level + 1) && card.level < 100) {
    card.level++;
  }

  return card;
}

module.exports = {
  calculateSacrificeXP,
  levelUpCard,
};
