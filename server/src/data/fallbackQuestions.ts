import { KalakLanguage } from "shared/types";

export interface CachedQuestion {
  question: string;
  answer: string;
  language: KalakLanguage;
  category: string;
  createdAt: number;
}

export const FALLBACK_QUESTIONS: CachedQuestion[] = [
  // English - General
  { question: "What country has more pyramids than Egypt?", answer: "Sudan", language: KalakLanguage.ENGLISH, category: "general", createdAt: 0 },
  { question: "What animal can't physically vomit?", answer: "Horses", language: KalakLanguage.ENGLISH, category: "general", createdAt: 0 },
  { question: "How many noses does a slug have?", answer: "Four", language: KalakLanguage.ENGLISH, category: "general", createdAt: 0 },
  { question: "What fruit was originally called a 'Chinese gooseberry'?", answer: "Kiwi", language: KalakLanguage.ENGLISH, category: "general", createdAt: 0 },
  { question: "What color is a hippo's sweat?", answer: "Pink", language: KalakLanguage.ENGLISH, category: "general", createdAt: 0 },

  // English - Science
  { question: "What planet rains diamonds?", answer: "Neptune", language: KalakLanguage.ENGLISH, category: "science", createdAt: 0 },
  { question: "How long is the memory of a goldfish — really?", answer: "Months", language: KalakLanguage.ENGLISH, category: "science", createdAt: 0 },
  { question: "What percentage of the ocean has been explored?", answer: "About 5%", language: KalakLanguage.ENGLISH, category: "science", createdAt: 0 },
  { question: "What element smells like garlic when heated?", answer: "Arsenic", language: KalakLanguage.ENGLISH, category: "science", createdAt: 0 },
  { question: "How many hearts does an octopus have?", answer: "Three", language: KalakLanguage.ENGLISH, category: "science", createdAt: 0 },

  // English - History
  { question: "What was the shortest war in history?", answer: "Anglo-Zanzibar War", language: KalakLanguage.ENGLISH, category: "history", createdAt: 0 },
  { question: "What did ancient Romans use as mouthwash?", answer: "Urine", language: KalakLanguage.ENGLISH, category: "history", createdAt: 0 },
  { question: "Which country invented ice cream?", answer: "China", language: KalakLanguage.ENGLISH, category: "history", createdAt: 0 },
  { question: "How long did the Hundred Years' War actually last?", answer: "116 years", language: KalakLanguage.ENGLISH, category: "history", createdAt: 0 },
  { question: "What was Cleopatra's native language?", answer: "Greek", language: KalakLanguage.ENGLISH, category: "history", createdAt: 0 },

  // English - Geography
  { question: "What capital city is built on 14 islands?", answer: "Stockholm", language: KalakLanguage.ENGLISH, category: "geography", createdAt: 0 },
  { question: "Which country has the most time zones?", answer: "France", language: KalakLanguage.ENGLISH, category: "geography", createdAt: 0 },
  { question: "What country is both in Europe and Asia?", answer: "Turkey", language: KalakLanguage.ENGLISH, category: "geography", createdAt: 0 },
  { question: "What is the driest continent on Earth?", answer: "Antarctica", language: KalakLanguage.ENGLISH, category: "geography", createdAt: 0 },
  { question: "Which African country has the most languages?", answer: "Nigeria", language: KalakLanguage.ENGLISH, category: "geography", createdAt: 0 },

  // English - Entertainment
  { question: "What is the best-selling video game of all time?", answer: "Minecraft", language: KalakLanguage.ENGLISH, category: "entertainment", createdAt: 0 },
  { question: "What movie was the first to gross $1 billion?", answer: "Titanic", language: KalakLanguage.ENGLISH, category: "entertainment", createdAt: 0 },
  { question: "What TV show character has been voiced by the same actor for 35+ years?", answer: "Homer Simpson", language: KalakLanguage.ENGLISH, category: "entertainment", createdAt: 0 },
  { question: "What board game has the most possible game states?", answer: "Go", language: KalakLanguage.ENGLISH, category: "entertainment", createdAt: 0 },
  { question: "What song has the longest title to reach #1 on Billboard?", answer: "I'm in Love with a Monster", language: KalakLanguage.ENGLISH, category: "entertainment", createdAt: 0 },

  // English - Food
  { question: "What nut is used to make marzipan?", answer: "Almonds", language: KalakLanguage.ENGLISH, category: "food", createdAt: 0 },
  { question: "What food never spoils?", answer: "Honey", language: KalakLanguage.ENGLISH, category: "food", createdAt: 0 },
  { question: "What fruit floats in water because it's 25% air?", answer: "Apple", language: KalakLanguage.ENGLISH, category: "food", createdAt: 0 },
  { question: "What spice is more expensive per gram than gold?", answer: "Saffron", language: KalakLanguage.ENGLISH, category: "food", createdAt: 0 },
  { question: "What vegetable was the first to be grown in space?", answer: "Potato", language: KalakLanguage.ENGLISH, category: "food", createdAt: 0 },

  // Arabic - General
  { question: "ما هو الحيوان الذي لا يشرب الماء أبداً؟", answer: "الكنغر الجرذ", language: KalakLanguage.ARABIC, category: "general", createdAt: 0 },
  { question: "ما هي الدولة التي بها أهرامات أكثر من مصر؟", answer: "السودان", language: KalakLanguage.ARABIC, category: "general", createdAt: 0 },
  { question: "كم عدد أنوف الحلزون؟", answer: "أربعة", language: KalakLanguage.ARABIC, category: "general", createdAt: 0 },
  { question: "ما هو لون عرق فرس النهر؟", answer: "وردي", language: KalakLanguage.ARABIC, category: "general", createdAt: 0 },
  { question: "أي حيوان لا يستطيع التقيؤ؟", answer: "الحصان", language: KalakLanguage.ARABIC, category: "general", createdAt: 0 },

  // Arabic - Science
  { question: "أي كوكب تمطر فيه الألماس؟", answer: "نبتون", language: KalakLanguage.ARABIC, category: "science", createdAt: 0 },
  { question: "كم قلب للأخطبوط؟", answer: "ثلاثة", language: KalakLanguage.ARABIC, category: "science", createdAt: 0 },
  { question: "ما نسبة المحيطات التي تم استكشافها؟", answer: "حوالي 5%", language: KalakLanguage.ARABIC, category: "science", createdAt: 0 },
  { question: "ما هو العنصر الذي يشبه رائحته الثوم عند تسخينه؟", answer: "الزرنيخ", language: KalakLanguage.ARABIC, category: "science", createdAt: 0 },
  { question: "ما هو أصلب مادة في جسم الإنسان؟", answer: "مينا الأسنان", language: KalakLanguage.ARABIC, category: "science", createdAt: 0 },

  // Arabic - History
  { question: "ما هي أقصر حرب في التاريخ؟", answer: "حرب بريطانيا وزنجبار", language: KalakLanguage.ARABIC, category: "history", createdAt: 0 },
  { question: "ما هي اللغة الأم لكليوباترا؟", answer: "اليونانية", language: KalakLanguage.ARABIC, category: "history", createdAt: 0 },
  { question: "أي دولة اخترعت الآيس كريم؟", answer: "الصين", language: KalakLanguage.ARABIC, category: "history", createdAt: 0 },
  { question: "كم سنة استمرت حرب المئة عام فعلياً؟", answer: "116 سنة", language: KalakLanguage.ARABIC, category: "history", createdAt: 0 },
  { question: "ماذا استخدم الرومان القدماء كغسول للفم؟", answer: "البول", language: KalakLanguage.ARABIC, category: "history", createdAt: 0 },

  // Arabic - Geography
  { question: "أي دولة لديها أكثر المناطق الزمنية؟", answer: "فرنسا", language: KalakLanguage.ARABIC, category: "geography", createdAt: 0 },
  { question: "ما هي أجف قارة على وجه الأرض؟", answer: "أنتاركتيكا", language: KalakLanguage.ARABIC, category: "geography", createdAt: 0 },
  { question: "ما هي العاصمة المبنية على 14 جزيرة؟", answer: "ستوكهولم", language: KalakLanguage.ARABIC, category: "geography", createdAt: 0 },
  { question: "أي دولة أفريقية لديها أكثر اللغات؟", answer: "نيجيريا", language: KalakLanguage.ARABIC, category: "geography", createdAt: 0 },
  { question: "ما هي أصغر دولة في العالم؟", answer: "الفاتيكان", language: KalakLanguage.ARABIC, category: "geography", createdAt: 0 },
];
