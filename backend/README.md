# Scope Connect Backend

MERN backend API for the Scope Connect contract in `docs/00-README.md`.

## Stack

- Node.js 20+
- Express
- MongoDB + Mongoose
- JWT access tokens + rotating refresh tokens
- Zod request validation
- Multer local file uploads

## Setup

```bash
npm install
npm run dev
```

The API listens on `http://localhost:8080` by default.

## Demo Data

Seed MongoDB with a fresh demo workspace:

```bash
npm run seed
```

This clears the backend app collections, then inserts demo institutions, users,
profiles, portfolio links, projects, applications, notifications, and analytics.
All seeded users use `Password123!`.

## Required Environment

Copy/update `.env` values before running in production:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `UPLOAD_DIR`

`GET /api/health` returns the liveness payload.
