'use client';

import { Conversation } from '@/types';
import ConversationItem from './ConversationItem';

interface SidebarProps {
  conversations: Conversation[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
  userName: string;
}

export default function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, userName }: SidebarProps) {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <aside className="w-64 bg-gray-900 flex flex-col border-r border-gray-800 shrink-0">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-semibold">Chatbot</h1>
      </div>

      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full py-2 px-4 border border-gray-700 rounded-lg
                     hover:bg-gray-800 transition text-sm"
        >
          + Nueva conversacion
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="text-gray-500 text-xs text-center mt-4 px-3">
            No hay conversaciones
          </p>
        )}
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === activeId}
            onSelect={() => onSelect(conv.id)}
            onDelete={() => onDelete(conv.id)}
          />
        ))}
      </div>

      <div className="p-4 border-t border-gray-800 flex items-center justify-between">
        <span className="text-sm text-gray-400 truncate">{userName}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-400 hover:text-red-300 shrink-0"
        >
          Salir
        </button>
      </div>
    </aside>
  );
}
