import { NextRequest, NextResponse } from "next/server";

const LIVE_AVATAR_API_URL =
  process.env.LIVE_AVATAR_API_URL || "https://api.liveavatar.com";
const LIVE_AVATAR_API_KEY = process.env.LIVE_AVATAR_API_KEY || "";

export interface StreamingAvatarItem {
  id: string;
  name: string;
  previewImage: string;
}

export async function GET() {
  try {
    const response = await fetch(`${LIVE_AVATAR_API_URL}/v1/avatars`, {
      method: "GET",
      headers: {
        "X-API-Key": LIVE_AVATAR_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.message || "Failed to fetch avatars" },
        { status: response.status }
      );
    }

    const userResponse = await response.json();

    const userData = userResponse?.data?.results || [];

    const avatars: StreamingAvatarItem[] = userData.map(
      (avatar: Record<string, unknown>) => ({
        id: (avatar.id as string) || "",
        name: (avatar.name as string) || "Unnamed Avatar",
        previewImage: (avatar.preview_url as string) || "",
      })
    );

    return NextResponse.json({ avatars });
  } catch (error) {
    console.error("Error fetching streaming avatars:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
