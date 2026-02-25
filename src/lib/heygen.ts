const HEYGEN_BASE_URL = process.env.HEYGEN_BASE_URL || "https://api.heygen.com";
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || "";

const getHeaders = () => ({
  "X-Api-Key": HEYGEN_API_KEY,
  "Content-Type": "application/json",
});

export type CharacterType = "avatar" | "talking_photo";

export interface CharacterItem {
  id: string;
  name: string;
  previewImage: string;
  type: CharacterType;
}

export interface VoiceItem {
  id: string;
  name: string;
  previewAudio?: string | null;
}

export type AspectRatio = "16:9" | "9:16" | "1:1";
export type TalkingStyle = "stable" | "expressive";

export const ASPECT_RATIOS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

interface HeyGenAvatar {
  avatar_id: string;
  avatar_name?: string;
  preview_image_url?: string;
}

interface HeyGenTalkingPhoto {
  talking_photo_id: string;
  talking_photo_name?: string;
  preview_image_url?: string;
}

interface HeyGenVoice {
  voice_id: string;
  name?: string;
  preview_audio?: string;
}

interface AvatarsResponse {
  data: {
    avatars: HeyGenAvatar[];
    talking_photos: HeyGenTalkingPhoto[];
  };
}

interface VoicesResponse {
  data: {
    voices: HeyGenVoice[];
  };
}
const TARGET_TALKING_PHOTO_ID = "d2146c6f99c84b3084312dc82958a5b1";
export async function fetchCharacters(): Promise<CharacterItem[]> {
  const response = await fetch(`${HEYGEN_BASE_URL}/v2/avatars`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Failed to fetch avatars: ${response.status}`
    );
  }

  const data: AvatarsResponse = await response.json();

  // const avatars: CharacterItem[] = (data.data?.avatars || []).map(
  //   (avatar: HeyGenAvatar): CharacterItem => ({
  //     id: avatar.avatar_id,
  //     name: avatar.avatar_name || avatar.avatar_id,
  //     previewImage: avatar.preview_image_url || "",
  //     type: "avatar",
  //   })
  // );

  const talkingPhotos: CharacterItem[] = (data.data?.talking_photos || [])
    .filter((photo) => photo.talking_photo_id === TARGET_TALKING_PHOTO_ID)
    .map(
      (photo: HeyGenTalkingPhoto): CharacterItem => ({
        id: photo.talking_photo_id,
        name: photo.talking_photo_name || photo.talking_photo_id,
        previewImage: photo.preview_image_url || "",
        type: "talking_photo",
      })
    );

  return talkingPhotos;
}

export async function fetchVoices(): Promise<VoiceItem[]> {
  const response = await fetch(`${HEYGEN_BASE_URL}/v2/voices`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Failed to fetch voices: ${response.status}`
    );
  }

  const data: VoicesResponse = await response.json();

  return (data.data?.voices || []).map(
    (voice: HeyGenVoice): VoiceItem => ({
      id: voice.voice_id,
      name: voice.name || voice.voice_id,
      previewAudio: voice.preview_audio || null,
    })
  );
}

export interface GenerateVideoPayload {
  characterId: string;
  characterType: CharacterType;
  voiceId: string;
  text: string;
  aspectRatio: AspectRatio;
  talkingStyle: TalkingStyle;
  includeCaptions: boolean;
  lineHeight?: number;
}

export interface GenerateVideoResponse {
  video_id: string;
}

export async function generateVideo(
  payload: GenerateVideoPayload
): Promise<GenerateVideoResponse> {
  const { width, height } = ASPECT_RATIOS[payload.aspectRatio];

  const character =
    payload.characterType === "avatar"
      ? {
          type: "avatar" as const,
          avatar_id: payload.characterId,
          scale: 1,
          avatar_style: "normal",
          talking_style: payload.talkingStyle,
        }
      : {
          type: "talking_photo" as const,
          talking_photo_id: payload.characterId,
        };

  const videoInput: Record<string, unknown> = {
    character,
    voice: {
      type: "text",
      input_text: payload.text,
      voice_id: payload.voiceId,
      speed: "1",
      pitch: "0",
      duration: "1",
    },
  };

  if (payload.includeCaptions) {
    videoInput.text = {
      type: "text",
      text: payload.text,
      line_height: payload.lineHeight || 1.2,
    };
  }

  const requestBody = {
    caption: payload.includeCaptions,
    dimension: {
      width,
      height,
    },
    video_inputs: [videoInput],
  };

  const response = await fetch(`${HEYGEN_BASE_URL}/v2/video/generate`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Failed to generate video: ${response.status}`
    );
  }

  const responseData = await response.json();
  return {
    video_id: responseData.data?.video_id || responseData.video_id,
  };
}

export interface VideoStatusResponse {
  status: "pending" | "waiting" | "processing" | "completed" | "failed";
  video_url?: string;
  thumbnail_url?: string;
  error?: string;
}

export async function getVideoStatus(
  videoId: string
): Promise<VideoStatusResponse> {
  const response = await fetch(
    `${HEYGEN_BASE_URL}/v1/video_status.get?video_id=${videoId}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `Failed to get video status: ${response.status}`
    );
  }

  const responseData = await response.json();
  const data = responseData.data;

  return {
    status: (data?.status as VideoStatusResponse["status"]) || "processing",
    video_url: data?.video_url,
    thumbnail_url: data?.thumbnail_url,
    error: data?.error,
  };
}
