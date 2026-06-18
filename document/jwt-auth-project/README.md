# JWT Authentication Project

A full-stack JWT authentication system demonstrating **Access Token** and **Refresh Token** flows with automatic token refresh via Axios interceptors.

## Tech Stack

| Layer    | Technologies |
|----------|-------------|
| Backend  | Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt, cookie-parser, cors, dotenv |
| Frontend | React.js (Vite), Axios, React Router |

## Project Location

```
/home/hello-moni/Documents/jwt-auth-project
```

## Project Structure

```
~/Documents/jwt-auth-project/
├── README.md            # Project documentation
├── backend/
│   ├── src/
│   │   ├── controllers/     # Request handlers (register, login, refresh, logout, profile)
│   │   ├── routes/          # Express route definitions
│   │   ├── middleware/      # Auth middleware & error handler
│   │   ├── models/          # Mongoose User model
│   │   ├── services/        # Business logic layer
│   │   ├── utils/           # JWT token helpers & cookie options
│   │   ├── config/          # Database connection
│   │   └── app.js           # Express app setup
│   ├── .env                 # Environment variables (not committed)
│   ├── .env.example         # Environment template
│   ├── server.js            # Entry point
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js     # Axios instance with request/response interceptors
    │   ├── pages/           # Login, Register, Dashboard
    │   ├── components/      # ProtectedRoute, PublicRoute
    │   ├── context/         # AuthContext (global auth state)
    │   ├── routes/          # React Router setup
    │   ├── services/        # API service functions
    │   └── App.jsx          # Root component
    ├── .env                 # Environment variables (not committed)
    ├── .env.example         # Environment template
    └── package.json
```

## Prerequisites

- **Node.js** v18 or higher
- **MongoDB** running locally or a MongoDB Atlas connection string
- **npm** v9 or higher

## Installation

### 1. Clone and navigate to the project

```bash
cd /home/hello-moni/Documents/jwt-auth-project
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secrets
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
cp .env.example .env
# Edit .env if your backend runs on a different port
```

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/jwt-auth
ACCESS_TOKEN_SECRET=your_access_token_secret_change_in_production
REFRESH_TOKEN_SECRET=your_refresh_token_secret_change_in_production
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Running the Application

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd /home/hello-moni/Documents/jwt-auth-project/backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd /home/hello-moni/Documents/jwt-auth-project/frontend
npm run dev
```

- Backend API: http://localhost:5000
- Frontend App: http://localhost:5173

## API Endpoints

| Method | Endpoint                  | Auth Required | Description |
|--------|---------------------------|---------------|-------------|
| POST   | `/api/auth/register`      | No            | Create new user account |
| POST   | `/api/auth/login`         | No            | Login and receive access token |
| POST   | `/api/auth/refresh-token` | Cookie        | Get new access token using refresh cookie |
| POST   | `/api/auth/logout`        | No            | Clear refresh token cookie |
| GET    | `/api/auth/profile`       | Bearer Token  | Get authenticated user profile |
| GET    | `/health`                 | No            | Server health check |

## Authentication Flow

```
Login
  ↓
Access Token Generated (returned in response body → stored in localStorage)
Refresh Token Generated (stored in HttpOnly cookie → not accessible via JavaScript)
  ↓
API Requests (Authorization: Bearer <accessToken>)
  ↓
Access Token Expires (15 seconds — for testing)
  ↓
API returns 401 Unauthorized
  ↓
Axios Response Interceptor catches 401
  ↓
POST /api/auth/refresh-token (refresh cookie sent automatically)
  ↓
New Access Token received → saved to localStorage
  ↓
Original failed request retried automatically
  ↓
User remains logged in seamlessly
```

## Key Concepts

### Access Token
- Short-lived JWT (15 seconds for testing, use 15 minutes in production)
- Sent in the `Authorization: Bearer <token>` header
- Stored in `localStorage` on the frontend (for learning purposes)
- Used to authenticate every API request

### Refresh Token
- Long-lived JWT (7 days)
- Stored in an **HttpOnly cookie** on the backend
- Never exposed to JavaScript — prevents XSS attacks from stealing it
- Used only to obtain a new access token when the current one expires

### Why HttpOnly Cookie?
HttpOnly cookies cannot be accessed by JavaScript (`document.cookie`), which means even if an attacker injects malicious scripts (XSS), they cannot steal the refresh token. Combined with `sameSite: 'strict'`, this also provides CSRF protection.

## Testing the Token Refresh Flow

1. Register or login at http://localhost:5173
2. Navigate to the Dashboard — your profile loads successfully
3. Wait **15+ seconds** (access token expires)
4. Click **"Refresh Profile"** on the Dashboard
5. Open browser DevTools → Network tab
6. You will see:
   - `GET /api/auth/profile` → 401 (token expired)
   - `POST /api/auth/refresh-token` → 200 (new token issued)
   - `GET /api/auth/profile` → 200 (original request retried)
7. Profile loads successfully — you stayed logged in!

## Major Files Explained

### Backend

| File | Purpose |
|------|---------|
| `src/utils/token.js` | Generates and verifies JWT access/refresh tokens |
| `src/utils/cookie.js` | HttpOnly cookie options for refresh token |
| `src/middleware/auth.js` | Validates access token on protected routes |
| `src/controllers/authController.js` | Handles all auth HTTP requests |
| `src/services/authService.js` | Business logic (register, login, profile) |
| `src/models/User.js` | Mongoose schema with bcrypt password hashing |

### Frontend

| File | Purpose |
|------|---------|
| `src/api/axios.js` | Axios instance with auto token attach & 401 refresh |
| `src/context/AuthContext.jsx` | Global auth state (user, login, logout) |
| `src/components/ProtectedRoute.jsx` | Redirects unauthenticated users to login |
| `src/pages/Dashboard.jsx` | Demo page showing profile + refresh flow |

## Production Notes

- Change `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` to long random strings
- Increase access token expiry from `15s` to `15m` in `src/utils/token.js`
- Use HTTPS in production (`secure: true` on cookies is already configured)
- Consider storing refresh tokens in the database for revocation support
- Do not store access tokens in localStorage in production — use memory or secure storage
