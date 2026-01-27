import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { db } from "@/db"
import { wishlist } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: itemId } = await params

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      )
    }

    // Verify the item belongs to the user
    const [item] = await db
      .select()
      .from(wishlist)
      .where(eq(wishlist.id, itemId))
      .limit(1)

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    if (item.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Delete the item
    await db.delete(wishlist).where(eq(wishlist.id, itemId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting wishlist item:", error)
    return NextResponse.json(
      { error: "Failed to delete wishlist item" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: itemId } = await params
    const body = await request.json()
    const { title, author, notes, priority, status } = body

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      )
    }

    // Verify the item belongs to the user
    const [item] = await db
      .select()
      .from(wishlist)
      .where(eq(wishlist.id, itemId))
      .limit(1)

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 })
    }

    if (item.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Update the item
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (title !== undefined) updateData.title = title.trim()
    if (author !== undefined) updateData.author = author?.trim() || null
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) updateData.status = status

    const [updatedItem] = await db
      .update(wishlist)
      .set(updateData)
      .where(eq(wishlist.id, itemId))
      .returning()

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error("Error updating wishlist item:", error)
    return NextResponse.json(
      { error: "Failed to update wishlist item" },
      { status: 500 }
    )
  }
}

