// Soldiers allocated from population (millions), per the brief's table
export function soldiersForPopulation(population: number): number {
  const m = population / 1_000_000;
  if (m <= 5) return 1;
  if (m <= 10) return 2;
  if (m <= 25) return 3;
  if (m <= 50) return 4;
  if (m <= 75) return 5;
  if (m <= 100) return 6;
  if (m <= 125) return 7;
  if (m <= 150) return 8;
  return 9;
}

// Soldiers gained on conquest = max(2, floor(value / 2))
export function conquestReward(conqueredValue: number): number {
  return Math.max(2, Math.floor(conqueredValue / 2));
}

// 2 new soldiers per country held, from round 2 onward
export function reinforcementsFor(countriesHeld: number, round: number): number {
  return round >= 2 ? countriesHeld * 2 : 0;
}