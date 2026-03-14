import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { GwdwLanguage } from "shared/types";
import { CachedPrompt, FALLBACK_PROMPTS } from "../data/fallbackPrompts";

const CACHE_PATH = path.join(__dirname, "../../../data/promptCache.json");

let cachedPrompts: CachedPrompt[] = [];

export function loadPromptCache(): void {
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    cachedPrompts = JSON.parse(raw);
    console.log(`Loaded ${cachedPrompts.length} cached prompts`);
  } catch {
    cachedPrompts = [];
  }
}

function savePromptCache(): void {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cachedPrompts, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save prompt cache:", err);
  }
}

function matchesCategory(promptCat: string, selectedCategories: string[]): boolean {
  if (selectedCategories.length === 0) return true;
  const pLower = promptCat.toLowerCase();
  return selectedCategories.some((c) => c.toLowerCase() === pLower);
}

function pickCachedPrompt(
  language: GwdwLanguage,
  categories: string[],
  usedPrompts: string[]
): CachedPrompt | null {
  const usedSet = new Set(usedPrompts);
  const candidates = cachedPrompts.filter(
    (p) =>
      p.language === language &&
      matchesCategory(p.category, categories) &&
      !usedSet.has(p.prompt)
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickFallbackPrompt(
  language: GwdwLanguage,
  categories: string[],
  usedPrompts: string[]
): CachedPrompt | null {
  const usedSet = new Set(usedPrompts);
  const candidates = FALLBACK_PROMPTS.filter(
    (p) =>
      p.language === language &&
      matchesCategory(p.category, categories) &&
      !usedSet.has(p.prompt)
  );
  if (candidates.length === 0) {
    const anyLang = FALLBACK_PROMPTS.filter(
      (p) => p.language === language && !usedSet.has(p.prompt)
    );
    if (anyLang.length === 0) return null;
    return anyLang[Math.floor(Math.random() * anyLang.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

async function batchGeneratePrompts(
  language: GwdwLanguage,
  category: string,
  count: number = 20
): Promise<CachedPrompt[]> {
  const openai = getOpenAI();
  if (!openai) return [];

  const lang = language === GwdwLanguage.ARABIC ? "Arabic" : "English";

  const existing = cachedPrompts
    .filter((p) => p.language === language && p.category.toLowerCase() === category.toLowerCase())
    .map((p) => p.prompt);

  const avoidList = existing.length > 0
    ? `\nAvoid these existing prompts:\n${existing.slice(-30).map((p) => `- ${p}`).join("\n")}\n`
    : "";

  const promptText = `You are a prompt generator for a party game called "Guess Who Did What". Players anonymously answer a prompt, then others try to guess who wrote what.

Your prompts should be:
- FUN, PERSONAL, and REVEALING — the kind that make people laugh and debate
- Open-ended so everyone can answer differently
- Prompts where answers reveal personality, making it possible to guess the author
- NOT yes/no questions — they must require a creative/personal answer

Generate ${count} prompts in ${lang} for the category "${category}".
Categories: personal (about habits/preferences), hypothetical (what-if scenarios), creative (naming/inventing things), spicy (mildly embarrassing/controversial)
${avoidList}
Respond ONLY with a valid JSON array (no markdown, no code fences):
[{"prompt": "..."}, ...]`;

  try {
    console.log(`Batch generating ${count} GWDW prompts for "${category}" (${lang})...`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: promptText }],
      temperature: 1.0,
      max_tokens: 3000,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return [];

    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let parsed: unknown;
    try { parsed = JSON.parse(cleaned); } catch { return []; }
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    const newPrompts: CachedPrompt[] = parsed
      .filter((item: { prompt?: string }) => item.prompt)
      .map((item: { prompt: string }) => ({
        prompt: item.prompt,
        language,
        category: category.toLowerCase(),
        createdAt: now,
      }));

    if (newPrompts.length > 0) {
      cachedPrompts.push(...newPrompts);
      savePromptCache();
      console.log(`Saved ${newPrompts.length} GWDW prompts for "${category}"`);
    }

    return newPrompts;
  } catch (err) {
    console.error(`GWDW batch generation failed for "${category}":`, err);
    return [];
  }
}

export async function preloadPromptCategories(
  language: GwdwLanguage,
  categories: string[]
): Promise<void> {
  for (const category of categories) {
    const existingCount = cachedPrompts.filter(
      (p) => p.language === language && p.category.toLowerCase() === category.toLowerCase()
    ).length;

    if (existingCount >= 20) {
      console.log(`GWDW category "${category}" already has ${existingCount} cached prompts, skipping`);
      continue;
    }

    const needed = 20 - existingCount;
    await batchGeneratePrompts(language, category, needed);
  }
}

async function generateFromAI(
  language: GwdwLanguage,
  categories: string[],
  usedPrompts: string[]
): Promise<{ prompt: string; category: string } | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  const lang = language === GwdwLanguage.ARABIC ? "Arabic" : "English";
  const cats = categories.join(", ");
  const avoidList = usedPrompts.slice(-20).map((p) => `- ${p}`).join("\n");

  const promptText = `Generate ONE fun party game prompt in ${lang} for "Guess Who Did What".
Category: one of [${cats}]
The prompt should be open-ended, personal, and make people's answers reveal their personality.
${avoidList ? `Avoid these used prompts:\n${avoidList}\n` : ""}
Respond ONLY with valid JSON: {"prompt": "...", "category": "..."}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: promptText }],
      temperature: 1.0,
      max_tokens: 200,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return null;

    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let parsed: { prompt?: string; category?: string };
    try { parsed = JSON.parse(cleaned); } catch { return null; }
    if (!parsed.prompt) return null;

    const matchedCat = categories.find(
      (c) => c.toLowerCase() === (parsed.category || "").toLowerCase()
    );

    return { prompt: parsed.prompt, category: matchedCat || categories[0] };
  } catch (err) {
    console.error("GWDW AI prompt generation failed:", err);
    return null;
  }
}

export async function generatePrompt(
  language: GwdwLanguage,
  categories: string[],
  usedPrompts: string[]
): Promise<string> {
  // 1. Try cached prompts first
  const cached = pickCachedPrompt(language, categories, usedPrompts);
  if (cached) return cached.prompt;

  // 2. Try AI generation
  const aiResult = await generateFromAI(language, categories, usedPrompts);
  if (aiResult) {
    const entry: CachedPrompt = {
      prompt: aiResult.prompt,
      language,
      category: aiResult.category.toLowerCase(),
      createdAt: Date.now(),
    };
    cachedPrompts.push(entry);
    savePromptCache();
    return aiResult.prompt;
  }

  // 3. Fallback to hardcoded
  const fallback = pickFallbackPrompt(language, categories, usedPrompts);
  if (fallback) return fallback.prompt;

  // 4. Last resort
  return language === GwdwLanguage.ARABIC
    ? "ما هو أغرب شيء سويته اليوم؟"
    : "What's the strangest thing you did today?";
}
