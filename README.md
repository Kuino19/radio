# LISNR — Live Audio Broadcast Platform

Speech-first live audio and on-demand broadcast platform for sermons, talk shows, community radio, and interviews.

---

## Architecture

- **`web/`**: Next.js 16 (App Router, React 19, Tailwind CSS 4) web application deployed on Vercel.
- **`server/`**: Node.js (Express + `ws` + `ffmpeg`) backend running on Ubuntu 24.04 VM (Azure) alongside Icecast 2.4.x and Caddy.
- **`supabase/`**: PostgreSQL database schema, row-level security (RLS), real-time publications, and storage bucket configuration.

---

## Features

### For Creators (Publishers)
- **1-Tap Browser Go Live**: WebRTC / MediaRecorder (audio/webm;codecs=opus) streamed over WebSocket to backend `ffmpeg` transcode to 64 kbps MP3 Icecast mount.
- **Audio Upload**: Drag-and-drop interface supporting MP3, AAC, M4A, and OPUS with automatic duration extraction.
- **Series & Shows**: Organization of audio episodes into recurring series.
- **Episode Scheduling**: Publish immediately or schedule future release dates.
- **Monetization Hub**: Configurable paywall toggles (Free vs Members-only), membership tiers ($/mo and $/yr), and direct listener tipping ($2, $5, $10, $25).
- **Creator Dashboard**: Real-time stats, audience retention curve, demographics (countries/cities), and device breakdown.

### For Listeners (Consumers)
- **High-Fidelity Audio Player**: Speed control (0.75x–2x), Hi-Fi mode toggle, and live sync.
- **Background Play**: Full Web `MediaSession` API support with OS lock screen controls and ±15s seeking.
- **Search & Discovery**: Algorithmic search across channels, series, and episodes with category pills.
- **Personal Library**: Saved favorites, bookmarks, and playlist curation.
- **Social Sharing**: One-click share buttons for Twitter/X, LinkedIn, and WhatsApp.

---

## Setup & Deployment

### 1. Supabase Database
1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Run `supabase/creator_listener_expansion.sql` for series, monetization, and playlists.

### 2. Streaming Backend (`server/`)
1. On your Ubuntu VM, ensure `ffmpeg`, `icecast2`, and `caddy` are installed.
2. Deploy `server/` with systemd unit file `server/lisnr-backend.service`.
3. Configure Caddy with `server/Caddyfile.snippet`.

### 3. Web Frontend (`web/`)
1. `cd web`
2. `npm install`
3. Configure `.env.local` using `.env.example`.
4. `npm run build` or `npm run dev`
