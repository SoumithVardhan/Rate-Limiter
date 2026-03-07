# Rate Limiter

A distributed rate limiter implementation based on **Alex Xu's System Design Interview Vol. 1 — Chapter 4**.

## Live Demo

🚀 [https://clever-learning-production-4cdd.up.railway.app](https://clever-learning-production-4cdd.up.railway.app)

## Architecture

```
Browser
   │
   ▼
nginx :80  ──── serves React static files
   │             proxies /request, /burst, /reset  ──▶  Rate Limiter :4000  ◀──▶  Redis :6379
   │                                                          │           │
   │                                                     Server-1 :5001  Server-2 :5002
```

The Rate Limiter is a **standalone reverse proxy service** — not middleware embedded in the backend. Every request hits the rate limiter first. If allowed, it forwards to a backend server (round-robin). If blocked, it returns HTTP 429.

nginx proxies all API calls (`/request`, `/burst`, `/reset`) to the rate-limiter on the internal Docker network. The browser only ever talks to one host.

## Algorithms

| Algorithm | Redis Structure | Complexity | Notes |
|---|---|---|---|
| Sliding Window Counter | 2 keys (MGET) | O(1) | Weighted blend of prev + current window |
| Token Bucket | Hash (HGETALL/HSET) | O(1) | Allows short bursts |
| Fixed Window Counter | Single key (INCR) | O(1) | Simple, has boundary condition |
| Sliding Window Log | Sorted Set (ZADD/ZCARD) | O(n) | Most accurate, higher memory |

## Services

| Service | Internal Port | Host Port | Description |
|---|---|---|---|
| frontend | 80 | 3000 | React + Vite, served via nginx |
| rate-limiter | 4000 | 4000 | Standalone rate limiter + reverse proxy |
| server-1 | 5001 | 5001 | Backend server 1 |
| server-2 | 5002 | 5002 | Backend server 2 |
| redis | 6379 | 6380 | Shared state store |

## Running Locally (Docker)

```bash
docker compose up --build
```

Open http://localhost:3000

## Running Locally (without Docker)

Start Redis, then in separate terminals:

```bash
# Terminal 1 — Rate Limiter
cd rate-limiter && npm install && node src/index.js

# Terminal 2 — Server 1
cd server-1 && npm install && node src/index.js

# Terminal 3 — Server 2
cd server-2 && npm install && node src/index.js

# Terminal 4 — Frontend (Vite dev server proxies /request /burst /reset to localhost:4000)
cd frontend && npm install && npm run dev
```

## Cloud Deployment (Railway)

Railway is the easiest platform — it reads `docker-compose.yml` directly.

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Railway detects `docker-compose.yml` and creates all 5 services automatically
4. Add a Redis service: click **+ New** → **Database** → **Redis**
5. Update the `rate-limiter` service environment variables in Railway dashboard:
   - `REDIS_HOST` → your Railway Redis host
   - `REDIS_PORT` → your Railway Redis port
6. Do the same for `server-1` and `server-2`
7. Railway auto-assigns public URLs to each service

The frontend will be accessible at the Railway URL for the `frontend` service.

## Cloud Deployment (Render)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service for each of:
   - `rate-limiter` (Dockerfile in `./rate-limiter`)
   - `server-1` (Dockerfile in `./server-1`)
   - `server-2` (Dockerfile in `./server-2`)
   - `frontend` (Dockerfile in `./frontend`)
3. Create a **Redis** instance from Render dashboard
4. Set environment variables for each service accordingly
5. Update `nginx.conf` `proxy_pass` to use the Render URL for `rate-limiter`

## Project Structure

```
RateLimiter-Complete/
├── docker-compose.yml
├── .gitignore
├── README.md
├── frontend/
│   ├── Dockerfile          # Multi-stage: Vite build → nginx serve
│   ├── nginx.conf          # Serves static files + proxies API to rate-limiter
│   ├── vite.config.js      # Dev proxy to localhost:4000
│   └── src/
│       ├── App.jsx
│       ├── api.js          # Uses relative URLs — works locally and on cloud
│       └── components/
├── rate-limiter/
│   └── src/
│       ├── index.js        # /request  /burst  /reset  /health
│       ├── redis.js
│       └── algorithms/     # tokenBucket  fixedWindow  slidingLog  slidingCounter
├── server-1/
└── server-2/
```

## Tech Stack

- **Frontend**: React 18, Vite 5, nginx
- **Rate Limiter**: Node.js, Express, ioredis, node-fetch
- **Backend Servers**: Node.js, Express
- **Cache / State**: Redis
- **Orchestration**: Docker Compose
