import { db } from "@/db";
import { translationCache } from "@/db/schema";
import { eq } from "drizzle-orm";

const PROVIDER = process.env.TRANSLATION_PROVIDER || "deepL";
const TARGET_LANG = "el"; // Greek

interface TranslationResult {
  translatedText: string;
  alternativeTranslations?: string[];
  cached: boolean;
}

// Check cache first
async function getCachedTranslation(text: string): Promise<string | null> {
  const cached = await db
    .select()
    .from(translationCache)
    .where(eq(translationCache.sourceText, text))
    .limit(1);

  if (cached.length > 0) {
    return cached[0].translatedText;
  }
  return null;
}

// Save to cache
async function saveTranslation(text: string, translated: string) {
  await db.insert(translationCache).values({
    sourceText: text,
    targetLanguage: TARGET_LANG,
    translatedText: translated,
  });
}

// DeepL translation
async function translateDeepL(text: string): Promise<{ translatedText: string; alternatives?: string[] }> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPL_API_KEY is not set");
  }

  const response = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: {
      "Authorization": `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      target_lang: "EL", // Greek
      alternatives: 6, // Get up to 6 alternative translations (we'll show top 2-3 in UI)
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepL API error: ${response.statusText}`);
  }

  const data = await response.json();
  const mainTranslation = data.translations[0].text;
  const alternatives = data.translations[0].alternatives
    ?.map((alt: any) => alt.text)
    .filter((alt: string) => alt !== mainTranslation)
    .slice(0, 6) || []; // Show up to 6 alternative translations
  
  return {
    translatedText: mainTranslation,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
  };
}

// LibreTranslate translation
async function translateLibreTranslate(text: string): Promise<{ translatedText: string; alternatives?: string[] }> {
  const apiUrl = process.env.LIBRETRANSLATE_API_URL || "https://libretranslate.com/translate";
  const apiKey = process.env.LIBRETRANSLATE_API_KEY;

  const body: any = {
    q: text,
    source: "en",
    target: "el", // Greek
    format: "text",
  };

  if (apiKey) {
    body.api_key = apiKey;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`LibreTranslate API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    translatedText: data.translatedText,
  };
}

// Google Translate (requires @google-cloud/translate package)
// For MVP, we'll use a simple approach - you can enhance this later
async function translateGoogle(text: string): Promise<{ translatedText: string; alternatives?: string[] }> {
  // Note: This is a placeholder. For production, use @google-cloud/translate
  // For now, we'll fallback to LibreTranslate if Google is selected but not configured
  throw new Error("Google Translate requires additional setup. Please use DeepL or LibreTranslate.");
}

export async function translate(text: string): Promise<TranslationResult> {
  // Always fetch fresh translation to get alternatives
  // (Cache is checked but we still fetch to ensure alternatives are available)
  const cached = await getCachedTranslation(text);
  
  // Translate based on provider
  let result: { translatedText: string; alternatives?: string[] };
  try {
    switch (PROVIDER.toLowerCase()) {
      case "deepl":
        result = await translateDeepL(text);
        break;
      case "libretranslate":
        result = await translateLibreTranslate(text);
        break;
      case "google":
        result = await translateGoogle(text);
        break;
      default:
        throw new Error(`Unknown translation provider: ${PROVIDER}`);
    }

    // Save to cache (only main translation) if not already cached
    if (!cached) {
      await saveTranslation(text, result.translatedText);
    }
    
    return { 
      translatedText: result.translatedText, 
      alternativeTranslations: result.alternatives,
      cached: !!cached 
    };
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

