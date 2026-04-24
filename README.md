# Task Management API

This is the Assignment 3 version of the backend task management API. It keeps the implementation simple and only adds the features asked in the PDF:

- categories
- tags
- task filtering by category and tags
- simulated reminders using in-memory `setTimeout`
- completion webhook with 3 retries and exponential backoff
- a basic React frontend to demo the API

Users are stored in PostgreSQL. Tasks, categories, and tags are stored in MongoDB.

## Tech Stack

- Node.js
- Express
- React
- Vite
- PostgreSQL
- MongoDB
- JWT
- Joi
- bcryptjs

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```bash
cp .env.example .env
```

3. Update the database connection strings and secrets in `.env`.

4. Start PostgreSQL and MongoDB.

5. Build the frontend if you change anything inside `frontend/`:

```bash
npm run frontend:build
```

6. Run the server:

```bash
npm run dev
```

Base URL:

```text
http://localhost:3000/api
```

Frontend URL:

```text
http://localhost:3000/
```

## Frontend

- The React source lives in `frontend/`.
- The built frontend is generated into `public/`.
- The Express server serves the built files from `public/`.

Useful scripts:

```bash
npm run frontend:dev
npm run frontend:build
```

## Environment Variables

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=1d
POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/task_management
MONGODB_URI=mongodb://127.0.0.1:27017/task_management
ALLOWED_ORIGIN=http://localhost:3000
REMINDER_LEAD_TIME_MS=3600000
REMINDER_WEBHOOK_URL=
ANALYTICS_WEBHOOK_URL=
```

Notes:

- `REMINDER_LEAD_TIME_MS` defaults to 1 hour before the due date.
- `REMINDER_WEBHOOK_URL` is optional.
- `ANALYTICS_WEBHOOK_URL` is optional, but should be set to test the completion webhook.

## Authentication

Protected routes require:

```http
Authorization: Bearer <jwt_token>
```

## Endpoints

### Auth

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login and receive a JWT |
| `GET` | `/auth/me` | Get the current logged-in user |

### Categories

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/categories` | Create a category |
| `GET` | `/categories` | List categories |
| `GET` | `/categories/:categoryId` | Get one category |
| `PATCH` | `/categories/:categoryId` | Update a category |
| `DELETE` | `/categories/:categoryId` | Delete a category |

### Tags

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/tags` | Create a tag |
| `GET` | `/tags` | List tags |
| `GET` | `/tags/:tagId` | Get one tag |
| `PATCH` | `/tags/:tagId` | Update a tag |
| `DELETE` | `/tags/:tagId` | Delete a tag |

### Tasks

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/tasks` | Create a task |
| `GET` | `/tasks` | List tasks |
| `GET` | `/tasks/:taskId` | Get one task |
| `PATCH` | `/tasks/:taskId` | Update a task |
| `DELETE` | `/tasks/:taskId` | Delete a task |

## Request Examples

### Create a Category

`POST /categories`

```json
{
  "name": "Work"
}
```

### Create a Tag

`POST /tags`

```json
{
  "name": "Urgent"
}
```

### Create a Task

`POST /tasks`

```json
{
  "title": "Submit assignment",
  "description": "Record demo and upload repo link",
  "dueDate": "2026-04-21T18:00:00.000Z",
  "status": "pending",
  "categoryId": "68059c8ef53c6daab915c0d1",
  "tagIds": [
    "68059caaf53c6daab915c0d5"
  ]
}
```

### Filter Tasks

Filter by category:

```text
GET /tasks?categoryId=<category_id>
```

Filter by tags:

```text
GET /tasks?tagIds=<tag_id_1>,<tag_id_2>
```

Filter by category and tags together:

```text
GET /tasks?categoryId=<category_id>&tagIds=<tag_id_1>,<tag_id_2>
```

### Mark a Task as Completed

`PATCH /tasks/:taskId`

```json
{
  "status": "completed"
}
```

## Response Shape

Task responses return populated category and tags:

```json
{
  "id": "68059d2df53c6daab915c0db",
  "ownerId": 1,
  "title": "Submit assignment",
  "description": "Record demo and upload repo link",
  "dueDate": "2026-04-21T18:00:00.000Z",
  "status": "pending",
  "completedAt": null,
  "category": {
    "id": "68059c8ef53c6daab915c0d1",
    "name": "Work"
  },
  "tags": [
    {
      "id": "68059caaf53c6daab915c0d5",
      "name": "Urgent"
    }
  ],
  "createdAt": "2026-04-21T10:00:00.000Z",
  "updatedAt": "2026-04-21T10:00:00.000Z"
}
```

## Reminder Logic

- When a pending task is created or updated with a due date, a reminder is scheduled using `setTimeout`.
- The reminder fires `REMINDER_LEAD_TIME_MS` before the due date.
- If the due date changes, the old reminder is cancelled and a new one is scheduled.
- If the task is completed or deleted before the reminder runs, the reminder is cancelled.
- When the reminder triggers, the app logs the notification to the console.
- If `REMINDER_WEBHOOK_URL` is set, the same reminder payload is also sent to that webhook.

Example reminder payload:

```json
{
  "event": "task.reminder",
  "taskId": "68059d2df53c6daab915c0db",
  "ownerId": 1,
  "title": "Submit assignment",
  "dueDate": "2026-04-21T18:00:00.000Z",
  "reminderLeadTimeMs": 3600000,
  "triggeredAt": "2026-04-21T17:00:00.000Z"
}
```

## Completion Webhook Logic

- When a task status changes to `completed`, the API sends a POST request to `ANALYTICS_WEBHOOK_URL`.
- The payload contains task ID, title, completion date, and user ID.
- If the request fails, it retries 3 times with exponential backoff.
- The retry delays are `1s`, `2s`, and `4s`.

Example completion webhook payload:

```json
{
  "taskId": "68059d2df53c6daab915c0db",
  "title": "Submit assignment",
  "completionDate": "2026-04-21T17:20:00.000Z",
  "userId": 1
}
```

## Design Choices

- Categories are dynamic and user-specific. This keeps the feature simple and avoids hardcoded seed data.
- Tags are stored separately so they can be created, listed, updated, deleted, and reused across tasks.
- Reminders are kept in memory because the assignment allows a simple queue or `setTimeout` based solution.
- The webhook retry logic is kept simple with fixed retries and exponential backoff.

## Verification

Run:

```bash
npm run check
```
