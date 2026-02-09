-- =============================================
-- 1. USUARIOS
-- =============================================
CREATE TABLE IF NOT EXISTS chatbot_users (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_external_id
    ON chatbot_users(external_id);

-- =============================================
-- 2. SESIONES (login/logout del usuario)
-- =============================================
CREATE TABLE IF NOT EXISTS chatbot_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES chatbot_users(id) ON DELETE CASCADE,
    logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logged_out_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user
    ON chatbot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active
    ON chatbot_sessions(user_id, is_active);

-- =============================================
-- 3. CONVERSACIONES (hilos de chat)
--    Se pueden renombrar, crear nuevas, soft-delete
-- =============================================
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES chatbot_users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'Nueva conversacion',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_conversations_user
    ON chatbot_conversations(user_id, is_deleted, created_at);

-- =============================================
-- 4. MENSAJES (dentro de una conversacion)
-- =============================================
CREATE TABLE IF NOT EXISTS chatbot_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON chatbot_messages(conversation_id, created_at);

-- =============================================
-- Usuario de prueba
-- =============================================
INSERT INTO chatbot_users (external_id, name)
VALUES ('user-001', 'Usuario de Prueba')
ON CONFLICT (external_id) DO NOTHING;
