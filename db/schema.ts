import { pgTable, text, timestamp, uuid, integer, doublePrecision, boolean } from "drizzle-orm/pg-core";

export const books = pgTable("books", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  type: text("type").default("text").notNull(), // 'epub', 'pdf', 'text'
  category: text("category").default("book").notNull(), // 'book', 'note', 'resource', etc.
  content: text("content"), // For plain text books
  pdfUrl: text("pdf_url"), // For PDF books (stored as base64 or URL)
  epubUrl: text("epub_url"), // For EPUB books (stored as base64 or URL)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vocabulary = pgTable("vocabulary", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  bookId: uuid("book_id").references(() => books.id).notNull(),
  term: text("term").notNull(),
  termNormalized: text("term_normalized"), // Normalized version for caching (lowercase, trimmed)
  translation: text("translation").notNull(), // Greek translation
  context: text("context").notNull(), // Snippet of text around the word
  kind: text("kind").default("word").notNull(), // 'word' or 'phrase'
  isKnown: boolean("is_known").default(false).notNull(), // Mark as known - don't show in lookups
  pageNumber: integer("page_number"), // For PDFs
  position: integer("position"), // Character position in text
  epubLocation: text("epub_location"), // EPUB CFI location string
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const flashcards = pgTable("flashcards", {
  id: uuid("id").defaultRandom().primaryKey(),
  vocabularyId: uuid("vocabulary_id").references(() => vocabulary.id).notNull(),
  userId: text("user_id").notNull(),
  easeFactor: doublePrecision("ease_factor").default(2.5).notNull(), // SM-2 ease factor
  interval: integer("interval").default(1).notNull(), // Days until next review
  repetitions: integer("repetitions").default(0).notNull(),
  dueAt: timestamp("due_at").defaultNow().notNull(),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const translationCache = pgTable("translation_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceText: text("source_text").notNull(),
  targetLanguage: text("target_language").default("el").notNull(), // el = Greek
  translatedText: text("translated_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wishlist = pgTable("wishlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  author: text("author"), // Optional author name
  notes: text("notes"), // Optional notes about why they want to read it
  priority: integer("priority").default(0), // 0 = normal, 1 = high, -1 = low
  status: text("status").default("want_to_read"), // 'want_to_read', 'reading', 'completed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  bookId: uuid("book_id").references(() => books.id).notNull(),
  title: text("title"), // Optional bookmark title/note
  epubLocation: text("epub_location"), // EPUB CFI location
  pageNumber: integer("page_number"), // Page number for PDFs
  position: integer("position"), // Character position for text
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

