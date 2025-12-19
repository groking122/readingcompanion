# SQL Queries to Check Database

Use these queries in your **Neon Console** to check what's saved in the database.

## View All Books

```sql
SELECT 
  id,
  user_id,
  title,
  type,
  category,
  created_at,
  CASE 
    WHEN epub_url IS NOT NULL THEN 'Yes'
    WHEN pdf_url IS NOT NULL THEN 'Yes'
    WHEN content IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_content
FROM books
ORDER BY created_at DESC;
```

## View Default Books (Suggested Books)

```sql
SELECT 
  id,
  title,
  type,
  category,
  created_at,
  LENGTH(epub_url) as epub_size_bytes
FROM books
WHERE user_id = 'system_default'
ORDER BY title;
```

## Count Books by Type

```sql
SELECT 
  type,
  COUNT(*) as count
FROM books
GROUP BY type
ORDER BY count DESC;
```

## Count Books by User

```sql
SELECT 
  user_id,
  COUNT(*) as book_count
FROM books
GROUP BY user_id
ORDER BY book_count DESC;
```

## View Books with File Sizes

```sql
SELECT 
  title,
  type,
  user_id,
  LENGTH(COALESCE(epub_url, pdf_url, content, '')) as file_size_bytes,
  ROUND(LENGTH(COALESCE(epub_url, pdf_url, content, '')) / 1024.0 / 1024.0, 2) as file_size_mb
FROM books
WHERE epub_url IS NOT NULL OR pdf_url IS NOT NULL OR content IS NOT NULL
ORDER BY file_size_bytes DESC;
```

## View Recent Books

```sql
SELECT 
  title,
  type,
  user_id,
  created_at
FROM books
ORDER BY created_at DESC
LIMIT 10;
```

## Check Specific Book

```sql
SELECT 
  *
FROM books
WHERE title ILIKE '%book title%';
```

## View Vocabulary Count

```sql
SELECT 
  COUNT(*) as total_words,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT book_id) as unique_books
FROM vocabulary;
```

## View Wishlist Items

```sql
SELECT 
  title,
  author,
  status,
  priority,
  created_at
FROM wishlist
ORDER BY created_at DESC;
```

