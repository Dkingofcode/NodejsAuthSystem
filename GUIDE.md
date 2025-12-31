# 🚀 Production-Grade User Authentication System - Complete Guide

## 📋 Project Overview

This is a **production-ready, enterprise-level** user authentication system designed to showcase advanced Node.js development skills. The project demonstrates expertise in security, scalability, and best practices that will impress potential employers.

## ✨ What Makes This Production-Grade?

### 1. **Security First**
- ✅ JWT with access & refresh tokens
- ✅ Two-Factor Authentication (2FA) with TOTP
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ Account lockout after failed attempts
- ✅ Rate limiting (global & per-endpoint)
- ✅ SQL injection protection
- ✅ XSS protection with Helmet
- ✅ CORS configuration
- ✅ Input validation & sanitization

### 2. **Enterprise Features**
- ✅ Email verification flow
- ✅ Password reset with tokens
- ✅ Session management (view & revoke)
- ✅ Soft delete for data retention
- ✅ Device tracking
- ✅ Audit logging with Winston
- ✅ Error tracking & monitoring

### 3. **Developer Experience**
- ✅ Comprehensive API documentation
- ✅ Test suite with Jest & Supertest
- ✅ Modular architecture
- ✅ Clear separation of concerns
- ✅ Reusable middleware
- ✅ Factory pattern for tests

### 4. **Scalability**
- ✅ Stateless JWT authentication
- ✅ Database connection pooling
- ✅ Async/await throughout
- ✅ Error handling middleware
- ✅ Environment-based configuration

## 📦 Backend Architecture

```
user-auth-backend/
├── src/
│   ├── config/
│   │   └── database.js              # Sequelize config with env switching
│   ├── controllers/
│   │   ├── auth.controller.js       # 15+ auth endpoints
│   │   └── user.controller.js       # Profile & session management
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification & role checks
│   │   └── validation.js            # Input validation rules
│   ├── models/
│   │   ├── User.js                  # User model with 20+ fields
│   │   ├── RefreshToken.js          # Refresh token tracking
│   │   └── index.js                 # Model associations
│   ├── routes/
│   │   ├── auth.routes.js           # Auth endpoints
│   │   └── user.routes.js           # User management endpoints
│   ├── utils/
│   │   ├── errors.js                # Custom error classes & handlers
│   │   ├── email.js                 # Email service with templates
│   │   └── logger.js                # Winston logger configuration
│   ├── tests/
│   │   ├── auth.test.js             # Authentication tests
│   │   └── factories/
│   │       └── userFactory.js       # Test data generation
│   └── app.js                       # Express app with middleware
├── .env.example                     # Environment template
├── package.json                     # Dependencies & scripts
├── server.js                        # Entry point with graceful shutdown
└── README.md                        # Comprehensive documentation
```

## 🎯 Key Backend Endpoints

### Authentication (15 endpoints)
1. `POST /api/auth/register` - User registration
2. `POST /api/auth/login` - User login
3. `POST /api/auth/verify-2fa` - 2FA verification
4. `POST /api/auth/refresh-token` - Token refresh
5. `POST /api/auth/logout` - User logout
6. `POST /api/auth/forgot-password` - Password reset request
7. `POST /api/auth/reset-password/:token` - Password reset
8. `GET /api/auth/verify-email/:token` - Email verification
9. `GET /api/auth/me` - Get current user
10. `POST /api/auth/2fa/setup` - Setup 2FA
11. `POST /api/auth/2fa/enable` - Enable 2FA
12. `POST /api/auth/2fa/disable` - Disable 2FA

### User Management (7 endpoints)
1. `PATCH /api/users/profile` - Update profile
2. `PATCH /api/users/password` - Change password
3. `PATCH /api/users/profile-picture` - Update avatar
4. `DELETE /api/users/account` - Delete account
5. `GET /api/users/sessions` - List sessions
6. `DELETE /api/users/sessions/:id` - Revoke session
7. `POST /api/users/sessions/revoke-all` - Revoke all others

## 🛠️ Installation & Setup

### Prerequisites
```bash
# Install Node.js 16+
node --version  # Should be >= 16.0.0

# Install PostgreSQL 13+
psql --version

# Install npm packages
npm install
```

### Database Setup
```sql
-- Connect to PostgreSQL
psql postgres

-- Create databases
CREATE DATABASE userauth_db;
CREATE DATABASE userauth_test_db;

-- Create user (optional)
CREATE USER auth_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE userauth_db TO auth_user;
GRANT ALL PRIVILEGES ON DATABASE userauth_test_db TO auth_user;
```

### Environment Variables
```bash
# Copy template
cp .env.example .env

# Edit with your values
nano .env
```

### Run Application
```bash
# Development with auto-reload
npm run dev

# Production
npm start

# Run tests
npm test

# Test with coverage
npm run test:coverage
```

## 📊 Database Schema

### User Table
- `id` (UUID, PK)
- `email` (String, Unique, Required)
- `username` (String, Unique)
- `password` (String, Hashed)
- `firstName`, `lastName`, `profilePicture`
- `role` (Enum: user, admin, moderator)
- `authProvider` (Enum: local, google, github, wallet)
- `googleId`, `githubId`, `walletAddress`
- `isEmailVerified`, `emailVerificationToken`, `emailVerificationExpires`
- `passwordResetToken`, `passwordResetExpires`
- `twoFactorSecret`, `twoFactorEnabled`, `twoFactorBackupCodes`
- `isActive`, `isLocked`, `failedLoginAttempts`, `lockedUntil`
- `lastLogin`, `lastPasswordChange`, `refreshToken`
- `createdAt`, `updatedAt`, `deletedAt` (soft delete)

### RefreshToken Table
- `id` (UUID, PK)
- `token` (String, Unique)
- `userId` (UUID, FK)
- `expiresAt` (Date)
- `isRevoked` (Boolean)
- `deviceInfo` (JSONB)
- `ipAddress` (String)
- `createdAt`, `updatedAt`

