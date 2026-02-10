export interface User {
  id: number;
  external_id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens_used: number;
  created_at: string;
}

export interface ChatResponse {
  response: string;
  conversation_id: number;
}
