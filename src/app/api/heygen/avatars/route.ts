import { NextResponse } from "next/server";
import { fetchCharacters, CharacterItem } from "@/lib/heygen";

export async function GET() {
  try {
    const characters: CharacterItem[] = await fetchCharacters();
    return NextResponse.json({ characters });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch avatars";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
