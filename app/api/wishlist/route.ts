import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { wishlist } from "@/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userWishlist = await db
      .select()
      .from(wishlist)
      .where(eq(wishlist.userId, user.id))
      .orderBy(desc(wishlist.createdAt))

    return NextResponse.json(userWishlist)
  } catch (error) {
    console.error("Error fetching wishlist:", error)
    return NextResponse.json(
      { error: "Failed to fetch wishlist" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, author, notes, priority, status } = body

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const [newItem] = await db
      .insert(wishlist)
      .values({
        userId: user.id,
        title: title.trim(),
        author: author?.trim() || null,
        notes: notes?.trim() || null,
        priority: priority || 0,
        status: status || "want_to_read",
      })
      .returning()

    return NextResponse.json(newItem)
  } catch (error) {
    console.error("Error creating wishlist item:", error)
    return NextResponse.json(
      { error: "Failed to create wishlist item" },
      { status: 500 }
    )
  }
}

