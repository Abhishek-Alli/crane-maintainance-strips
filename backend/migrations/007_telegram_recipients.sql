-- Migration: 007_telegram_recipients.sql
-- Stores Telegram chat IDs for alert notifications

CREATE TABLE IF NOT EXISTS telegram_recipients (
    id SERIAL PRIMARY KEY,
    chat_id VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed the default recipient from .env
-- (run manually or insert from the UI)
