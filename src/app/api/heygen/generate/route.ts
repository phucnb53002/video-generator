import { NextResponse } from "next/server";
import {
  generateVideo,
  CharacterType,
  AspectRatio,
  TalkingStyle,
  CharacterSettings,
  VoiceSettings,
  CaptionSettings,
  BackgroundSettings,
} from "@/lib/heygen";

interface Payload {
  characterId: string;
  characterType: CharacterType;
  voiceId: string;
  text: string;
  aspectRatio: AspectRatio;
  talkingStyle: TalkingStyle;
  includeCaptions: boolean;
  lineHeight?: number;
  characterSettings?: CharacterSettings;
  voiceSettings?: VoiceSettings;
  captionSettings?: CaptionSettings;
  backgroundSettings?: BackgroundSettings;
}

export async function POST(request: Request) {
  try {
    const body: Payload = await request.json();

    const {
      characterId,
      characterType,
      voiceId,
      text,
      aspectRatio,
      talkingStyle,
      includeCaptions,
      lineHeight,
      characterSettings,
      voiceSettings,
      captionSettings,
      backgroundSettings,
    } = body;

    if (!characterId) {
      return NextResponse.json(
        { error: "Character is required" },
        { status: 400 }
      );
    }

    if (
      !characterType ||
      !["avatar", "talking_photo"].includes(characterType)
    ) {
      return NextResponse.json(
        { error: "Valid character type is required" },
        { status: 400 }
      );
    }

    if (!voiceId) {
      return NextResponse.json({ error: "Voice is required" }, { status: 400 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const result = await generateVideo({
      characterId,
      characterType: characterType as CharacterType,
      voiceId,
      text,
      aspectRatio: aspectRatio || "16:9",
      talkingStyle: talkingStyle || "stable",
      includeCaptions: includeCaptions || false,
      lineHeight,
      characterSettings,
      voiceSettings,
      captionSettings,
      backgroundSettings,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
