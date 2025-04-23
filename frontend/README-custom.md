# Cloud Storage Frontend

This is the React.js frontend for the Cloud Storage system. It connects to the FastAPI backend running on localhost:8000.

## Features

- User authentication (login/registration)
- File management:
  - Upload files via drag & drop or file input
  - List files with name, size, and date
  - Download files
  - Delete files
  - Shareable link generation (mock functionality)
- Responsive design (mobile/tablet/desktop)
- Dark/light mode toggle
- Google Drive-inspired layout

## Technologies Used

- React 18
- TypeScript
- Material UI
- React Router
- Axios for API calls
- Formik + Yup for form handling
- React Dropzone for file uploads
- JWT authentication

## Setup and Installation

1. Make sure you have Node.js installed (v14+ recommended)

2. Install dependencies:

```bash
npm install
```

3. Make sure the backend server is running on localhost:8000

4. Start the development server:

```bash
npm start
```

The application will start and open in your browser at http://localhost:3000

## Project Structure

```
/src
  /components        # Reusable UI components
    /auth            # Authentication components
    /files           # File management components
    Navbar.tsx       # Top navigation bar
  /contexts          # React contexts
    AuthContext.tsx  # Authentication state management
    ThemeContext.tsx # Theme (dark/light mode) management
  /types             # TypeScript interfaces
  /pages             # Page components
    AuthPage.tsx     # Login/Register page
    DashboardPage.tsx # Main dashboard with file management
  /services          # API integration
    api.ts           # Axios instance and API methods
  /theme             # Material UI theme configuration
  App.tsx            # Main app component with routing
  index.tsx          # Application entry point
```

## Backend Connection

The frontend connects to the backend through a proxy configuration in package.json. The backend should be running on http://localhost:8000.

## Authentication

The application uses JWT tokens for authentication. The token is stored in localStorage and sent with each API request that requires authentication.

## File Management

- Upload: Files are uploaded using multipart/form-data
- Download: Files are downloaded by creating a blob URL from the binary response
- Delete: Files are deleted with confirmation
- List: All files belonging to the current user are displayed with metadata

## Future Improvements

- Folder creation and navigation
- Drag and drop organization
- File sharing with specific users
- Advanced search functionality
- File preview for common file types
- Batch operations (multi-select) 