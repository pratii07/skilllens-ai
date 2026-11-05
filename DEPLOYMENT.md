# SkillLens deployment

Deploy the backend API and frontend as separate services unless the hosting provider is configured to proxy `/api` to the backend.

## Backend

From the repository root, use `npm ci` to install the lockfile versions and `npm start` to launch the API. Configure these environment variables in the backend host:

- `NODE_ENV=production`
- `MONGODB_URI`: the rotated MongoDB Atlas connection URI
- `JWT_SECRET`: a fresh random secret with at least 32 characters. Generate one with `openssl rand -base64 48`.
- `FRONTEND_URL`: the exact HTTPS frontend origin, such as `https://app.example.com`. Multiple origins can be comma-separated.
- `PORT`: set by the host if it provides one
- `INITIAL_MENTOR_NAME`, `INITIAL_MENTOR_EMAIL`, `INITIAL_MENTOR_PASSWORD`: optional bootstrap credentials. When the database has no mentor, the backend creates one and hashes the password. Remove these values from the host after the mentor is created.
- AI provider keys such as `GEMINI_API_KEY` or `OPENAI_API_KEY` if assessment generation should be enabled.

Create the Atlas database user with access only to the SkillLens database, and allow the backend host's outbound IP addresses in Atlas Network Access. Do not allow all IP addresses unless the hosting provider requires it and you have accepted that exposure.

## Frontend

Build the frontend with `npm run build` from the repository root and publish `frontend/dist`. Set `VITE_API_URL` at build time to the backend API URL ending in `/api`, for example `https://api.example.com/api`. If the host proxies `/api` on the frontend domain, the app defaults to the relative `/api` path.

## Verify after deployment

Open `https://<backend-host>/api/health`. A healthy response has HTTP 200 and `{"status":"ok","mongo":"connected"}`. In production, API writes are blocked with HTTP 503 while MongoDB is unavailable; the app will not silently save those writes to temporary in-memory demo storage.

Student sessions, some practice progress, and per-student result cache entries are stored in browser `localStorage`; they are device/browser-specific. Assessment and account records are stored in MongoDB. Avoid treating browser-only practice state as a cross-device record.
