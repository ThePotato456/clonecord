# Discord-Style Chat Application

A Discord-inspired chat application with a Node.js backend and a React frontend.

This repository currently provides:
- JWT-based authentication
- channel creation and listing
- direct-message and channel UI shells
- persisted messages and users via a local JSON datastore
- Socket.IO wiring for typing indicators and room joins
- a React development frontend and production frontend build

> Current persistence is file-backed, not Redis-backed. Runtime data is stored in `src/backend/data/db.json`.

## Tech Stack

### Backend
- Node.js
- Express
- Socket.IO
- JSON Web Tokens (`jsonwebtoken`)
- `bcryptjs` for password hashing

### Frontend
- React 18
- TypeScript
- React Router
- Socket.IO client
- Tailwind-based styling

## Project Layout

```text
discord-chat-app/
├── Makefile
├── README.md
├── package.json
├── .env
├── src/
│   └── backend/
│       ├── server.js
│       ├── lib/
│       │   ├── auth.js
│       │   └── store.js
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── user.routes.js
│       │   ├── channel.routes.js
│       │   └── message.routes.js
│       └── data/
│           └── db.json
└── frontend/
    ├── package.json
    ├── public/
    └── src/
```

## Requirements

- Node.js 18+ recommended
- npm
- GNU Make

## Environment Variables

The backend reads `.env` from the repository root.

Common variables:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=change-me-in-production
NODE_ENV=development
```

Notes:
- `PORT` defaults to `4000`
- `FRONTEND_URL` defaults to `http://localhost:3000`
- `JWT_SECRET` falls back to `dev-secret` if unset, which is fine for local development only

## Installation

Install root dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Or use Make:

```bash
make install
```

## Running the Software

### Development mode

Run backend and frontend in separate terminals.

Terminal 1:

```bash
make backend
```

Terminal 2:

```bash
make frontend
```

App URLs:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`
- Health check: `http://localhost:4000/health`

### Combined dev launcher

You can also use:

```bash
make run
```

This uses the root `npm start` script, which starts backend and frontend together with `concurrently`.

## Building / Compiling

Build the frontend production bundle:

```bash
make build
```

This runs:

```bash
cd frontend && npm run build
```

The compiled frontend assets are written to:

```text
frontend/build/
```

## Makefile Targets

```bash
make help          # Show available targets
make install       # Install root and frontend dependencies
make backend       # Start backend server
make frontend      # Start frontend dev server
make run           # Start backend + frontend together
make build         # Build frontend production bundle
make health        # Check backend health endpoint
make clean         # Remove frontend build output
make reset-data    # Reset local backend data store
```

## Backend Behavior

### Persistence

The backend stores runtime data in:

```text
src/backend/data/db.json
```

This includes:
- registered users
- channels
- messages

A default `general` channel is created automatically.

### Authentication

Implemented routes:

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/me
```

### User routes

```text
GET   /api/users/online
GET   /api/users/:userId
PATCH /api/users/:userId/status
GET   /api/users/:userId/channels
```

### Channel routes

```text
GET    /api/channels
POST   /api/channels
GET    /api/channels/:channelId
PATCH  /api/channels/:channelId/topic
DELETE /api/channels/:channelId
```

### Message routes

```text
GET    /api/messages/channel/:channelId
GET    /api/messages/user/:userId
GET    /api/messages/:messageId
POST   /api/messages
PATCH  /api/messages/:messageId
DELETE /api/messages/:messageId
```

## Typical Local Workflow

1. Install dependencies:
   ```bash
   make install
   ```
2. Start backend:
   ```bash
   make backend
   ```
3. Start frontend in another terminal:
   ```bash
   make frontend
   ```
4. Open `http://localhost:3000`
5. Register a user
6. Create channels and send messages

## Verifying the App

Check backend health:

```bash
make health
```

Build frontend to verify compilation:

```bash
make build
```

## Known Limitations

The project is functional for local development, but it is not yet a full Discord clone. Current limitations include:
- file-backed storage instead of a production database
- limited realtime synchronization
- no multi-server/workspace model yet
- no file uploads or voice/video
- canvas fingerprint collection is not fully wired end-to-end in the current frontend flow

## Future Improvements

- shared frontend socket client
- full realtime message sync
- multi-server/workspace architecture
- roles and permissions
- attachments and media uploads
- richer presence and typing state
- canvas fingerprint generation on the client during auth

## License

ISC
