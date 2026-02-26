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

// Character settings
export interface CharacterSettings {
  expression?: string;
  super_resolution?: boolean;
  matting?: boolean;
}

// Voice settings
export interface VoiceSettings {
  speed?: number;
  pitch?: number;
  emotion?: string;
}

// Caption settings
export type CaptionTextAlign = "left" | "center" | "right";
export interface CaptionSettings {
  color?: string;
  text_align?: CaptionTextAlign;
}

// Background settings
export type BackgroundType = "color" | "image" | "video";
export interface BackgroundSettings {
  type: BackgroundType;
  color?: string;
  image_asset_id?: string;
  video_asset_id?: string;
}

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
  characterSettings?: CharacterSettings;
  voiceSettings?: VoiceSettings;
  captionSettings?: CaptionSettings;
  backgroundSettings?: BackgroundSettings;
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
          ...(payload.characterSettings?.expression && {
            expression: payload.characterSettings.expression,
          }),
          ...(payload.characterSettings?.super_resolution !== undefined && {
            super_resolution: payload.characterSettings.super_resolution,
          }),
          ...(payload.characterSettings?.matting !== undefined && {
            matting: payload.characterSettings.matting,
          }),
        }
      : {
          type: "talking_photo" as const,
          talking_photo_id: payload.characterId,
          ...(payload.characterSettings?.expression && {
            expression: payload.characterSettings.expression,
          }),
          ...(payload.characterSettings?.super_resolution !== undefined && {
            super_resolution: payload.characterSettings.super_resolution,
          }),
          ...(payload.characterSettings?.matting !== undefined && {
            matting: payload.characterSettings.matting,
          }),
        };

  const voice: Record<string, unknown> = {
    type: "text",
    input_text: payload.text,
    voice_id: payload.voiceId,
    speed: payload.voiceSettings?.speed ?? 1,
    pitch: payload.voiceSettings?.pitch ?? 0,
    duration: "1",
  };

  if (payload.voiceSettings?.emotion) {
    voice.emotion = payload.voiceSettings.emotion;
  }

  const videoInput: Record<string, unknown> = {
    character,
    voice,
  };

  if (payload.includeCaptions) {
    const textObject: Record<string, unknown> = {
      type: "text",
      text: payload.text,
      line_height: payload.lineHeight || 1.2,
    };

    if (payload.captionSettings?.color) {
      textObject.color = payload.captionSettings.color;
    }

    if (payload.captionSettings?.text_align) {
      textObject.text_align = payload.captionSettings.text_align;
    }

    videoInput.text = textObject;
  }

  if (payload.backgroundSettings) {
    const backgroundObject: Record<string, unknown> = {
      type: payload.backgroundSettings.type,
    };

    if (
      payload.backgroundSettings.type === "color" &&
      payload.backgroundSettings.color
    ) {
      backgroundObject.color = payload.backgroundSettings.color;
    } else if (payload.backgroundSettings.type === "image") {
      if (payload.backgroundSettings.image_asset_id) {
        backgroundObject.image_asset_id =
          payload.backgroundSettings.image_asset_id;
      }
    } else if (payload.backgroundSettings.type === "video") {
      if (payload.backgroundSettings.video_asset_id) {
        backgroundObject.video_asset_id =
          payload.backgroundSettings.video_asset_id;
      }
    }

    videoInput.background = backgroundObject;
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
