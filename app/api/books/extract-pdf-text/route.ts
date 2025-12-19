import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { pdfData } = await request.json()

    if (!pdfData) {
      return NextResponse.json(
        { error: "PDF data is required" },
        { status: 400 }
      )
    }

    // Remove data URL prefix if present
    const base64Data = pdfData.includes(",") 
      ? pdfData.split(",")[1] 
      : pdfData

    // Convert base64 to Buffer
    const buffer = Buffer.from(base64Data, "base64")

    // Extract text using pdf-parse (dynamic import for ESM compatibility)
    const pdfParseModule = await import("pdf-parse")
    const pdfParse = (pdfParseModule as any).default || pdfParseModule
    const data = await pdfParse(buffer)

    return NextResponse.json({
      text: data.text.trim(),
      numPages: data.numpages,
    })
  } catch (error) {
    console.error("Error extracting PDF text:", error)
    return NextResponse.json(
      { error: "Failed to extract text from PDF. Please ensure the PDF contains text (not just images)." },
      { status: 500 }
    )
  }
}
