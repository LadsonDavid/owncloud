# OwnCloud — Self-Hosted Cloud Storage

A full-stack cloud storage application with a FastAPI backend and React frontend. Supports user authentication, file and folder management, drag-and-drop uploads, and both grid and list views.

## Features

- JWT-based user registration and authentication
- Secure password hashing with bcrypt
- File upload with MIME type validation (images, documents, audio, video, archives)
- File download, deletion, and shareable link generation
- Folder creation and nested navigation
- Drag-and-drop file uploads via React Dropzone
- Grid view and list view toggle
- File preview for images, video, audio, and PDF
- Responsive layout — mobile and desktop
- MongoDB with async Motor driver and automatic index creation

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.8+, FastAPI, Motor (async MongoDB), Pydantic v2 |
| Auth | JWT (python-jose), bcrypt |
| Database | MongoDB |
| Frontend | React 18, TypeScript, Material UI v5 |
| HTTP Client | Axios |
| File Input | React Dropzone |
| State | React Context API |

## Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB running locally on port 27017

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/LadsonDavid/owncloud.git
cd owncloud
```

### 2. Backend setup

```bash
# Create and activate a virtual environment (recommended)
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the project root:

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=localserver
SECRET_KEY=change_this_to_a_long_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend/` directory:

```env
REACT_APP_API_URL=http://localhost:8000
```

## Running the Application

### Start MongoDB

```bash
mongod --port 27017
```

### Start the backend

```bash
# From the project root
python main.py
```

API server starts at `http://localhost:8000`.
Interactive docs available at `http://localhost:8000/docs`.

### Start the frontend

```bash
cd frontend
npm start
```

Frontend available at `http://localhost:3000`.

## Project Structure

```
owncloud/
├── app/
│   ├── database/
│   │   └── connection.py      # MongoDB connection + index creation
│   ├── models/
│   │   ├── user.py            # User Pydantic models
│   │   ├── file.py            # File Pydantic models
│   │   └── folder.py          # Folder Pydantic models
│   ├── routers/
│   │   ├── auth.py            # Register / login endpoints
│   │   └── files.py           # File and folder CRUD endpoints
│   └── utils.py               # JWT helpers
├── frontend/
│   └── src/
│       ├── components/
│       │   └── files/
│       │       ├── FileGrid.tsx    # Grid view with preview dialogs
│       │       ├── FileList.tsx    # Table/list view
│       │       └── FileUpload.tsx  # Drag-and-drop uploader
│       ├── contexts/
│       │   └── AuthContext.tsx     # Auth state and JWT parsing
│       ├── pages/
│       │   ├── AuthPage.tsx        # Login / register page
│       │   └── DashboardPage.tsx   # Main file manager page
│       ├── services/
│       │   └── api.ts             # Axios instance and API calls
│       └── types/
│           └── index.ts           # TypeScript interfaces
├── uploads/                       # Server-side file storage
├── main.py                        # FastAPI app entry point
├── requirements.txt
└── .env
```

## Environment Variables

### Backend (`.env` in project root)

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | `localserver` | Database name |
| `SECRET_KEY` | — | JWT signing secret (required) |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token lifetime |
| `ENVIRONMENT` | `development` | Set to `production` to exit on DB failure |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_API_URL` | `http://127.0.0.1:8000` | Backend base URL |

## Security

- MIME type allowlist enforced on upload — executables and unknown types are rejected
- Passwords hashed with bcrypt before storage
- All endpoints (except login/register) require a valid JWT
- Error responses never expose internal details (stack traces, DB errors)
- CORS handled by FastAPI middleware; no manual header injection
- Change `SECRET_KEY` to a long random string before deploying

## License

MIT
