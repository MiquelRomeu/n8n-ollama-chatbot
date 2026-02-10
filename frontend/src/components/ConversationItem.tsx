'use client';

import { Conversation } from '@/types';

interface Props {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export default function ConversationItem({ conversation, isActive, onSelect, onDelete }: Props) {
  return (
    <div
      onClick={onSelect}
      className={`group px-3 py-2 mx-2 rounded-lg cursor-pointer flex items-center justify-between
        ${isActive ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}
    >
      <span className="text-sm truncate flex-1">{conversation.title}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400
                   ml-2 text-xs shrink-0"
        title="Eliminar"
      >
        &times;
      </button>
    </div>
  );
}
