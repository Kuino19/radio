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
- **1-Tap Browser Go Live**: MediaRecorder audio (WebM/Opus or Safari MP4) streamed over WebSocket to backend `ffmpeg` transcode to a 64 kbps MP3 Icecast mount.
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

### 4. Production monitoring and recovery

- Configure an external uptime monitor to request `https://radio.goanitech.com/api/health` every minute. HTTP `200` means the backend and Icecast status endpoint responded; `503` means the backend is running but Icecast is unavailable. The JSON also reports active broadcasts and backend uptime.
- Alert on repeated non-200 responses and check the VM before restarting services. Useful read-only checks on the Ubuntu VM:

  ```bash
  sudo systemctl status lisnr-backend icecast2 caddy --no-pager
  sudo journalctl -u lisnr-backend -n 200 --no-pager
  sudo journalctl -u icecast2 -n 100 --no-pager
  curl -fsS http://127.0.0.1:3001/api/health
  curl -fsS http://127.0.0.1:8000/status-json.xsl
  ```

- If Icecast is down, inspect its logs and configuration first, then restart only that service with `sudo systemctl restart icecast2`. Recheck `/api/health` and the status endpoint before testing a new broadcast.
- If the backend is unresponsive, first confirm no show is live with `/api/live-status/<channel-slug>`. Restarting `lisnr-backend` interrupts active broadcasts and finalizes them after the disconnect grace period; do it only when that interruption is acceptable. Then run `sudo systemctl restart lisnr-backend`, inspect `journalctl`, and verify `/api/health`.
- If the site is unavailable but the backend health check passes, check Caddy with `sudo systemctl status caddy --no-pager` and validate its config using `sudo caddy validate --config /etc/caddy/Caddyfile` before restarting it.
- Live session state is held in backend memory. A VM reboot or backend restart ends the current live session; hosts must start a new show and share its newly generated link. Keep the VM's recordings directory backed up if local recording fallback is in use.

The health endpoint does not replace an end-to-end listener check. After deployments, test one complete broadcast from a phone on mobile data: start the show, open its unique `/live/<show-id>` page, confirm audio and attendance, send a chat message, end the show, and verify the archived replay and per-show analytics.
