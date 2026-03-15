-- ============================================================
--  Multilingual Chatbot - MySQL Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS multilingual_chatbot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE multilingual_chatbot;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  preferred_lang VARCHAR(10) DEFAULT 'en',
  is_verified   BOOLEAN      DEFAULT FALSE,
  verify_token  VARCHAR(100),
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Chat sessions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  title      VARCHAR(150) DEFAULT 'New Chat',
  language   VARCHAR(10)  DEFAULT 'en',
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  session_id   INT  NOT NULL,
  role         ENUM('user','assistant') NOT NULL,
  content      TEXT NOT NULL,
  language     VARCHAR(10) DEFAULT 'en',
  created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Index helpers ────────────────────────────────────────────
CREATE INDEX idx_messages_session  ON messages(session_id);
CREATE INDEX idx_sessions_user     ON chat_sessions(user_id);
CREATE INDEX idx_users_email       ON users(email);

-- ── Demo user (password: Demo@1234) ─────────────────────────
INSERT INTO users (username, email, password_hash, preferred_lang, is_verified)
VALUES ('demo', 'demo@chatbot.com',
        '$2b$10$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WLxJnHMJ9iqFUGufnWHi',
        'en', TRUE);
