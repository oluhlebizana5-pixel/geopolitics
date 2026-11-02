// Country code used by the game (3 letters, e.g. "ZAF") -> code used by the flag-icons package (2 letters, e.g. "za").
const ALPHA2: Record<string, string> = {
  IND: "in", CHN: "cn", USA: "us", IDN: "id", PAK: "pk", NGA: "ng", BRA: "br", BGD: "bd", RUS: "ru", ETH: "et",
  MEX: "mx", JPN: "jp", EGY: "eg", PHL: "ph", VNM: "vn", IRN: "ir", TUR: "tr", DEU: "de", THA: "th", GBR: "gb",
  FRA: "fr", ZAF: "za", ITA: "it", KEN: "ke", COL: "co", KOR: "kr", ESP: "es", ARG: "ar", CAN: "ca", UKR: "ua",
  POL: "pl", MAR: "ma", GHA: "gh", SAU: "sa", AUS: "au", CHL: "cl", NLD: "nl", ZWE: "zw", RWA: "rw", CUB: "cu",
  SWE: "se", PRT: "pt", ISR: "il", SGP: "sg", NOR: "no", NZL: "nz", NAM: "na", BWA: "bw", LSO: "ls", SWZ: "sz",
  FJI: "fj", MLT: "mt", ISL: "is", VAT: "va",
};

export function flagCode(code: string): string | null {
  return ALPHA2[code.toUpperCase()] ?? null;
}

// Every player id looks like "player-ZAF": the flag of the country that player started with.
export function playerFlagCode(playerId: string): string {
  return playerId.replace(/^player-/, "");
}
