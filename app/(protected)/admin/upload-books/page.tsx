"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function UploadBooksPage() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [category, setCategory] = useState("book")
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Check if in development mode
  const isDevelopment = process.env.NODE_ENV === "development"

  if (!isDevelopment) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Not Available</h2>
            <p className="text-muted-foreground">
              This page is only available in development mode.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".epub")) {
        setMessage({ type: "error", text: "Only EPUB files are supported" })
        return
      }
      setFile(selectedFile)
      // Auto-fill title from filename if empty
      if (!title) {
        const filenameWithoutExt = selectedFile.name.replace(/\.epub$/i, "")
        setTitle(filenameWithoutExt)
      }
      setMessage(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title.trim()) {
      setMessage({ type: "error", text: "Please select an EPUB file and enter a title" })
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title.trim())
      if (author.trim()) formData.append("author", author.trim())
      formData.append("category", category)

      const res = await fetch("/api/admin/upload-suggested-book", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({
          type: "success",
          text: `Book "${data.book.title}" uploaded successfully! It's now available in Suggested Books.`,
        })
        // Reset form
        setFile(null)
        setTitle("")
        setAuthor("")
        setCategory("book")
        // Reset file input
        const fileInput = document.getElementById("file-input") as HTMLInputElement
        if (fileInput) fileInput.value = ""
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to upload book",
        })
      }
    } catch (error) {
      console.error("Error uploading book:", error)
      setMessage({
        type: "error",
        text: "Failed to upload book. Please try again.",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Suggested Book</h1>
        <p className="text-muted-foreground">
          Upload EPUB files to add them as suggested books (Development only)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload EPUB File</CardTitle>
          <CardDescription>
            The book will be stored in the database and appear in Suggested Books
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">EPUB File *</label>
              <div className="flex items-center gap-4">
                <Input
                  id="file-input"
                  type="file"
                  accept=".epub"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                {file && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{file.name}</span>
                    <span className="text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <Input
                placeholder="Book title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Author</label>
              <Input
                placeholder="Author name (optional)"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="book">Book</SelectItem>
                  <SelectItem value="Self-Improvement">Self-Improvement</SelectItem>
                  <SelectItem value="Productivity">Productivity</SelectItem>
                  <SelectItem value="Psychology">Psychology</SelectItem>
                  <SelectItem value="Spirituality">Spirituality</SelectItem>
                  <SelectItem value="Health">Health</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                  <SelectItem value="Career">Career</SelectItem>
                  <SelectItem value="Relationships">Relationships</SelectItem>
                  <SelectItem value="Philosophy">Philosophy</SelectItem>
                  <SelectItem value="Practical">Practical</SelectItem>
                  <SelectItem value="Motivation">Motivation</SelectItem>
                  <SelectItem value="Parenting">Parenting</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {message && (
              <div
                className={`p-4 rounded-md ${
                  message.type === "success"
                    ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                    : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={uploading || !file || !title.trim()}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Book"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Uploaded books are stored in the database with <code className="bg-muted px-1 rounded">user_id = "system_default"</code></p>
          <p>• They automatically appear in the Suggested Books page</p>
          <p>• Users can instantly add them to their library (no download needed)</p>
          <p>• This feature is only available in development mode</p>
        </CardContent>
      </Card>
    </div>
  )
}

