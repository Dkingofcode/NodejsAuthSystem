# User Authentication System - Backend

A production-grade, enterprise-level user authentication system built with Node.js, Express, PostgreSQL, and JWT. Features include email/password authentication, OAuth integration, two-factor authentication (2FA), session management, and comprehensive security measures.

## 🚀 Features

### Core Authentication
- ✅ **Email/Password Registration & Login**
- ✅ **JWT Access & Refresh Tokens**
- ✅ **Email Verification**
- ✅ **Password Reset Flow**
- ✅ **Account Lockout** (after failed attempts)

### Advanced Security
- ✅ **Two-Factor Authentication (2FA)** with QR codes and backup codes
- ✅ **Session Management** with device tracking
- ✅ **Rate Limiting** (global and per-endpoint)
- ✅ **Password Strength Validation**
- ✅ **SQL Injection Protection**
- ✅ **XSS Protection** with Helmet.js
- ✅ **CORS Configuration**

### User Management
- ✅ **Profile Updates** (name, username, picture)
- ✅ **Password Changes**
- ✅ **Account Deletion** (soft delete)
- ✅ **Active Sessions View**
- ✅ **Session Revocation**

### Developer Experience
- ✅ **Production-Ready Error Handling**
- ✅ **Comprehensive Logging** with Winston
- ✅ **Input Validation Middleware**
- ✅ **API Documentation**
- ✅ **Test Suite** with Jest & Supertest

## 📋 Prerequisites

- Node.js >= 16.0.0
- PostgreSQL >= 13
- npm >= 8.0.0

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone 
cd userauthsys
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create PostgreSQL databases
```sql
CREATE DATABASE userauth_db;
CREATE DATABASE userauth_test_db;
```

### 4. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=userauth_db
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=7d

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### 5. Run database migrations
```bash
npm run db:migrate
```

## 🚀 Running the Application

### Development mode
```bash
npm run dev
```

### Production mode
```bash
npm start
```

### Run tests
```bash
npm test
```

### Run tests with coverage
```bash
npm run test:coverage
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "role": "user",
      "isEmailVerified": false
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (without 2FA):**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

**Response (with 2FA):**
```json
{
  "status": "success",
  "message": "2FA verification required",
  "data": {
    "requires2FA": true,
    "tempToken": "eyJhbGc..."
  }
}
```

#### Verify 2FA
```http
POST /api/auth/verify-2fa
Content-Type: application/json

{
  "tempToken": "eyJhbGc...",
  "code": "123456"
}
```

#### Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

#### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### Reset Password
```http
POST /api/auth/reset-password/:token
Content-Type: application/json

{
  "password": "NewSecurePass123!"
}
```

#### Verify Email
```http
GET /api/auth/verify-email/:token
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {accessToken}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}
```

### 2FA Endpoints

#### Setup 2FA
```http
POST /api/auth/2fa/setup
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,...",
    "backupCodes": ["abc123de", "fgh456ij", ...]
  }
}
```

#### Enable 2FA
```http
POST /api/auth/2fa/enable
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "code": "123456"
}
```

#### Disable 2FA
```http
POST /api/auth/2fa/disable
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "code": "123456"
}
```

### User Profile Endpoints

#### Update Profile
```http
PATCH /api/users/profile
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe2023"
}
```

#### Update Password
```http
PATCH /api/users/password
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!"
}
```

#### Update Profile Picture
```http
PATCH /api/users/profile-picture
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "profilePicture": "https://example.com/avatar.jpg"
}
```

#### Delete Account
```http
DELETE /api/users/account
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "password": "SecurePass123!"
}
```

### Session Management Endpoints

#### Get All Sessions
```http
GET /api/users/sessions
Authorization: Bearer {accessToken}
```

#### Revoke Specific Session
```http
DELETE /api/users/sessions/:sessionId
Authorization: Bearer {accessToken}
```

#### Revoke All Other Sessions
```http
POST /api/users/sessions/revoke-all
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "currentRefreshToken": "eyJhbGc..."
}
```

## 🔒 Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Rate Limiting
- Global: 100 requests per 15 minutes per IP
- Auth endpoints: 5 requests per 15 minutes per IP
- User-specific: Configurable per route

### Account Protection
- Account locks after 5 failed login attempts
- Lock duration: 30 minutes
- Automatic unlock after duration

### Token Management
- Access tokens: 15 minutes (configurable)
- Refresh tokens: 7 days (configurable)
- Automatic token rotation
- Refresh token families for security

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Test coverage
```bash
npm run test:coverage
```

### Test files structure
```
src/tests/
├── auth.test.js           # Authentication tests
├── user.test.js           # User management tests
├── 2fa.test.js           # 2FA tests
└── factories/
    └── userFactory.js     # Test data factories
```

## 📁 Project Structure

```
userauthsys/
├── src/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── controllers/
│   │   ├── auth.controller.js   # Authentication logic
│   │   └── user.controller.js   # User management logic
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   └── validation.js        # Input validation
│   ├── models/
│   │   ├── User.js              # User model
│   │   ├── RefreshToken.js      # Refresh token model
│   │   └── index.js             # Model associations
│   ├── routes/
│   │   ├── auth.routes.js       # Auth endpoints
│   │   └── user.routes.js       # User endpoints
│   ├── utils/
│   │   ├── errors.js            # Error handling
│   │   ├── email.js             # Email utilities
│   │   └── logger.js            # Logging utilities
│   ├── tests/
│   │   └── ...                  # Test files
│   └── app.js                   # Express app setup
├── logs/                        # Application logs
├── .env                         # Environment variables
├── .env.example                 # Environment template
├── package.json
├── README.md
└── server.js                    # Entry point
```

## 🌍 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | - |
| `DB_USER` | Database user | - |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token secret | - |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `7d` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |
| `SMTP_HOST` | Email server host | - |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email username | - |
| `SMTP_PASSWORD` | Email password | - |

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 423 | Locked (Account locked) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## 📝 Common Error Responses

```json
{
  "status": "fail",
  "message": "Error description here"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Your Name - [Your Portfolio](https://yourportfolio.com)

## 🙏 Acknowledgments

- Express.js for the web framework
- Sequelize for ORM
- JWT for token-based authentication
- Speakeasy for 2FA implementation
- Winston for logging