'use client';

import { useState } from 'react';
import Image from 'next/image';
import Modal from './Modal';
import CharacterGrid from './AvatarGrid';
import { CharacterItem, VoiceItem } from '@/lib/heygen';

interface AgentVideoUIProps {
  characters: CharacterItem[];
  voices: VoiceItem[];
  charactersLoading: boolean;
  onLoadCharacters: () => void;
  selectedAvatar: CharacterItem | null;
  onSelectAvatar: (avatar: CharacterItem) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  selectedVoiceId: string | null;
  onSelectVoice: (voiceId: string | null) => void;
  duration: number;
  onDurationChange: (duration: number) => void;
  orientation: string;
  onOrientationChange: (orientation: string) => void;
  isGenerating: boolean;
  videoStatus: string;
  onGenerate: () => void;
  canGenerate: boolean | null;
}

export default function AgentVideoUI({
  characters,
  voices,
  charactersLoading,
  onLoadCharacters,
  selectedAvatar,
  onSelectAvatar,
  prompt,
  onPromptChange,
  selectedVoiceId,
  onSelectVoice,
  duration,
  onDurationChange,
  orientation,
  onOrientationChange,
  isGenerating,
  videoStatus,
  onGenerate,
  canGenerate,
}: AgentVideoUIProps) {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [tempSelectedAvatarId, setTempSelectedAvatarId] = useState<string | null>(null);
  const [tempSelectedAvatarType, setTempSelectedAvatarType] = useState<'avatar' | 'talking_photo' | null>(null);
  const [tempSelectedVoiceId, setTempSelectedVoiceId] = useState<string | null>(null);

  const openAvatarModal = () => {
    setTempSelectedAvatarId(selectedAvatar?.id || null);
    setTempSelectedAvatarType(selectedAvatar?.type || null);
    setIsAvatarModalOpen(true);
    if (characters.length === 0) {
      onLoadCharacters();
    }
  };

  const openVoiceModal = () => {
    setTempSelectedVoiceId(selectedVoiceId);
    setIsVoiceModalOpen(true);
  };

  const handleSelectAvatar = (id: string, type: 'avatar' | 'talking_photo') => {
    setTempSelectedAvatarId(id);
    setTempSelectedAvatarType(type);
  };

  const confirmAvatarSelection = () => {
    const avatar = characters.find(c => c.id === tempSelectedAvatarId && c.type === tempSelectedAvatarType);
    if (avatar) {
      onSelectAvatar(avatar);
    }
    setIsAvatarModalOpen(false);
  };

  const confirmVoiceSelection = () => {
    onSelectVoice(tempSelectedVoiceId);
    setIsVoiceModalOpen(false);
  };

  const selectedVoice = voices.find(v => v.id === selectedVoiceId);

  const isProcessing = videoStatus !== 'idle';

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
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Selected Avatar</p>
              <p className="font-semibold text-gray-900 truncate">
                {selectedAvatar?.name || 'Click to select'}
              </p>
            </div>
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Selected Voice</p>
              <p className="font-semibold text-gray-900 truncate">
                {selectedVoice?.name || 'Click to select (optional)'}
              </p>
            </div>
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        </button>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Video Settings
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (seconds)
            </label>
            <input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => onDurationChange(Number(e.target.value))}
              placeholder="e.g. 30"
              className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Orientation
            </label>
            <select
              value={orientation}
              onChange={(e) => onOrientationChange(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Agent Prompt
        </h2>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Enter agent instructions... (e.g., 'Hello, welcome to our service!')"
            className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none"
          />
          <div className="absolute bottom-3 right-3 text-sm text-gray-400">
            {prompt.length} characters
          </div>
        </div>
      </section>

      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating...
          </>
        ) : isProcessing ? (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Video {videoStatus}...
          </>
        ) : (
          'Generate Agent Video'
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
        {charactersLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <CharacterGrid
            characters={characters}
            selectedCharacterId={tempSelectedAvatarId}
            selectedCharacterType={tempSelectedAvatarType}
            onSelect={handleSelectAvatar}
            loading={false}
          />
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
        <div className="space-y-2">
          <button
            onClick={() => setTempSelectedVoiceId(null)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              tempSelectedVoiceId === null
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium">No Voice (Use Avatar Default)</p>
            </div>
            {tempSelectedVoiceId === null && (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
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
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{voice.name}</p>
              </div>
              {tempSelectedVoiceId === voice.id && (
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
