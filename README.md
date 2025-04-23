# Cloud Storage System

A full-stack cloud storage application with FastAPI backend and React frontend. This system provides user authentication, file and folder management with an intuitive UI.

## Features

- User registration and authentication with JWT tokens
- Secure password hashing with bcrypt
- File upload, download, listing, and deletion
- Folder creation and navigation
- Drag-and-drop file uploads
- Grid and list view options
- File metadata storage in MongoDB
- Physical file storage on server

## Tech Stack

### Backend
- Python 3.8+ with FastAPI
- MongoDB for database storage
- JWT for authentication
- Pydantic for data validation
- Motor for async MongoDB interactions

### Frontend
- React with functional components
- Material-UI for responsive design
- Axios for API requests
- React Context API for state management
- React Dropzone for drag-and-drop uploads

## Prerequisites

- Python 3.8+
- Node.js 14+
- MongoDB running locally on port 27017 (default)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd <repository-dir>
```

### Backend Setup

1. Create a virtual environment (optional but recommended):

```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

2. Install backend dependencies:

```bash
pip install -r requirements.txt
```

3. Configure environment variables (copy .env.example to .env and edit if needed):

```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=localserver
SECRET_KEY=your_super_secret_key_change_this_in_production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=development
```

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install frontend dependencies:

```bash
npm install
```

3. Create a .env file in the frontend directory with:

```
REACT_APP_API_URL=http://localhost:8000
```

## Running the Application

### Start the Backend

1. Make sure MongoDB is running:

```bash
# Start MongoDB (command may vary based on your installation)
mongod --port 27017
```

2. From the project root, start the FastAPI server:

```bash
python main.py
```

The server will start at http://localhost:8000. You can access the API documentation at http://localhost:8000/docs.

### Start the Frontend

1. In a separate terminal, navigate to the frontend directory:

```bash
cd frontend
```

2. Start the React development server:

```bash
npm start
```

The frontend will be available at http://localhost:3000.

## Project Structure

```
.
├── app/
│   ├── database/
│   │   └── connection.py  # MongoDB connection
│   ├── models/
│   │   ├── user.py        # User Pydantic models
│   │   ├── file.py        # File Pydantic models
│   │   └── folder.py      # Folder Pydantic models
│   ├── routers/
│   │   ├── auth.py        # Authentication routes
│   │   └── files.py       # File management routes
│   └── utils.py           # Utility functions
├── frontend/
│   ├── public/            # Static assets
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # Context providers
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript type definitions
│   ├── package.json       # Frontend dependencies
│   └── tsconfig.json      # TypeScript configuration
├── uploads/               # Directory to store uploaded files
├── .env                   # Environment variables
├── .env.example           # Example environment variables
├── main.py                # Main application entry point
├── requirements.txt       # Python dependencies
└── README.md              # Project documentation
```

## Security Considerations

- Change the SECRET_KEY in the .env file for production
- Consider implementing file size limits for uploads
- Add additional validation for uploaded files
- Consider using HTTPS in production
- Implement rate limiting to prevent abuse

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 