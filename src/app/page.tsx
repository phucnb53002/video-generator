"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/Modal";
import CharacterGrid from "@/components/AvatarGrid";
import VoiceList from "@/components/VoiceList";
import VideoPlayer from "@/components/VideoPlayer";
import SelectedCharacterDisplay from "@/components/SelectedCharacterDisplay";
import SelectedVoiceDisplay from "@/components/SelectedVoiceDisplay";
import AgentVideoUI from "@/components/AgentVideoUI";
import StreamingAvatarUI from "@/components/StreamingAvatarUI";
import {
  CharacterItem,
  VoiceItem,
  AspectRatio,
  TalkingStyle,
} from "@/lib/heygen";

type VideoStatus =
  | "idle"
  | "pending"
  | "waiting"
  | "processing"
  | "completed"
  | "failed";

type AppMode = "generate" | "agent" | "streaming";

interface Toast {
  id: string;
  message: string;
  type: "error" | "success";
}

export default function Home() {
  const [mode, setMode] = useState<AppMode>("generate");

  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [voices, setVoices] = useState<VoiceItem[]>([]);

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null
  );
  const [selectedCharacterType, setSelectedCharacterType] = useState<
    "avatar" | "talking_photo" | null
  >(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState("");
  const [selectedAspectRatio, setSelectedAspectRatio] =
    useState<AspectRatio>("16:9");
  const [selectedTalkingStyle, setSelectedTalkingStyle] =
    useState<TalkingStyle>("stable");
  const [includeCaptions, setIncludeCaptions] = useState(false);
  const [lineHeight, setLineHeight] = useState(1.2);

  const [charactersLoading, setCharactersLoading] = useState(false);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>("idle");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [agentVideoId, setAgentVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [tempSelectedCharacterId, setTempSelectedCharacterId] = useState<
    string | null
  >(null);
  const [tempSelectedCharacterType, setTempSelectedCharacterType] = useState<
    "avatar" | "talking_photo" | null
  >(null);
  const [tempSelectedVoiceId, setTempSelectedVoiceId] = useState<string | null>(
    null
  );

  const [agentSelectedAvatar, setAgentSelectedAvatar] =
    useState<CharacterItem | null>(null);
  const [agentPrompt, setAgentPrompt] = useState("");
  const [agentVoiceId, setAgentVoiceId] = useState<string | null>(null);
  const [agentDuration, setAgentDuration] = useState<number>(30);
  const [agentOrientation, setAgentOrientation] = useState<string>("portrait");

  const showToast = useCallback(
    (message: string, type: "error" | "success") => {
      const id = Math.random().toString(36).substring(7);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const loadCharacters = async () => {
    setCharactersLoading(true);
    try {
      const res = await fetch("/api/heygen/avatars");
      const data = await res.json();
      if (data.error) {
        showToast(data.error, "error");
      } else {
        setCharacters(data.characters || []);
      }
    } catch {
      showToast("Failed to load characters", "error");
    } finally {
      setCharactersLoading(false);
    }
  };

  const loadVoices = async () => {
    setVoicesLoading(true);
    try {
      const res = await fetch("/api/heygen/voices");
      const data = await res.json();
      if (data.error) {
        showToast(data.error, "error");
      } else {
        setVoices(data.voices || []);
      }
    } catch {
      showToast("Failed to load voices", "error");
    } finally {
      setVoicesLoading(false);
    }
  };

  const openAvatarModal = () => {
    setTempSelectedCharacterId(selectedCharacterId);
    setTempSelectedCharacterType(selectedCharacterType);
    setIsAvatarModalOpen(true);
    if (characters.length === 0) {
      loadCharacters();
    }
  };

  const openVoiceModal = () => {
    setTempSelectedVoiceId(selectedVoiceId);
    setIsVoiceModalOpen(true);
    if (voices.length === 0) {
      loadVoices();
    }
  };

  const handleSelectCharacter = (
    id: string,
    type: "avatar" | "talking_photo"
  ) => {
    setTempSelectedCharacterId(id);
    setTempSelectedCharacterType(type);
  };

  const handleSelectVoice = (voiceId: string) => {
    setTempSelectedVoiceId(voiceId);
  };

  const confirmAvatarSelection = () => {
    setSelectedCharacterId(tempSelectedCharacterId);
    setSelectedCharacterType(tempSelectedCharacterType);
    setIsAvatarModalOpen(false);
  };

  const confirmVoiceSelection = () => {
    setSelectedVoiceId(tempSelectedVoiceId);
    setIsVoiceModalOpen(false);
  };

  const generateVideo = async () => {
    if (
      !selectedCharacterId ||
      !selectedCharacterType ||
      !selectedVoiceId ||
      !scriptText.trim()
    ) {
      showToast("Please select character, voice, and enter text", "error");
      return;
    }

    setIsGenerating(true);
    setVideoStatus("pending");
    setVideoId(null);
    setVideoUrl(null);
    setThumbnailUrl(null);

    try {
      const res = await fetch("/api/heygen/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: selectedCharacterId,
          characterType: selectedCharacterType,
          voiceId: selectedVoiceId,
          text: scriptText,
          aspectRatio: selectedAspectRatio,
          talkingStyle: selectedTalkingStyle,
          includeCaptions,
          lineHeight,
        }),
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, "error");
        setVideoStatus("failed");
      } else {
        setVideoId(data.video_id);
        setVideoStatus("pending");
        showToast("Video generation started", "success");
      }
    } catch {
      showToast("Failed to generate video", "error");
      setVideoStatus("failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAgentVideo = async () => {
    if (!agentSelectedAvatar || !agentPrompt.trim()) {
      showToast("Please select avatar and enter prompt", "error");
      return;
    }

    setIsGenerating(true);
    setVideoStatus("pending");
    setAgentVideoId(null);
    setVideoUrl(null);
    setThumbnailUrl(null);

    const structuredPrompt = `${agentPrompt.trim()}

    Make this a ${agentDuration} second video. Use ${agentOrientation} format.`;

    try {
      const res = await fetch("/api/heygen/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarId: agentSelectedAvatar.id,
          prompt: structuredPrompt,
          durationSec: agentDuration,
          orientation: agentOrientation,
        }),
      });
      const data = await res.json();

      if (data.error) {
        showToast(data.error, "error");
        setVideoStatus("failed");
      } else {
        setAgentVideoId(data.video_id);
        setVideoStatus("pending");
        showToast("Agent video generation started", "success");
      }
    } catch {
      showToast("Failed to generate agent video", "error");
      setVideoStatus("failed");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!videoId) return;

    const isFinished = videoStatus === "completed" || videoStatus === "failed";
    if (isFinished) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/heygen/status?id=${videoId}`);
        const data = await res.json();

        if (data.error) {
          showToast(data.error, "error");
          setVideoStatus("failed");
          return;
        }

        setVideoStatus(data.status);

        if (data.status === "completed") {
          setVideoUrl(data.video_url || null);
          setThumbnailUrl(data.thumbnail_url || null);
          showToast("Video generation completed!", "success");
        } else if (data.status === "failed") {
          showToast(data.error || "Video generation failed", "error");
        }
      } catch (error) {
        console.error("Status poll error:", error);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 30000);
    return () => clearInterval(interval);
  }, [videoId, videoStatus, showToast]);
  console.log("agentID", agentVideoId);

  useEffect(() => {
    if (!agentVideoId) return;

    const isFinished = videoStatus === "completed" || videoStatus === "failed";
    if (isFinished) return;

    const pollAgentVideoStatus = async () => {
      try {
        const res = await fetch(`/api/heygen/status?id=${agentVideoId}`);
        const data = await res.json();
        console.log("data", data);

        if (data.error) {
          showToast(data.error, "error");
          setVideoStatus("failed");
          return;
        }

        setVideoStatus(data.status);

        if (data.status === "completed") {
          setVideoUrl(data.video_url || null);
          setThumbnailUrl(data.thumbnail_url || null);
          setAgentVideoId(null);
          showToast("Agent video generation completed!", "success");
        } else if (data.status === "failed") {
          setAgentVideoId(null);
          showToast(data.error || "Agent video generation failed", "error");
        }
      } catch (error) {
        console.error("Agent video status poll error:", error);
      }
    };

    pollAgentVideoStatus();
    const interval = setInterval(pollAgentVideoStatus, 20000);
    return () => clearInterval(interval);
  }, [agentVideoId, videoStatus, showToast]);

  const canGenerateGenerateMode =
    selectedCharacterId &&
    selectedCharacterType &&
    selectedVoiceId &&
    scriptText.trim().length > 0 &&
    videoStatus === "idle";

  const canGenerateAgentMode =
    agentSelectedAvatar &&
    agentPrompt.trim().length > 0 &&
    videoStatus === "idle" &&
    !agentVideoId;

  const selectedCharacter = characters.find(
    (c) => c.id === selectedCharacterId && c.type === selectedCharacterType
  );
  const selectedVoice = voices.find((v) => v.id === selectedVoiceId);

  const isProcessing = videoStatus !== "idle";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            HeyGen Video Generator
          </h1>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setMode("generate")}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                mode === "generate"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Generate Video
            </button>
            <button
              onClick={() => setMode("agent")}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                mode === "agent"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Agent Video
            </button>
            <button
              onClick={() => setMode("streaming")}
              className={`px-6 py-2 rounded-xl font-medium transition-all ${
                mode === "streaming"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Streaming Avatar
            </button>
          </div>
        </header>

        <div
          className={`grid gap-6 ${
            mode === "streaming"
              ? "grid-cols-1 max-w-2xl mx-auto"
              : "grid-cols-1 lg:grid-cols-2"
          }`}
        >
          <div className="animate-fade-in">
            {mode === "generate" ? (
              <>
                <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Character Selection
                  </h2>
                  <SelectedCharacterDisplay
                    name={selectedCharacter?.name || null}
                    imageUrl={selectedCharacter?.previewImage}
                    type={selectedCharacter?.type || null}
                    onClick={openAvatarModal}
                  />
                </section>

                <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Voice Selection
                  </h2>
                  <SelectedVoiceDisplay
                    name={selectedVoice?.name || null}
                    onClick={openVoiceModal}
                  />
                </section>

                <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Script Text
                  </h2>
                  <div className="relative">
                    <textarea
                      value={scriptText}
                      onChange={(e) => setScriptText(e.target.value)}
                      placeholder="Enter script text..."
                      className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                    />
                    <div className="absolute bottom-3 right-3 text-sm text-gray-400">
                      {scriptText.length} characters
                    </div>
                  </div>
                </section>

                <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Video Settings
                  </h2>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Aspect Ratio
                        </label>
                        <select
                          value={selectedAspectRatio}
                          onChange={(e) =>
                            setSelectedAspectRatio(
                              e.target.value as AspectRatio
                            )
                          }
                          className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                        >
                          <option value="16:9">16:9 (1920×1080)</option>
                          <option value="9:16">9:16 (1080×1920)</option>
                          <option value="1:1">1:1 (1080×1080)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Talking Style
                        </label>
                        <select
                          value={selectedTalkingStyle}
                          onChange={(e) =>
                            setSelectedTalkingStyle(
                              e.target.value as TalkingStyle
                            )
                          }
                          className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                        >
                          <option value="stable">Stable</option>
                          <option value="expressive">Expressive</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <input
                        type="checkbox"
                        id="includeCaptions"
                        checked={includeCaptions}
                        onChange={(e) => setIncludeCaptions(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label
                        htmlFor="includeCaptions"
                        className="text-sm font-medium text-gray-700"
                      >
                        Include Captions
                      </label>
                    </div>

                    {includeCaptions && (
                      <div className="animate-fade-in">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Line Height
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          max="3"
                          value={lineHeight}
                          onChange={(e) =>
                            setLineHeight(Number(e.target.value))
                          }
                          className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                      </div>
                    )}
                  </div>
                </section>

                <button
                  onClick={generateVideo}
                  disabled={!canGenerateGenerateMode}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {isGenerating || isProcessing ? (
                    <>
                      <svg
                        className="animate-spin w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Video {videoStatus}...
                    </>
                  ) : (
                    "Generate Video"
                  )}
                </button>
              </>
            ) : mode === "streaming" ? (
              <StreamingAvatarUI
                voices={voices}
                voicesLoading={voicesLoading}
                onLoadVoices={loadVoices}
                onError={(message) => showToast(message, "error")}
                onSuccess={(message) => showToast(message, "success")}
              />
            ) : (
              <AgentVideoUI
                characters={characters}
                voices={voices}
                charactersLoading={charactersLoading}
                onLoadCharacters={loadCharacters}
                selectedAvatar={agentSelectedAvatar}
                onSelectAvatar={setAgentSelectedAvatar}
                prompt={agentPrompt}
                onPromptChange={setAgentPrompt}
                selectedVoiceId={agentVoiceId}
                onSelectVoice={setAgentVoiceId}
                duration={agentDuration}
                onDurationChange={setAgentDuration}
                orientation={agentOrientation}
                onOrientationChange={setAgentOrientation}
                isGenerating={isGenerating}
                videoStatus={videoStatus}
                onGenerate={generateAgentVideo}
                canGenerate={canGenerateAgentMode}
              />
            )}
          </div>

          {mode !== "streaming" && (
            <div className="space-y-6">
              <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Video Preview
                </h2>
                {videoStatus === "idle" && (
                  <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <svg
                        className="w-16 h-16 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <p>Generate a video to preview</p>
                    </div>
                  </div>
                )}
                {(videoStatus === "pending" ||
                  videoStatus === "waiting" ||
                  videoStatus === "processing") && (
                  <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative w-20 h-20 mx-auto mb-4">
                        <div className="absolute inset-0 border-4 border-gray-300 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                      </div>
                      <p className="text-gray-600 font-medium">
                        {videoStatus === "pending" && "Video is queued..."}
                        {videoStatus === "waiting" && "Waiting to start..."}
                        {videoStatus === "processing" && "Processing..."}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        This may take a few minutes
                      </p>
                    </div>
                  </div>
                )}
                {videoStatus === "failed" && (
                  <div className="aspect-video bg-red-50 rounded-xl flex items-center justify-center">
                    <div className="text-center text-red-600">
                      <svg
                        className="w-16 h-16 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <p className="font-medium">Video generation failed</p>
                      <p className="text-sm mt-1">Please try again</p>
                    </div>
                  </div>
                )}
                {videoStatus === "completed" && videoUrl && (
                  <VideoPlayer
                    videoUrl={videoUrl}
                    thumbnailUrl={thumbnailUrl || undefined}
                  />
                )}
              </section>
            </div>
          )}
        </div>

        <Modal
          isOpen={isAvatarModalOpen}
          onClose={() => setIsAvatarModalOpen(false)}
          title="Select Character"
          footer={
            <>
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-4 py-2 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAvatarSelection}
                disabled={!tempSelectedCharacterId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                Confirm Selection
              </button>
            </>
          }
        >
          {charactersLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <CharacterGrid
              characters={characters}
              selectedCharacterId={tempSelectedCharacterId}
              selectedCharacterType={tempSelectedCharacterType}
              onSelect={handleSelectCharacter}
              loading={false}
            />
          )}
        </Modal>

        <Modal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          title="Select Voice"
          footer={
            <>
              <button
                onClick={() => setIsVoiceModalOpen(false)}
                className="px-4 py-2 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmVoiceSelection}
                disabled={!tempSelectedVoiceId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
              >
                Confirm Selection
              </button>
            </>
          }
        >
          {voicesLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <VoiceList
              voices={voices}
              selectedVoiceId={tempSelectedVoiceId}
              onSelect={handleSelectVoice}
              loading={false}
            />
          )}
        </Modal>

        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-up ${
                toast.type === "error"
                  ? "bg-red-600 text-white"
                  : "bg-green-600 text-white"
              }`}
            >
              {toast.type === "error" ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
