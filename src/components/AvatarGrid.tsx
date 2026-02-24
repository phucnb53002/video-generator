'use client';

import Image from 'next/image';
import { CharacterItem } from '@/lib/heygen';

interface CharacterGridProps {
  characters: CharacterItem[] | undefined;
  selectedCharacterId: string | null;
  selectedCharacterType: string | null;
  onSelect: (id: string, type: "avatar" | "talking_photo") => void;
  loading: boolean;
}

export default function CharacterGrid({
  characters = [],
  selectedCharacterId,
  selectedCharacterType,
  onSelect,
  loading,
}: CharacterGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-video bg-gray-200 rounded-lg mb-2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No characters available
      </div>
    );
  }

  const isSelected = (character: CharacterItem) =>
    selectedCharacterId === character.id &&
    selectedCharacterType === character.type;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {characters.map((character) => (
        <button
          key={`${character.type}-${character.id}`}
          onClick={() => onSelect(character.id, character.type)}
          className={`p-2 rounded-xl border-2 transition-all text-left hover:scale-105 ${
            isSelected(character)
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          {isSelected(character) && (
            <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center z-10">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
          )}
          <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2 relative">
            {character.previewImage ? (
              <Image
                src={character.previewImage}
                alt={character.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
            <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 bg-gray-900/70 text-white rounded">
              {character.type === 'avatar' ? 'Avatar' : 'Photo'}
            </span>
          </div>
          <p className="text-sm font-medium truncate">{character.name}</p>
        </button>
      ))}
    </div>
  );
}
