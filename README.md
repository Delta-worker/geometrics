# GeoMetrics - Geospatial Metrics Platform

A geospatial metrics platform for analyzing and visualizing spatial data.

## Tech Stack

- **Backend:** Node.js + Fastify + Prisma ORM
- **Frontend:** React + Vite
- **Database:** SQLite (file-based, easy migration)
- **Container:** Docker & Docker Compose

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### Local Development (without Docker)

1. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up database:**
   ```bash
   cd backend
   cp .env.example .env
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Start backend:**
   ```bash
   cd backend
   npm run dev
   ```

5. **Start frontend (in another terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

### Docker Development

```bash
docker-compose up --build
```

## Project Structure

```
geometrics/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Prisma/DB models
│   │   ├── routes/        # API route definitions
│   │   ├── middleware/    # Custom middleware
│   │   └── index.js       # Entry point
│   ├── package.json
│   ├── .env.example
│   └── prisma/            # Prisma schema & migrations
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── stores/        # State stores
│   │   └── App.jsx        # Root component
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

## Available Scripts

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite database path | `file:../dev.db` |
| `PORT` | Server port | `3000` |
| `HOST` | Server host | `0.0.0.0` |
| `NODE_ENV` | Environment | `development` |

## API Endpoints

- `GET /health` - Health check
- `GET /api` - API info
- `GET /api/users` - List users
- `POST /api/users` - Create user

## Database Schema

Models are defined in `backend/prisma/schema.prisma`. Initial setup creates basic User model.

## License

MIT
