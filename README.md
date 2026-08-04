# 🎭 MemeGame

A real-time multiplayer party game where players compete to find the funniest meme for each round's prompt. Built with React, Flask, Socket.IO, and a neo-brutalist design system.

## Architecture

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│                 │◄──────────────────►│                 │
│  React Frontend │     REST API       │  Flask Backend   │
│  (Vite + TS)    │◄──────────────────►│  (Socket.IO)    │
│                 │                    │                 │
└─────────────────┘                    └────────┬────────┘
     Vercel                                     │
                                    ┌───────────┼───────────┐
                                    │           │           │
                              ┌─────▼─────┐ ┌──▼──┐ ┌─────▼─────┐
                              │  MongoDB  │ │Redis│ │  GIPHY    │
                              │  Atlas    │ │     │ │  API      │
                              └───────────┘ └─────┘ └───────────┘
                                              Upstash
```

## Game Flow

1. **Lobby** → Host creates room, players join via 6-char code
2. **Judge Selection** → Judge rotates round-robin through all players
3. **Sentence Creation** → Judge writes a funny prompt
4. **Meme Selection** → Players pick the best matching GIF (90s timer)
5. **Meme Reveal** → Judge scores each meme (1-10)
6. **Results** → Round winner + scoreboard shown
7. **Repeat** → 3-8 rounds, then final leaderboard

## Backend Structure

```
backend/
├── app.py                    # App factory (~60 lines)
├── core/
│   ├── database.py           # MongoDB, Redis, config, shared utils
│   └── giphy.py              # GIPHY API client with Redis caching
├── middleware/
│   └── auth.py               # JWT auth decorator + guest tokens
├── routes/
│   ├── auth.py               # Registration, login, OTP, guest
│   ├── api.py                # Dashboard stats, feedback, contact
│   └── game_events.py        # All Socket.IO event handlers
├── services/
│   ├── email_service.py      # Email templates and sending
│   └── game_services.py      # Shared game logic helpers
└── utils/
    ├── auth_utils.py          # Email validation
    ├── game_utils.py          # Room ID generation
    └── session_utils.py       # Session ID generation
```

## Frontend Structure

```
frontend/src/
├── pages/                    # Route-level components
│   ├── LandingPage.tsx       # Public landing with auth
│   ├── Dashboard.tsx         # User stats + game actions
│   ├── CreateRoom.tsx        # Room creation form
│   ├── JoinRoom.tsx          # Room code entry
│   ├── RoomLobby.tsx         # Pre-game player list
│   ├── Game.tsx              # Main game board (phase router)
│   └── HowToPlay.tsx         # Rules + contact form
├── components/
│   ├── GamePhases/           # Phase-specific UI components
│   └── ...                   # Shared components
├── context/
│   ├── AuthContext.tsx        # Authentication state
│   └── GameContext.tsx        # Game state + Socket.IO
└── config.ts                 # API URL configuration
```

## Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB (local or Atlas)
- Redis (local or Upstash)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env       # Fill in your secrets
python app.py
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env       # Set VITE_API_URL
npm run dev
```

### Environment Variables

#### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection URL |
| `JWT_SECRET_KEY` | Secret for JWT signing |
| `GIPHY_API_KEY` | GIPHY API key |
| `SENDER_EMAIL` | Email for sending OTPs |
| `EMAIL_PASSWORD` | App password for email |
| `DEBUG` | Set to `true` for debug mode |

#### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL |

## Deployment

- **Frontend**: Deployed to [Vercel](https://vercel.com)
- **Backend**: Deployed to [Render](https://render.com)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier)
- **Cache**: [Upstash Redis](https://upstash.com) (free tier)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Realtime | Socket.IO |
| Backend | Flask, Flask-SocketIO, Eventlet |
| Database | MongoDB Atlas |
| Cache | Upstash Redis |
| Auth | JWT + OTP (email) |
| Assets | GIPHY API, DiceBear Avatars |
| Design | Neo-brutalism / Bento grid system |
