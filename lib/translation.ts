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

// Get alternative translations using MyMemory Translation API (free, provides alternatives)
async function getAlternativeTranslations(text: string, mainTranslation: string): Promise<string[]> {
  try {
    // Clean the text (remove extra spaces, lowercase for single words)
    const cleanText = text.trim().toLowerCase();
    const isSingleWord = /^[a-zA-Z]+$/.test(cleanText);
    
    if (!isSingleWord) {
      // For phrases, return empty alternatives (DeepL handles phrases well)
      return [];
    }

    // Use MyMemory Translation API to get alternatives
    // This API provides multiple translation options
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|el&de=your-email@example.com`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const alternatives: string[] = [];

    // MyMemory returns matches array with different translations
    if (data.matches && Array.isArray(data.matches)) {
      const seen = new Set<string>([mainTranslation.toLowerCase()]);
      
      for (const match of data.matches) {
        if (match.translation && match.quality > 0.5) {
          const alt = match.translation.trim();
          const altLower = alt.toLowerCase();
          
          // Avoid duplicates and the main translation
          if (!seen.has(altLower) && alt !== mainTranslation) {
            alternatives.push(alt);
            seen.add(altLower);
            
            // Limit to 10 alternatives
            if (alternatives.length >= 10) break;
          }
        }
      }
    }

    return alternatives;
  } catch (error) {
    console.error("Error fetching alternative translations:", error);
    return [];
  }
}

// DeepL translation
async function translateDeepL(text: string): Promise<{ translatedText: string; alternatives?: string[] }> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPL_API_KEY is not set");
  }

  // Determine API endpoint: use Pro endpoint by default, or Free if DEEPL_API_FREE=true
  const useFreeApi = process.env.DEEPL_API_FREE === "true";
  const apiUrl = useFreeApi 
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Authorization": `DeepL-Auth-Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: [text],
      target_lang: "EL", // Greek
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`DeepL API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const mainTranslation = data.translations[0].text;
  
  // Get alternative translations using MyMemory API (for single words)
  const alternatives = await getAlternativeTranslations(text, mainTranslation);
  
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

