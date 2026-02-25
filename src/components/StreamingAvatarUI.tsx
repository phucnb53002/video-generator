"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Modal from "./Modal";
import { VoiceItem } from "@/lib/heygen";
import {
  LiveAvatarSession,
  SessionEvent,
  AgentEventsEnum,
  SessionState,
} from "@heygen/liveavatar-web-sdk";

interface StreamingAvatar {
  id: string;
  name: string;
  previewImage: string;
}

interface StreamingAvatarUIProps {
  voices: VoiceItem[];
  voicesLoading: boolean;
  onLoadVoices: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export default function StreamingAvatarUI({
  voices,
  voicesLoading,
  onLoadVoices,
  onError,
  onSuccess,
}: StreamingAvatarUIProps) {
  const [streamingAvatars, setStreamingAvatars] = useState<StreamingAvatar[]>(
    []
  );
  const [streamingAvatarsLoading, setStreamingAvatarsLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<StreamingAvatar | null>(
    null
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [userInputText, setUserInputText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<SessionState>(
    SessionState.INACTIVE
  );

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [tempSelectedAvatarId, setTempSelectedAvatarId] = useState<
    string | null
  >(null);
  const [tempSelectedVoiceId, setTempSelectedVoiceId] = useState<string | null>(
    null
  );

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const avatarInstanceRef = useRef<LiveAvatarSession | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const loadStreamingAvatars = useCallback(async () => {
    setStreamingAvatarsLoading(true);
    try {
      const res = await fetch("/api/liveavatar/avatars");
      const data = await res.json();
      if (data.error) {
        onError(data.error);
      } else {
        setStreamingAvatars(data.avatars || []);
      }
    } catch {
      onError("Failed to load streaming avatars");
    } finally {
      setStreamingAvatarsLoading(false);
    }
  }, [onError]);

  const openAvatarModal = () => {
    setTempSelectedAvatarId(selectedAvatar?.id || null);
    setIsAvatarModalOpen(true);
    if (streamingAvatars.length === 0) {
      loadStreamingAvatars();
    }
  };

  const openVoiceModal = () => {
    setTempSelectedVoiceId(selectedVoiceId);
    setIsVoiceModalOpen(true);
    if (voices.length === 0) {
      onLoadVoices();
    }
  };

  const handleSelectAvatar = (id: string) => {
    setTempSelectedAvatarId(id);
  };

  const confirmAvatarSelection = () => {
    const avatar = streamingAvatars.find((a) => a.id === tempSelectedAvatarId);
    if (avatar) {
      setSelectedAvatar(avatar);
    }
    setIsAvatarModalOpen(false);
  };

  const confirmVoiceSelection = () => {
    setSelectedVoiceId(tempSelectedVoiceId);
    setIsVoiceModalOpen(false);
  };

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId);

  const cleanupAvatar = useCallback(async () => {
    const sessionId = sessionStorage.getItem("heygen_session_id");
    const sessionToken = sessionStorage.getItem("heygen_session_token");

    // Stop the avatar instance first
    if (avatarInstanceRef.current) {
      try {
        console.log("Stopping avatar session...");
        await avatarInstanceRef.current.stop();
        console.log("Avatar session stopped successfully");
      } catch (error) {
        console.error("Error stopping avatar session:", error);
      }
      avatarInstanceRef.current = null;
    }

    // Wait for session to fully stop
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Notify server to close session
    if (sessionId && sessionToken) {
      try {
        console.log("Calling server to close session:", sessionId);
        const closeResponse = await fetch("/api/liveavatar/session", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, sessionToken }),
        });

        if (!closeResponse.ok) {
          console.error("Server failed to close session");
        } else {
          console.log("Server closed session successfully");
        }
      } catch (error) {
        console.error("Error closing session on server:", error);
      }
    }

    // Clear session storage
    sessionStorage.removeItem("heygen_session_id");
    sessionStorage.removeItem("heygen_session_token");

    // Wait additional time before clearing UI state
    await new Promise((resolve) => setTimeout(resolve, 500));

    setIsStreamReady(false);
    setStreamError(null);
    setConnectionState(SessionState.INACTIVE);
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupAvatar();
    };
  }, [cleanupAvatar]);

  const initStreamingAvatar = async () => {
    if (!selectedAvatar) {
      onError("Please select an avatar");
      return null;
    }

    // Cleanup any existing session
    console.log("Starting cleanup of previous session...");
    await cleanupAvatar();

    // Wait for cleanup to complete
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsStarting(true);
    setStreamError(null);
    setIsStreamReady(false);

    try {
      console.log("Creating new session...");
      const sessionResponse = await fetch("/api/liveavatar/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarId: selectedAvatar.id,
          voiceId: selectedVoiceId,
        }),
      });

      const sessionData = await sessionResponse.json();
      console.log("Session created:", {
        sessionId: sessionData.sessionId,
        hasSessionToken: !!sessionData.sessionToken,
      });

      if (sessionData.error) {
        throw new Error(sessionData.error);
      }

      if (!sessionData.sessionToken) {
        throw new Error("No session token received from server");
      }

      // Store session info
      sessionStorage.setItem("heygen_session_id", sessionData.sessionId);
      sessionStorage.setItem("heygen_session_token", sessionData.sessionToken);

      // Create session instance
      console.log("Creating LiveAvatarSession instance...");
      const session = new LiveAvatarSession(sessionData.sessionToken);

      // Setup event listeners BEFORE starting
      session.on(SessionEvent.SESSION_STATE_CHANGED, (state: SessionState) => {
        console.log("SESSION_STATE_CHANGED:", state);
        setConnectionState(state);
        if (state === SessionState.DISCONNECTED) {
          setIsStreamReady(false);
          setIsSpeaking(false);
        }
      });

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        console.log("SESSION_STREAM_READY fired");
        setIsStreamReady(true);
        setStreamError(null);
      });

      session.on(SessionEvent.SESSION_DISCONNECTED, (reason) => {
        console.log("SESSION_DISCONNECTED:", reason);
        setIsStreamReady(false);
        setIsSpeaking(false);
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        console.log("AVATAR_SPEAK_STARTED");
        setIsSpeaking(true);
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        console.log("AVATAR_SPEAK_ENDED");
        setIsSpeaking(false);
      });

      console.log("Starting session...");
      await session.start();
      console.log("Session started successfully");

      // Wait for video element to be available and stream to be ready
      console.log("Waiting for video element and stream readiness...");
      let retries = 0;
      while (!videoElementRef.current && retries < 20) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries++;
      }

      if (!videoElementRef.current) {
        console.warn("Video element still not available after retries");
      }

      // Additional delay to ensure stream is ready
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Attach video stream
      console.log("Attaching video stream...");
      if (videoElementRef.current) {
        session.attach(videoElementRef.current);
        console.log("Video stream attached successfully");
      } else {
        console.warn("Video element not available yet, stream may not display");
      }

      // Store session reference
      avatarInstanceRef.current = session;

      return session;
    } catch (error) {
      console.error("Error initializing streaming avatar:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to initialize streaming avatar";
      setStreamError(errorMessage);
      onError(errorMessage);

      // Cleanup on error
      await cleanupAvatar();
      return null;
    } finally {
      setIsStarting(false);
    }
  };

  const handleStartStream = async () => {
    await initStreamingAvatar();
  };

  const handleStopStream = async () => {
    await cleanupAvatar();
    onSuccess("Stream stopped");
  };

  const handleSpeak = async () => {
    const session = avatarInstanceRef.current;

    if (
      !userInputText.trim() ||
      !session ||
      connectionState !== SessionState.CONNECTED ||
      isSpeaking
    ) {
      return;
    }

    try {
      session.repeat(userInputText.trim());
      setUserInputText("");
    } catch (error) {
      console.error("Error speaking:", error);
      onError(error instanceof Error ? error.message : "Failed to speak");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSpeak();
    }
  };

  const handleBackToSetup = () => {
    cleanupAvatar();
  };

  const getConnectionStateText = () => {
    switch (connectionState) {
      case SessionState.CONNECTING:
        return "Connecting...";
      case SessionState.CONNECTED:
        return "Connected";
      case SessionState.DISCONNECTING:
        return "Disconnecting...";
      case SessionState.DISCONNECTED:
        return "Disconnected";
      default:
        return "Inactive";
    }
  };

  const canSendText =
    userInputText.trim() &&
    (connectionState === SessionState.CONNECTED || isStreamReady) &&
    !isSpeaking;

  // Can input text if connected and not speaking (regardless of text content)
  const canInputText =
    (connectionState === SessionState.CONNECTED || isStreamReady) &&
    !isSpeaking;

  // Render video stream UI (with connecting state)
  if (isStreamReady || connectionState === SessionState.CONNECTED) {
    return (
      <div className="space-y-6">
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Live Streaming
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  connectionState === SessionState.CONNECTED
                    ? "bg-green-100 text-green-700"
                    : connectionState === SessionState.CONNECTING
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {getConnectionStateText()}
              </span>
            </div>
            {!isStarting && (
              <button
                onClick={handleStopStream}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                Stop Stream
              </button>
            )}
          </div>

          {streamError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
              {streamError}
            </div>
          )}

          {/* Video Stream - Full Size */}
          <div
            className="mb-6 rounded-xl overflow-hidden bg-gray-900 relative"
            style={{ height: "500px" }}
          >
            <video
              ref={videoElementRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            {(!isStreamReady ||
              !connectionState ||
              connectionState === SessionState.CONNECTING) &&
              isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                  <div className="text-center text-gray-400">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>{getConnectionStateText()}</p>
                  </div>
                </div>
              )}
          </div>

          {isStreamReady && connectionState === SessionState.CONNECTED && (
            <>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={userInputText}
                    onChange={(e) => setUserInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type text for avatar to repeat..."
                    disabled={!canInputText}
                    className="w-full h-14 p-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  onClick={handleSpeak}
                  disabled={!canSendText}
                  className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
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
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Send
                </button>
              </div>

              {isSpeaking && (
                <div className="mt-3 text-center text-sm text-blue-600 font-medium">
                  Avatar is speaking...
                </div>
              )}

              <button
                onClick={handleBackToSetup}
                className="w-full py-3 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to Setup
              </button>
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Avatar Selection
        </h2>
        <button
          onClick={openAvatarModal}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {selectedAvatar?.previewImage ? (
                <Image
                  src={selectedAvatar.previewImage}
                  alt={selectedAvatar.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg
                    className="w-10 h-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Selected Avatar</p>
              <p className="font-semibold text-gray-900 truncate">
                {selectedAvatar?.name || "Click to select"}
              </p>
            </div>
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Voice Selection (Optional)
        </h2>
        <button
          onClick={openVoiceModal}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-7 h-7 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Selected Voice</p>
              <p className="font-semibold text-gray-900 truncate">
                {selectedVoice?.name || "Click to select (optional)"}
              </p>
            </div>
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
        </button>
      </section>

      {streamError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {streamError}
        </div>
      )}

      <button
        onClick={handleStartStream}
        disabled={!selectedAvatar || isStarting}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
      >
        {isStarting ? (
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
            Starting Stream...
          </>
        ) : (
          "Start Stream"
        )}
      </button>

      <Modal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        title="Select Avatar"
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
              disabled={!tempSelectedAvatarId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              Confirm Selection
            </button>
          </>
        }
      >
        {streamingAvatarsLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {streamingAvatars.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => handleSelectAvatar(avatar.id)}
                className={`p-3 rounded-xl border-2 transition-all text-left ${
                  tempSelectedAvatarId === avatar.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-full h-24 bg-gray-100 rounded-lg overflow-hidden mb-2">
                  {avatar.previewImage ? (
                    <Image
                      src={avatar.previewImage}
                      alt={avatar.name}
                      width={120}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg
                        className="w-8 h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <p className="font-medium text-sm truncate">{avatar.name}</p>
                {tempSelectedAvatarId === avatar.id && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-2">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        title="Select Voice (Optional)"
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
          <div className="space-y-2">
            <button
              onClick={() => setTempSelectedVoiceId(null)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                tempSelectedVoiceId === null
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium">No Voice (Use Avatar Default)</p>
              </div>
              {tempSelectedVoiceId === null && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
              )}
            </button>
            {voices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setTempSelectedVoiceId(voice.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  tempSelectedVoiceId === voice.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{voice.name}</p>
                </div>
                {tempSelectedVoiceId === voice.id && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
