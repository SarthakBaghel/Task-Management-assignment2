# Task Management API

A simple backend REST API built for the assignment. It supports user registration, login, JWT-based authentication, and task CRUD for authenticated users.

Users are stored in PostgreSQL, and tasks are stored in MongoDB.

## Tech Stack

- Node.js
- Express
- PostgreSQL
- MongoDB
- JWT
- Joi
- bcryptjs

## Features

- Register a user with email and password
- Login and receive a JWT token
- Fetch the current logged-in user
- Create, view, update, and delete tasks
- Allow access only to the owner of a task
- Validate incoming request data
- Return clean JSON error responses

## Project Structure

```text
src/
  app.js
  server.js
  config/
    db.js
    env.js
  middleware/
    auth.js
    errorHandler.js
    notFound.js
    validation.js
  models/
    Task.js
  routes/
    authRoutes.js
    index.js
    taskRoutes.js
```

## Folder Explanation

- `src/app.js` creates the Express app and mounts middleware and routes.
- `src/server.js` connects to the databases and starts the server.
- `src/config/db.js` sets up PostgreSQL and MongoDB connections.
- `src/config/env.js` reads required environment variables.
- `src/middleware` contains auth, validation, 404, and error handling logic.
- `src/models/Task.js` defines the MongoDB task schema.
- `src/routes/authRoutes.js` contains register, login, and `me` endpoints.
- `src/routes/taskRoutes.js` contains task CRUD endpoints.

## Design Decisions

- PostgreSQL is used for users because the assignment requires SQL storage for user data.
- MongoDB is used for tasks because the assignment requires NoSQL storage for task data.
- Route logic is kept directly inside the route files to keep the project small and easy to read.
- JWT is used for authentication so protected endpoints can identify the logged-in user.
- Each task stores an `ownerId`, and every task read/update/delete checks ownership.

## Prerequisites

- Node.js 20 or higher
- PostgreSQL running locally
- MongoDB running locally

Using Docker is the easiest way to run both databases.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create the environment file:

```bash
cp .env.example .env
```

3. Start PostgreSQL and MongoDB:

```bash
docker compose up -d
```

If your machine uses the older Docker command:

```bash
docker-compose up -d
```

4. Start the server:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:3000
```

## Environment Variables

The default `.env.example` file contains:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=1d
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/task_management
MONGODB_URI=mongodb://127.0.0.1:27017/task_management
ALLOWED_ORIGIN=http://localhost:3000
```

Notes:

- The PostgreSQL database itself must already exist.
- The `users` table is created automatically on startup if it does not exist.
- `ALLOWED_ORIGIN` is present in the env file for future CORS restriction, but the current app allows all origins.

## Available Scripts

- `npm run dev` starts the app with nodemon
- `npm start` starts the app normally
- `npm run check` runs a syntax check on all files in `src`

## API Overview

Base URL:

```text
http://localhost:3000/api
```

Protected routes require this header:

```http
Authorization: Bearer <jwt_token>
```

## Endpoints

| Method | Route | Auth Required | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login and receive a JWT |
| GET | `/api/auth/me` | Yes | Get the current user |
| POST | `/api/tasks` | Yes | Create a task |
| GET | `/api/tasks` | Yes | List all tasks for the logged-in user |
| GET | `/api/tasks/:taskId` | Yes | Get one task |
| PATCH | `/api/tasks/:taskId` | Yes | Update one task |
| DELETE | `/api/tasks/:taskId` | Yes | Delete one task |

## Request and Response Examples

### Register User

`POST /api/auth/register`

Request:

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "createdAt": "2026-04-16T10:00:00.000Z",
      "updatedAt": "2026-04-16T10:00:00.000Z"
    }
  }
}
```

### Login User

`POST /api/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "<jwt_token>",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "createdAt": "2026-04-16T10:00:00.000Z",
      "updatedAt": "2026-04-16T10:00:00.000Z"
    }
  }
}
```

### Get Current User

`GET /api/auth/me`

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "createdAt": "2026-04-16T10:00:00.000Z",
      "updatedAt": "2026-04-16T10:00:00.000Z"
    }
  }
}
```

### Create Task

`POST /api/tasks`

Request:

```json
{
  "title": "Submit assignment",
  "description": "Finish backend task",
  "dueDate": "2026-04-20T10:00:00.000Z",
  "status": "pending"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "task": {
      "id": "680000000000000000000001",
      "ownerId": 1,
      "title": "Submit assignment",
      "description": "Finish backend task",
      "dueDate": "2026-04-20T10:00:00.000Z",
      "status": "pending",
      "createdAt": "2026-04-16T10:10:00.000Z",
      "updatedAt": "2026-04-16T10:10:00.000Z"
    }
  }
}
```

### List Tasks

`GET /api/tasks`

Response:

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "680000000000000000000001",
        "ownerId": 1,
        "title": "Submit assignment",
        "description": "Finish backend task",
        "dueDate": "2026-04-20T10:00:00.000Z",
        "status": "pending",
        "createdAt": "2026-04-16T10:10:00.000Z",
        "updatedAt": "2026-04-16T10:10:00.000Z"
      }
    ]
  }
}
```

### Get One Task

`GET /api/tasks/:taskId`

Returns the task only if it belongs to the logged-in user.

### Update Task

`PATCH /api/tasks/:taskId`

Request:

```json
{
  "status": "completed"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "task": {
      "id": "680000000000000000000001",
      "ownerId": 1,
      "title": "Submit assignment",
      "description": "Finish backend task",
      "dueDate": "2026-04-20T10:00:00.000Z",
      "status": "completed",
      "createdAt": "2026-04-16T10:10:00.000Z",
      "updatedAt": "2026-04-16T10:20:00.000Z"
    }
  }
}
```

### Delete Task

`DELETE /api/tasks/:taskId`

Response:

```http
204 No Content
```

## Validation Rules

### Auth Validation

- `email` must be a valid email address
- `password` must be at least 8 characters for registration

### Task Validation

- `title` is required when creating a task
- `title` must be between 3 and 150 characters
- `description` can be empty, but if provided it must be 2000 characters or less
- `dueDate` must be a valid ISO date string
- `status` must be either `pending` or `completed`
- `PATCH /api/tasks/:taskId` requires at least one field to update

## Error Handling

The API returns JSON errors in this format:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "message": "\"password\" length must be at least 8 characters long",
        "path": "password"
      }
    ]
  }
}
```

Common cases:

- `400` for validation errors or invalid task ids
- `401` for invalid login or missing/invalid token
- `403` when trying to access another user's task
- `404` when a route or task does not exist
- `409` when registering an email that already exists

## Manual Testing Flow

This is a simple demo flow you can use in Postman or any API client:

1. Register a user with `POST /api/auth/register`
2. Login with `POST /api/auth/login`
3. Copy the returned JWT token
4. Call `GET /api/auth/me` with `Authorization: Bearer <token>`
5. Create a task with `POST /api/tasks`
6. View tasks with `GET /api/tasks`
7. Update a task with `PATCH /api/tasks/:taskId`
8. Delete a task with `DELETE /api/tasks/:taskId`
9. Login as a different user and try to access the first user's task to show the ownership check
10. Send an invalid request to show validation and error handling

## Example cURL Commands

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!"
  }'
```

### Create Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Demo task",
    "description": "Testing create task",
    "dueDate": "2026-04-20T10:00:00.000Z",
    "status": "pending"
  }'
```

## Submission Notes

- The code is intentionally kept simple and readable.
- Users are stored in PostgreSQL.
- Tasks are stored in MongoDB.
- API documentation is included in this README in plain text form.
