import { CountryData } from "./classes/Game";

// Approximate current populations. Check/update against
// https://www.worldometers.info/world-population/population-by-country/
export const COUNTRIES: CountryData[] = [
  { code: "IND", name: "India", population: 1_450_000_000 },
  { code: "CHN", name: "China", population: 1_419_000_000 },
  { code: "USA", name: "United States", population: 347_000_000 },
  { code: "IDN", name: "Indonesia", population: 284_000_000 },
  { code: "PAK", name: "Pakistan", population: 255_000_000 },
  { code: "NGA", name: "Nigeria", population: 237_000_000 },
  { code: "BRA", name: "Brazil", population: 212_000_000 },
  { code: "BGD", name: "Bangladesh", population: 175_000_000 },
  { code: "RUS", name: "Russia", population: 144_000_000 },
  { code: "ETH", name: "Ethiopia", population: 135_000_000 },
  { code: "MEX", name: "Mexico", population: 131_000_000 },
  { code: "JPN", name: "Japan", population: 123_000_000 },
  { code: "EGY", name: "Egypt", population: 118_000_000 },
  { code: "PHL", name: "Philippines", population: 116_000_000 },
  { code: "VNM", name: "Vietnam", population: 101_000_000 },
  { code: "IRN", name: "Iran", population: 92_000_000 },
  { code: "TUR", name: "Turkey", population: 87_000_000 },
  { code: "DEU", name: "Germany", population: 84_000_000 },
  { code: "THA", name: "Thailand", population: 71_000_000 },
  { code: "GBR", name: "United Kingdom", population: 69_000_000 },
  { code: "FRA", name: "France", population: 66_000_000 },
  { code: "ZAF", name: "South Africa", population: 64_000_000 },
  { code: "ITA", name: "Italy", population: 59_000_000 },
  { code: "KEN", name: "Kenya", population: 57_000_000 },
  { code: "COL", name: "Colombia", population: 53_000_000 },
  { code: "KOR", name: "South Korea", population: 52_000_000 },
  { code: "ESP", name: "Spain", population: 49_000_000 },
  { code: "ARG", name: "Argentina", population: 46_000_000 },
  { code: "CAN", name: "Canada", population: 40_000_000 },
  { code: "UKR", name: "Ukraine", population: 38_000_000 },
  { code: "POL", name: "Poland", population: 38_000_000 },
  { code: "MAR", name: "Morocco", population: 38_000_000 },
  { code: "GHA", name: "Ghana", population: 35_000_000 },
  { code: "SAU", name: "Saudi Arabia", population: 34_000_000 },
  { code: "AUS", name: "Australia", population: 27_000_000 },
  { code: "CHL", name: "Chile", population: 20_000_000 },
  { code: "NLD", name: "Netherlands", population: 18_000_000 },
  { code: "ZWE", name: "Zimbabwe", population: 16_000_000 },
  { code: "RWA", name: "Rwanda", population: 14_000_000 },
  { code: "CUB", name: "Cuba", population: 11_000_000 },
  { code: "SWE", name: "Sweden", population: 10_600_000 },
  { code: "PRT", name: "Portugal", population: 10_400_000 },
  { code: "ISR", name: "Israel", population: 9_500_000 },
  { code: "SGP", name: "Singapore", population: 6_000_000 },
  { code: "NOR", name: "Norway", population: 5_600_000 },
  { code: "NZL", name: "New Zealand", population: 5_300_000 },
  { code: "NAM", name: "Namibia", population: 3_000_000 },
  { code: "BWA", name: "Botswana", population: 2_600_000 },
  { code: "LSO", name: "Lesotho", population: 2_300_000 },
  { code: "SWZ", name: "Eswatini", population: 1_200_000 },
  { code: "FJI", name: "Fiji", population: 900_000 },
  { code: "MLT", name: "Malta", population: 540_000 },
  { code: "ISL", name: "Iceland", population: 390_000 },
  { code: "VAT", name: "Vatican City", population: 800 },
];

// 9 random opponents (never the player's own country)
export function pickOpponents(humanCode: string, rng: () => number = Math.random): CountryData[] {
  const pool = COUNTRIES.filter((c) => c.code !== humanCode);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 9);
}