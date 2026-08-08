# Atlas API

Backend REST API for Atlas, a Kanban-style task management application. Built with Express, PostgreSQL, and Prisma ORM.

## Features

- User registration and login with JWT-based authentication
- httpOnly cookie session handling (XSS-resistant)
- Password hashing with bcrypt
- Input validation with Zod
- Rate limiting on authentication endpoints
- Task CRUD operations scoped to authenticated users
- Board-based data model, ready for multi-board support
- Security headers via Helmet

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 5
- **Database:** PostgreSQL
- **ORM:** Prisma 7
- **Auth:** JSON Web Tokens (JWT), bcrypt
- **Validation:** Zod
- **Containerization:** Docker


## Environment Variables

| Variable       | Description                                  | Required |
|----------------|-----------------------------------------------|----------|
| `DATABASE_URL` | PostgreSQL connection string                  | Yes      |
| `JWT_SECRET`   | Secret used to sign JWT tokens                | Yes      |
| `PORT`         | Port the server listens on (default: 3000)    | No       |
| `NODE_ENV`     | `development` or `production`                 | No       |

## API Endpoints

### Auth

| Method | Endpoint                    | Description                  |
|--------|------------------------------|-------------------------------|
| POST   | `/api/auth/register`         | Create a new user account     |
| POST   | `/api/auth/login`            | Authenticate and receive a session cookie |
| POST   | `/api/auth/logout`           | Clear the session cookie      |
| PATCH  | `/api/auth/change-password`  | Change the authenticated user's password |

### Tasks

| Method | Endpoint            | Description                     |
|--------|----------------------|-----------------------------------|
| GET    | `/api/tasks`          | List tasks for the authenticated user |
| POST   | `/api/tasks`          | Create a new task                |
| PATCH  | `/api/tasks/:id`      | Update a task                    |
| DELETE | `/api/tasks/:id`      | Delete a task                    |

All task endpoints require authentication via session cookie.


## Docker

A `Dockerfile` and `docker-compose.yml` are provided for containerized deployment alongside PostgreSQL. See the deployment configuration for production environment setup.

