import { NextResponse } from "next/server";

interface AgentVideoPayload {
  avatarId: string;
  prompt: string;
  voiceId?: string;
  temperature?: number;
  durationSec?: number;
  orientation?: string;
}

export async function POST(request: Request) {
  try {
    const body: AgentVideoPayload = await request.json();

    const { avatarId, prompt, voiceId, temperature, durationSec, orientation } =
      body;

    if (!avatarId) {
      return NextResponse.json(
        { error: "Avatar is required" },
        { status: 400 }
      );
    }

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const config: Record<string, unknown> = {
      avatar_id: avatarId,
    };

    if (durationSec) {
      config.duration_sec = durationSec;
    }

    if (orientation) {
      config.orientation = orientation;
    }

    const requestBody = {
      prompt: prompt,
      config,
    };

    const response = await fetch(
      `${
        process.env.HEYGEN_BASE_URL || "https://api.heygen.com"
      }/v1/video_agent/generate`,
      {
        method: "POST",
        headers: {
          "X-Api-Key": process.env.HEYGEN_API_KEY || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error:
            error.message ||
            `Failed to generate agent video: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    return NextResponse.json({
      video_id: responseData.data?.video_id || responseData.video_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate agent video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
