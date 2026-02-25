import { NextRequest, NextResponse } from "next/server";

const LIVEAVATAR_API_URL =
  process.env.LIVEAVATAR_API_URL || "https://api.liveavatar.com";
const LIVEAVATAR_API_KEY = process.env.LIVEAVATAR_API_KEY || "";

const activeSessions = new Map<string, { sessionId: string; sessionToken: string }>();

async function closeExistingSession(sessionToken?: string, sessionId?: string) {
  if (sessionToken && sessionId) {
    try {
      await fetch(`${LIVEAVATAR_API_URL}/v1/streaming.stop`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      console.log("Closed session:", sessionId);
    } catch (error) {
      console.error("Error closing session:", error);
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("body", body);

    const { avatarId, voiceId } = body;

    if (!avatarId) {
      return NextResponse.json(
        { error: "avatarId is required" },
        { status: 400 }
      );
    }

    // Close any existing session first
    const existingSession = activeSessions.get("current");
    if (existingSession) {
      console.log("Closing existing session before creating new one");
      await closeExistingSession(existingSession.sessionToken, existingSession.sessionId);
      activeSessions.delete("current");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const response = await fetch(`${LIVEAVATAR_API_URL}/v1/sessions/token`, {
      method: "POST",
      headers: {
        "X-API-KEY": LIVEAVATAR_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        mode: "FULL",
        avatar_id: avatarId,
        avatar_persona: {
          voice_id: "c2527536-6d1f-4412-a643-53a3497dada9",
          language: "ja",
        },
      }),
    });
    console.log("response", response);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.message || "Failed to create session token" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("data", data);

    activeSessions.set("current", {
      sessionId: data.data.session_id,
      sessionToken: data.data.session_token,
    });

    // DO NOT start the session here - let the frontend handle it
    // This avoids the "session already exists" error when frontend calls session.start()
    
    return NextResponse.json({
      sessionId: data.data.session_id,
      sessionToken: data.data.session_token,
    });
  } catch (error) {
    console.error("Error creating session token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sessionId, sessionToken } = body;
    
    await closeExistingSession(sessionToken, sessionId);
    activeSessions.delete("current");
    
    return NextResponse.json({ message: "Session closed successfully" });
  } catch (error) {
    console.error("Error closing session:", error);
    return NextResponse.json(
      { error: "Failed to close session" },
      { status: 500 }
    );
  }
}
