export const ADVANCE_COSTS = {
  characteristic: [
    [100, 250, 500],
    [250, 500, 750],
    [500, 750, 1000],
    [750, 1000, 1500],
    [1250, 1500, 2500]
  ],
  skill: {
    known: [100, 200, 300],
    trained: [200, 400, 600],
    experienced: [300, 600, 900],
    veteran: [400, 800, 1200]
  },
  talentTier: {
    1: [100, 200, 300],
    2: [200, 400, 600],
    3: [300, 600, 900],
    4: [400, 800, 1200],
    5: [500, 1000, 1500]
  }
};

export function normalizeAptitude(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchingAptitudes(actor, aptitudeNames = []) {
  const owned = new Set();
  for (const [key, value] of Object.entries(actor.system.aptitudes ?? {})) {
    if (value) owned.add(normalizeAptitude(key));
  }
  for (const value of Object.values(actor.system.aptitudeSlots ?? {})) {
    if (value) owned.add(normalizeAptitude(value));
  }
  return aptitudeNames.filter(Boolean).map(normalizeAptitude).filter(a => owned.has(a)).length;
}

export function characteristicAdvanceCost(actor, characteristicKey, aptitudePair = [characteristicKey]) {
  const c = actor.system.characteristics?.[characteristicKey];
  if (!c || c.advances >= 5) return null;
  const matches = matchingAptitudes(actor, aptitudePair);
  return ADVANCE_COSTS.characteristic[c.advances][Math.min(2, 2 - matches)];
}

export function skillAdvanceCost(actor, skillAptitudes, skill) {
  if (!skill) return null;
  const matches = matchingAptitudes(actor, skillAptitudes);
  if (!skill.known) return ADVANCE_COSTS.skill.known[Math.min(2, 2 - matches)];
  if (skill.advances >= 3) return null;
  const stage = ["trained", "experienced", "veteran"][skill.advances];
  return ADVANCE_COSTS.skill[stage][Math.min(2, 2 - matches)];
}

export function talentCost(actor, item) {
  const tier = Math.max(1, Math.min(5, Number(item.system.tier ?? 1)));
  const matches = matchingAptitudes(actor, [item.system.aptitude1, item.system.aptitude2]);
  return ADVANCE_COSTS.talentTier[tier][Math.min(2, 2 - matches)];
}
