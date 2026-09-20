import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params; // ✅ Await params (Next.js 15)

    const db = await getDB();
    const result = await db.collection("results").findOne({ runId });

    if (!result) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json({
      runId: result.runId,
      input: result.input,
      status: result.status,
      progress: result.progress || {},
      state: result.state || {},
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      completedAt: result.completedAt,
      error: result.error,
    });
  } catch (error) {
    console.error("Error fetching result:", error);
    return NextResponse.json(
      { error: "Failed to fetch result" },
      { status: 500 },
    );
  }
}
