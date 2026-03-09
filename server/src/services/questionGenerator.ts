import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { KalakLanguage } from "shared/types";
import { CachedQuestion, FALLBACK_QUESTIONS } from "../data/fallbackQuestions";

const CACHE_PATH = path.join(__dirname, "../../../data/questionCache.json");

let cachedQuestions: CachedQuestion[] = [];

// Load cache from disk on startup
export function loadQuestionCache(): void {
  try {
    const raw = fs.readFileSync(CACHE_PATH, "utf-8");
    cachedQuestions = JSON.parse(raw);
    console.log(`Loaded ${cachedQuestions.length} cached questions`);
  } catch {
    cachedQuestions = [];
  }
}

function saveQuestionCache(): void {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cachedQuestions, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save question cache:", err);
  }
}

function matchesCategory(questionCat: string, selectedCategories: string[]): boolean {
  if (selectedCategories.length === 0) return true; // no filter = match all
  const qLower = questionCat.toLowerCase();
  return selectedCategories.some((c) => c.toLowerCase() === qLower);
}

function pickCachedQuestion(
  language: KalakLanguage,
  categories: string[],
  usedQuestions: string[]
): CachedQuestion | null {
  const usedSet = new Set(usedQuestions);
  const candidates = cachedQuestions.filter(
    (q) =>
      q.language === language &&
      matchesCategory(q.category, categories) &&
      !usedSet.has(q.question)
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickFallbackQuestion(
  language: KalakLanguage,
  categories: string[],
  usedQuestions: string[]
): CachedQuestion | null {
  const usedSet = new Set(usedQuestions);
  const candidates = FALLBACK_QUESTIONS.filter(
    (q) =>
      q.language === language &&
      matchesCategory(q.category, categories) &&
      !usedSet.has(q.question)
  );
  if (candidates.length === 0) {
    // If no matching category, try any in same language
    const anyLang = FALLBACK_QUESTIONS.filter(
      (q) => q.language === language && !usedSet.has(q.question)
    );
    if (anyLang.length === 0) return null;
    return anyLang[Math.floor(Math.random() * anyLang.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("No OPENAI_API_KEY set, skipping AI generation");
    return null;
  }
  return new OpenAI({ apiKey });
}

// Batch-generate 20 questions for a single category in one AI call
async function batchGenerateQuestions(
  language: KalakLanguage,
  category: string,
  count: number = 20
): Promise<CachedQuestion[]> {
  const openai = getOpenAI();
  if (!openai) return [];

  const lang = language === KalakLanguage.ARABIC ? "Arabic" : "English";

  // Gather existing questions for this category to avoid duplicates
  const existing = cachedQuestions
    .filter((q) => q.language === language && q.category.toLowerCase() === category.toLowerCase())
    .map((q) => q.question);

  const avoidList = existing.length > 0
    ? `\nAvoid these existing questions:\n${existing.slice(-30).map((q) => `- ${q}`).join("\n")}\n`
    : "";

  const prompt = `You are a trivia question generator for a party game called Kalak. Your questions should be:

- IRONIC, WITTY, and SURPRISING — the kind that make people go "wait, really?!"
- Fun facts that sound fake but are true
- Questions where the obvious answer is wrong
- Counterintuitive, bizarre, or delightfully absurd trivia
- NOT dry textbook questions — think "pub quiz meets comedy show"

Generate ${count} trivia questions in ${lang} about the topic "${category}".
CRITICAL RULES:
- Each answer must be SHORT (1-4 words)
- The answer must NEVER be "${category}" itself or contain the word "${category}" — questions should be ABOUT this topic, but the answer must be a specific fact, name, number, or detail
- Example: for category "France" do NOT answer "France" — instead ask things where the answer is "Croissants", "Napoleon", "3 colors", etc.
${avoidList}
Respond ONLY with a valid JSON array (no markdown, no code fences):
[{"question": "...", "answer": "..."}, ...]`;

  try {
    console.log(`Batch generating ${count} questions for "${category}" (${lang})...`);
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 1.0,
      max_tokens: 3000,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return [];

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let parsed: unknown;
    try { parsed = JSON.parse(cleaned); } catch { return []; }
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    const newQuestions: CachedQuestion[] = parsed
      .filter((item: { question?: string; answer?: string }) => item.question && item.answer)
      .map((item: { question: string; answer: string }) => ({
        question: item.question,
        answer: item.answer,
        language,
        category: category.toLowerCase(),
        createdAt: now,
      }));

    if (newQuestions.length > 0) {
      cachedQuestions.push(...newQuestions);
      saveQuestionCache();
      console.log(`Saved ${newQuestions.length} questions for "${category}"`);
    }

    return newQuestions;
  } catch (err) {
    console.error(`Batch generation failed for "${category}":`, err);
    return [];
  }
}

// Preload questions for all categories before game starts
export async function preloadCategories(
  language: KalakLanguage,
  categories: string[],
  freeMode: boolean
): Promise<void> {
  if (freeMode) {
    console.log("Free mode enabled — skipping AI preload");
    return;
  }

  for (const category of categories) {
    const existingCount = cachedQuestions.filter(
      (q) => q.language === language && q.category.toLowerCase() === category.toLowerCase()
    ).length;

    if (existingCount >= 20) {
      console.log(`Category "${category}" already has ${existingCount} cached questions, skipping`);
      continue;
    }

    const needed = 20 - existingCount;
    await batchGenerateQuestions(language, category, needed);
  }
}

async function generateFromAI(
  language: KalakLanguage,
  categories: string[],
  usedQuestions: string[]
): Promise<{ question: string; answer: string; category: string } | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  const lang = language === KalakLanguage.ARABIC ? "Arabic" : "English";
  const cats = categories.join(", ");
  const avoidList = usedQuestions.slice(-20).map((q) => `- ${q}`).join("\n");

  const prompt = `You are a trivia question generator for a party game called Kalak. Your questions should be:

- IRONIC, WITTY, and SURPRISING — the kind that make people go "wait, really?!"
- Fun facts that sound fake but are true
- Questions where the obvious answer is wrong
- Counterintuitive, bizarre, or delightfully absurd trivia
- NOT dry textbook questions — think "pub quiz meets comedy show"

Generate ONE trivia question in ${lang}.
Category: one of [${cats}]
CRITICAL RULES:
- The answer must be SHORT (1-4 words)
- The answer must NEVER be the category name itself — questions should be ABOUT the topic, but the answer must be a specific fact, name, number, or detail

${avoidList ? `Avoid these previously used questions:\n${avoidList}\n` : ""}
Respond ONLY with valid JSON (no markdown, no code fences):
{"question": "...", "answer": "...", "category": "..."}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 1.0,
      max_tokens: 200,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return null;

    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let parsed: { question?: string; answer?: string; category?: string };
    try { parsed = JSON.parse(cleaned); } catch { return null; }
    if (!parsed.question || !parsed.answer) return null;

    const matchedCat = categories.find(
      (c) => c.toLowerCase() === (parsed.category || "").toLowerCase()
    );

    return {
      question: parsed.question,
      answer: parsed.answer,
      category: matchedCat || categories[0],
    };
  } catch (err) {
    console.error("AI question generation failed:", err);
    return null;
  }
}

export async function generateQuestion(
  language: KalakLanguage,
  categories: string[],
  usedQuestions: string[],
  freeMode: boolean = false
): Promise<{ question: string; answer: string }> {
  // 1. Try cached questions first
  const cached = pickCachedQuestion(language, categories, usedQuestions);
  if (cached) {
    return { question: cached.question, answer: cached.answer };
  }

  // 2. Try AI generation (unless free mode)
  if (!freeMode) {
    const aiResult = await generateFromAI(language, categories, usedQuestions);
    if (aiResult) {
      // Save to cache
      const entry: CachedQuestion = {
        question: aiResult.question,
        answer: aiResult.answer,
        language,
        category: aiResult.category.toLowerCase(),
        createdAt: Date.now(),
      };
      cachedQuestions.push(entry);
      saveQuestionCache();
      return { question: aiResult.question, answer: aiResult.answer };
    }
  }

  // 3. Fallback to hardcoded questions
  const fallback = pickFallbackQuestion(language, categories, usedQuestions);
  if (fallback) {
    return { question: fallback.question, answer: fallback.answer };
  }

  // 4. Absolute last resort
  return {
    question: language === KalakLanguage.ARABIC
      ? "ما هو الحيوان الوحيد الذي لا يستطيع القفز؟"
      : "What is the only mammal that can't jump?",
    answer: language === KalakLanguage.ARABIC ? "الفيل" : "Elephant",
  };
}
