-- backend/schema.sql (PostgreSQL for Vercel Postgres)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  vk_id TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar TEXT,
  bio TEXT DEFAULT '',
  background_image TEXT DEFAULT '',
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  images TEXT,
  tags TEXT,
  trip_id TEXT,
  location TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Migration: Add likes_count column to existing posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE posts ADD COLUMN likes_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Migration: Update existing posts to have likes_count = 0 if NULL
UPDATE posts SET likes_count = 0 WHERE likes_count IS NULL;

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  UNIQUE(post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_posts_text ON posts(text);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_trip_id ON posts(trip_id);

-- Migration: Add background_image column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'background_image'
  ) THEN
    ALTER TABLE users ADD COLUMN background_image TEXT DEFAULT '';
  END IF;
END $$;
