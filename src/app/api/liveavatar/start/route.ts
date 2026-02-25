import { NextRequest, NextResponse } from "next/server";

const LIVEAVATAR_API_URL = process.env.LIVEAVATAR_API_URL || "https://api.liveavatar.com";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionToken } = body;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "sessionToken is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${LIVEAVATAR_API_URL}/v1/sessions/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.message || "Failed to start session" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      livekitUrl: data.livekit_url,
      livekitToken: data.livekit_token,
    });
  } catch (error) {
    console.error("Error starting session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
