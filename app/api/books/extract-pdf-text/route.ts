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

    const extractedText = data.text.trim()
    
    // Check if PDF has no selectable text (scanned PDF)
    if (!extractedText || extractedText.length < 50) {
      return NextResponse.json(
        { 
          error: "SCANNED_PDF",
          message: "This PDF appears to be scanned (image-based) and doesn't contain selectable text. OCR (Optical Character Recognition) would be needed to extract text from it. Please upload a PDF with selectable text, or use an EPUB file instead.",
          numPages: data.numpages 
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      text: extractedText,
      numPages: data.numpages,
    })
  } catch (error) {
    console.error("Error extracting PDF text:", error)
    return NextResponse.json(
      { 
        error: "EXTRACTION_FAILED",
        message: "Failed to extract text from PDF. This PDF may be scanned (image-based) and require OCR, or it may be corrupted. Please try a different PDF or use an EPUB file instead."
      },
      { status: 500 }
    )
  }
}
