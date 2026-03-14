import { GwdwLanguage } from "shared/types";

export interface CachedPrompt {
  prompt: string;
  language: GwdwLanguage;
  category: string;
  createdAt: number;
}

export const FALLBACK_PROMPTS: CachedPrompt[] = [
  // English - Personal
  { prompt: "What's your most irrational fear?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },
  { prompt: "What's the worst excuse you've used to get out of plans?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },
  { prompt: "What's your guilty pleasure TV show?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },
  { prompt: "What's the most embarrassing song on your playlist?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },
  { prompt: "What's the weirdest thing you've ever eaten?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },
  { prompt: "What's a habit you have that you're not proud of?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },
  { prompt: "What's the most useless skill you have?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },
  { prompt: "What childhood cartoon do you secretly still watch?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },
  { prompt: "What's the pettiest reason you've stopped talking to someone?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },
  { prompt: "What's the longest you've gone without showering?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },
  { prompt: "What's the weirdest dream you remember?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },
  { prompt: "What's a hill you're willing to die on?", language: GwdwLanguage.ENGLISH, category: "personal", createdAt: 0 },

  // English - Hypothetical
  { prompt: "If you could only eat one food forever, what would it be?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },
  { prompt: "If you woke up as the opposite gender, what's the first thing you'd do?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },
  { prompt: "If you could have dinner with anyone dead or alive, who?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },
  { prompt: "If you had to survive in the wild for a week, what's your first move?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },
  { prompt: "If you were a superhero, what would your lame superpower be?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },
  { prompt: "If you could time travel to one year, which year and why?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },
  { prompt: "If you were invisible for a day, what would you do?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },
  { prompt: "If you had to teach a class on any subject, what would it be?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },
  { prompt: "If you could swap lives with someone for a week, who?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },
  { prompt: "If you won a million dollars but had to spend it in 24 hours, how?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },
  { prompt: "If you could ban one thing from existing, what would it be?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },
  { prompt: "If you had to pick a new name for yourself, what would it be?", language: GwdwLanguage.ENGLISH, category: "hypothetical", createdAt: 0 },

  // English - Creative
  { prompt: "Describe your morning routine in exactly 5 words", language: GwdwLanguage.ENGLISH, category: "creative", createdAt: 0 },
  { prompt: "Write your autobiography title", language: GwdwLanguage.ENGLISH, category: "creative", createdAt: 0 },
  { prompt: "What would your wrestler entrance name be?", language: GwdwLanguage.ENGLISH, category: "creative", createdAt: 0 },
  { prompt: "Invent a new holiday — what's it called and why?", language: GwdwLanguage.ENGLISH, category: "creative", createdAt: 0 },
  { prompt: "Name your imaginary restaurant and its signature dish", language: GwdwLanguage.ENGLISH, category: "creative", createdAt: 0 },
  { prompt: "Write a terrible pickup line", language: GwdwLanguage.ENGLISH, category: "creative", createdAt: 0 },
  { prompt: "If you were a flavor of ice cream, what would you be called?", language: GwdwLanguage.ENGLISH, category: "creative", createdAt: 0 },
  { prompt: "Write a one-star review of your own life", language: GwdwLanguage.ENGLISH, category: "creative", createdAt: 0 },
  { prompt: "What would your warning label say?", language: GwdwLanguage.ENGLISH, category: "creative", createdAt: 0 },
  { prompt: "If you were a Wi-Fi network, what would your name be?", language: GwdwLanguage.ENGLISH, category: "creative", createdAt: 0 },

  // English - Spicy
  { prompt: "What's your biggest red flag?", language: GwdwLanguage.ENGLISH, category: "spicy", createdAt: 0 },
  { prompt: "What's the most questionable life decision you've made?", language: GwdwLanguage.ENGLISH, category: "spicy", createdAt: 0 },
  { prompt: "What's an unpopular opinion you genuinely believe?", language: GwdwLanguage.ENGLISH, category: "spicy", createdAt: 0 },
  { prompt: "What's the worst date you've ever been on?", language: GwdwLanguage.ENGLISH, category: "spicy", createdAt: 0 },
  { prompt: "What's a lie you've told that you never got caught for?", language: GwdwLanguage.ENGLISH, category: "spicy", createdAt: 0 },
  { prompt: "What's the pettiest thing you've ever done?", language: GwdwLanguage.ENGLISH, category: "spicy", createdAt: 0 },
  { prompt: "What's something you pretend to like but actually hate?", language: GwdwLanguage.ENGLISH, category: "spicy", createdAt: 0 },
  { prompt: "What's your toxic trait?", language: GwdwLanguage.ENGLISH, category: "spicy", createdAt: 0 },

  // Arabic - Personal
  { prompt: "ما هو أغرب خوف عندك؟", language: GwdwLanguage.ARABIC, category: "personal", createdAt: 0 },
  { prompt: "ما هو أسوأ عذر استخدمته للهروب من موعد؟", language: GwdwLanguage.ARABIC, category: "personal", createdAt: 0 },
  { prompt: "ما هو المسلسل اللي تتابعه بالسر؟", language: GwdwLanguage.ARABIC, category: "personal", createdAt: 0 },
  { prompt: "ما هي أحرج أغنية في قائمتك؟", language: GwdwLanguage.ARABIC, category: "personal", createdAt: 0 },
  { prompt: "ما هو أغرب شيء أكلته في حياتك؟", language: GwdwLanguage.ARABIC, category: "personal", createdAt: 0 },
  { prompt: "ما هي أكثر مهارة عديمة الفائدة عندك؟", language: GwdwLanguage.ARABIC, category: "personal", createdAt: 0 },
  { prompt: "ما هو أغرب حلم تتذكره؟", language: GwdwLanguage.ARABIC, category: "personal", createdAt: 0 },

  // Arabic - Hypothetical
  { prompt: "لو ما تقدر تاكل إلا أكلة وحدة لبقية حياتك، شو تختار؟", language: GwdwLanguage.ARABIC, category: "hypothetical", createdAt: 0 },
  { prompt: "لو تقدر تعيش في أي زمن، أي سنة تختار؟", language: GwdwLanguage.ARABIC, category: "hypothetical", createdAt: 0 },
  { prompt: "لو صرت غير مرئي ليوم واحد، شو تسوي؟", language: GwdwLanguage.ARABIC, category: "hypothetical", createdAt: 0 },
  { prompt: "لو ربحت مليون ولازم تصرفها في 24 ساعة، كيف؟", language: GwdwLanguage.ARABIC, category: "hypothetical", createdAt: 0 },
  { prompt: "لو تقدر تلغي شي من الوجود، شو يكون؟", language: GwdwLanguage.ARABIC, category: "hypothetical", createdAt: 0 },
  { prompt: "لو كنت بطل خارق، شو تكون قدرتك السخيفة؟", language: GwdwLanguage.ARABIC, category: "hypothetical", createdAt: 0 },

  // Arabic - Creative
  { prompt: "اكتب عنوان سيرتك الذاتية", language: GwdwLanguage.ARABIC, category: "creative", createdAt: 0 },
  { prompt: "لو كنت نكهة آيس كريم، شو اسمك؟", language: GwdwLanguage.ARABIC, category: "creative", createdAt: 0 },
  { prompt: "اكتب تقييم نجمة وحدة لحياتك", language: GwdwLanguage.ARABIC, category: "creative", createdAt: 0 },
  { prompt: "شو يكون اسم شبكة الواي فاي حقتك؟", language: GwdwLanguage.ARABIC, category: "creative", createdAt: 0 },
  { prompt: "اخترع عطلة جديدة — شو اسمها وليش؟", language: GwdwLanguage.ARABIC, category: "creative", createdAt: 0 },

  // Arabic - Spicy
  { prompt: "شو أكبر علم أحمر فيك؟", language: GwdwLanguage.ARABIC, category: "spicy", createdAt: 0 },
  { prompt: "شو أسوأ قرار اتخذته في حياتك؟", language: GwdwLanguage.ARABIC, category: "spicy", createdAt: 0 },
  { prompt: "شو رأي غير شعبي تؤمن فيه فعلاً؟", language: GwdwLanguage.ARABIC, category: "spicy", createdAt: 0 },
  { prompt: "شو أكثر شي تتظاهر إنك تحبه بس بالحقيقة تكرهه؟", language: GwdwLanguage.ARABIC, category: "spicy", createdAt: 0 },
  { prompt: "شو صفتك السامة؟", language: GwdwLanguage.ARABIC, category: "spicy", createdAt: 0 },
];
