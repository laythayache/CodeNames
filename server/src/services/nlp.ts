/**
 * NLP normalization for answer matching in Kalak.
 * Handles: case, whitespace, articles, punctuation, Arabic diacritics,
 * and fuzzy matching via Levenshtein distance.
 */

// Arabic diacritics (tashkeel) regex
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;

// Arabic alef variations → normalize to bare alef
const ALEF_VARIATIONS: Record<string, string> = {
  "\u0622": "\u0627", // آ → ا
  "\u0623": "\u0627", // أ → ا
  "\u0625": "\u0627", // إ → ا
};

// Arabic taa marbuta → haa
const TAA_MARBUTA = /\u0629/g; // ة → ه

// Arabic yaa variations
const YAA_ALEF_MAQSURA = /\u0649/g; // ى → ي

// English articles and common prefixes
const EN_ARTICLES = /^(the|a|an|is|are|was|were)\s+/i;

// Arabic articles
const AR_ARTICLES = /^(ال|و|ب|ل|ك)\s*/;

// Punctuation and extra whitespace
const PUNCTUATION = /[.,!?;:'"()\-_\/\\@#$%^&*+=<>{}[\]`~]+/g;

/**
 * Normalize a string for comparison. Produces a canonical form.
 */
export function normalizeAnswer(text: string): string {
  let s = text.trim().toLowerCase();

  // Remove punctuation
  s = s.replace(PUNCTUATION, " ");

  // Arabic-specific normalizations
  s = s.replace(ARABIC_DIACRITICS, "");
  for (const [from, to] of Object.entries(ALEF_VARIATIONS)) {
    s = s.replaceAll(from, to);
  }
  s = s.replace(TAA_MARBUTA, "\u0647");
  s = s.replace(YAA_ALEF_MAQSURA, "\u064A");

  // Remove articles
  s = s.replace(EN_ARTICLES, "");
  s = s.replace(AR_ARTICLES, "");

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Levenshtein distance between two strings.
 */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  // Use single array optimization
  const prev = Array.from({ length: n + 1 }, (_, i) => i);

  for (let i = 1; i <= m; i++) {
    let prevDiag = prev[0];
    prev[0] = i;

    for (let j = 1; j <= n; j++) {
      const temp = prev[j];
      if (a[i - 1] === b[j - 1]) {
        prev[j] = prevDiag;
      } else {
        prev[j] = 1 + Math.min(prevDiag, prev[j], prev[j - 1]);
      }
      prevDiag = temp;
    }
  }

  return prev[n];
}

/**
 * Check if two answers are "close enough" to be considered the same.
 * Used for: detecting correct answer matches AND merging duplicate fakes.
 */
export function answersMatch(a: string, b: string): boolean {
  const normA = normalizeAnswer(a);
  const normB = normalizeAnswer(b);

  // Exact match after normalization
  if (normA === normB) return true;

  // One contains the other (e.g., "elephant" vs "the elephant" after article removal)
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Fuzzy match with Levenshtein
  const maxLen = Math.max(normA.length, normB.length);
  if (maxLen === 0) return true;

  const dist = levenshtein(normA, normB);

  // Threshold: allow ~20% edit distance for short strings, stricter for longer
  if (maxLen <= 4) return dist <= 1;
  if (maxLen <= 8) return dist <= 2;
  return dist <= 3;
}

/**
 * Check if a player's submitted answer matches the correct answer.
 */
export function matchesCorrectAnswer(submitted: string, correct: string): boolean {
  return answersMatch(submitted, correct);
}

/**
 * Group a list of player answers by similarity, merging duplicates.
 * Returns groups where each group has the merged text and list of player IDs.
 */
export function groupSimilarAnswers(
  answers: { playerId: string; playerName: string; text: string }[]
): { text: string; playerIds: string[]; playerNames: string[] }[] {
  const groups: { text: string; playerIds: string[]; playerNames: string[] }[] = [];

  for (const answer of answers) {
    let merged = false;
    for (const group of groups) {
      if (answersMatch(answer.text, group.text)) {
        group.playerIds.push(answer.playerId);
        group.playerNames.push(answer.playerName);
        merged = true;
        break;
      }
    }
    if (!merged) {
      groups.push({
        text: answer.text,
        playerIds: [answer.playerId],
        playerNames: [answer.playerName],
      });
    }
  }

  return groups;
}
