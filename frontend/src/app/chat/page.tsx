'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import ChatArea from '@/components/ChatArea';
import type { Conversation, Message } from '@/types';

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  }, []);

  const fetchMessages = useCallback(async (conversationId: number) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUserName(data.user.name);
      })
      .catch(() => {});
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, fetchMessages]);

  function handleSelectConversation(id: number) {
    setActiveConversationId(id);
  }

  function handleNewConversation() {
    setActiveConversationId(null);
    setMessages([]);
  }

  async function handleDeleteConversation(id: number) {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (activeConversationId === id) {
          setActiveConversationId(null);
          setMessages([]);
        }
        fetchConversations();
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  }

  async function handleSendMessage(text: string) {
    const tempUserMsg: Message = {
      id: Date.now(),
      conversation_id: activeConversationId || 0,
      role: 'user',
      content: text,
      tokens_used: 0,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_id: activeConversationId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          conversation_id: activeConversationId || 0,
          role: 'assistant',
          content: 'Error: ' + (data.error || 'No se pudo obtener respuesta'),
          tokens_used: 0,
          created_at: new Date().toISOString(),
        }]);
        return;
      }

      if (!activeConversationId && data.conversation_id) {
        setActiveConversationId(data.conversation_id);
        fetchConversations();
      }

      const assistantMsg: Message = {
        id: Date.now() + 1,
        conversation_id: data.conversation_id,
        role: 'assistant',
        content: data.response,
        tokens_used: 0,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        conversation_id: 0,
        role: 'assistant',
        content: 'Error de conexion con el servidor',
        tokens_used: 0,
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
        userName={userName}
      />
      <ChatArea
        messages={messages}
        loading={loading}
        onSend={handleSendMessage}
      />
    </div>
  );
}
