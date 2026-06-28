export type NameValidationResult =
  | {
      ok: true;
      value: string;
    }
  | {
      ok: false;
      reason: string;
    };

const ALLOWED_NAME_PATTERN = /^[A-Za-z0-9 ._'!-]+$/;
const BLOCKED_SUBSTRINGS = [
  "motherfucker",
  "fuck",
  "shit",
  "cunt",
  "bitch",
  "asshole",
  "bastard",
  "bollocks",
  "bugger",
  "nigger",
  "nigga",
  "faggot",
  "porn",
  "porno",
  "hentai",
  "onlyfans",
  "nude",
  "naked",
  "rapist",
  "incest",
  "blowjob",
  "handjob",
  "cumshot",
  "vagina",
  "penis",
  "pussy",
  "dildo",
  "orgasm",
  "xxx",
  "nazi",
  "hitler",
  "kkk"
];
const BLOCKED_EXACT_TERMS = ["sex", "sexy", "dick", "slut", "whore", "cum", "jizz", "boobs", "tits", "fag", "rape", "anal", "cock"];
const LEET_REPLACEMENTS: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "9": "g",
  "!": "i"
};

export function normalizeName(input: unknown): string {
  if (typeof input !== "string") {
    return "";
  }

  return input.trim().replace(/\s+/g, " ");
}

export function validateName(input: unknown): NameValidationResult {
  const value = normalizeName(input);

  if (value.length < 2) {
    return { ok: false, reason: "Use at least 2 characters." };
  }

  if (value.length > 16) {
    return { ok: false, reason: "Keep the name to 16 characters or fewer." };
  }

  if (!ALLOWED_NAME_PATTERN.test(value)) {
    return { ok: false, reason: "Use letters, numbers, spaces, and simple punctuation only." };
  }

  const searchable = normalizeForSafetyCheck(value).replace(/[^a-z]/g, "");
  const tokens = normalizeForSafetyCheck(value).split(/[^a-z]+/).filter(Boolean);
  if (
    BLOCKED_SUBSTRINGS.some((term) => searchable.includes(term)) ||
    BLOCKED_EXACT_TERMS.includes(searchable) ||
    tokens.some((token) => BLOCKED_EXACT_TERMS.includes(token))
  ) {
    return { ok: false, reason: "Choose a different name." };
  }

  return { ok: true, value };
}

function normalizeForSafetyCheck(value: string): string {
  return value.toLowerCase().replace(/[01345789!]/g, (character) => LEET_REPLACEMENTS[character] ?? character);
}
