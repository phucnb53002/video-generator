import { NextResponse } from "next/server";
import { fetchVoices, VoiceItem } from "@/lib/heygen";

export async function GET() {
  try {
    const voices: VoiceItem[] = await fetchVoices();
    return NextResponse.json({ voices });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch voices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
