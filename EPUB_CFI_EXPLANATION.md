# EPUB CFI (Canonical Fragment Identifier) Explanation

## What is CFI?

**CFI** stands for **Canonical Fragment Identifier**. It's a standard way to reference exact locations in EPUB files, similar to how URLs can have fragments (like `#section1`).

## Format Breakdown

A CFI looks like this:
```
epubcfi(/6/8!/4/106/1:234)
```

### Structure:

1. **`epubcfi(`** - Start marker
2. **`/6`** - Step 6 (could be chapter, section, or structural element)
3. **`/8!`** - Step 8 with text node indicator (`!` means it's a text node)
4. **`/4`** - Step 4 (nested element)
5. **`/106`** - Character offset 106
6. **`/1:234`** - Additional position info (character 234 in element 1)
7. **`)`** - End marker

### What the Numbers Mean:

- **Even numbers** (like `/6`, `/4`) typically represent structural elements (chapters, sections, paragraphs)
- **Odd numbers** (like `/106`) typically represent character positions or text offsets
- **`!`** indicates a text node (actual text content, not a container)
- The path navigates through the EPUB's XML structure

## Example:

For `epubcfi(/6/8!/4/106/...)`:
- `/6` = 6th major structural element (maybe Chapter 3, since counting starts at 0)
- `/8!` = 8th element that contains text
- `/4` = 4th nested element within that
- `/106` = 106th character position

## Why Use CFI?

1. **Precise**: Points to exact character positions in the book
2. **Persistent**: Works even if you change font size or device
3. **Standard**: Part of the EPUB 3 specification
4. **Navigation**: Can jump directly to that location in the reader

## In Reading Companion

When you save a word from an EPUB:
- The current CFI location is captured
- It's stored in the `epub_location` field
- You can use it to navigate back to where you found the word

## Display Format

In the vocabulary page, we format CFI to be more readable:
- `epubcfi(/6/8!/4/106/...)` → Shows as **"Ch. 3"** (extracting chapter number)
- If chapter can't be determined → Shows as **"CFI: epubcfi(/6/8!/4/106..."** (shortened)

## Future Enhancement

We could:
1. Parse CFI to show actual chapter names
2. Add a "Go to location" button that navigates to that spot in the book
3. Show more context (like "Chapter 3, paragraph 2")

