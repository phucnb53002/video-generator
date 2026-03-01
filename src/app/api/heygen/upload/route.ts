import { NextResponse } from "next/server";

const HEYGEN_UPLOAD_URL = process.env.HEYGEN_UPLOAD_URL || "https://upload.heygen.com";
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || "";

const getUploadHeaders = (contentType: string) => ({
  "X-API-Key": HEYGEN_API_KEY,
  "Content-Type": contentType,
});

export interface HeyGenAsset {
  id: string;
  name: string;
  file_type: "image" | "video" | "audio";
  folder_id: string;
  created_ts: number;
  url: string;
  image_key?: string;
}

export interface UploadAssetResponse {
  code: number;
  data: HeyGenAsset;
  message: string;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    const mimeType = file.type;
    const validMimeTypes = [
      "image/png",
      "image/jpeg",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
    ];

    if (!validMimeTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Invalid file type. Supported types: ${validMimeTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer);

    const response = await fetch(`${HEYGEN_UPLOAD_URL}/v1/asset`, {
      method: "POST",
      headers: getUploadHeaders(mimeType),
      body: fileContent,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.message || `Upload failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data: UploadAssetResponse = await response.json();

    if (data.code !== 100) {
      return NextResponse.json(
        { error: data.message || "Upload failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      asset_id: data.data.id,
      url: data.data.url,
      file_type: data.data.file_type,
      name: data.data.name,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
