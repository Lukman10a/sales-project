# Phase 1 Testing Guide - Authentication Module

## Overview

This guide will help you test Phase 1 endpoints incrementally. Follow each step in order.

---

## Prerequisites

### 1. Setup PostgreSQL Database

```bash
# Using Docker (recommended):
docker run -d \
  --name luxa-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=luxa_sales \
  -p 5432:5432 \
  postgres:15

# Or install PostgreSQL locally and create database:
createdb luxa_sales
```

### 2. Verify Environment Variables

Check your `.env` file matches these settings:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/luxa_sales
JWT_SECRET=dev_jwt_secret_key_12345678901234567890123456789012
JWT_REFRESH_SECRET=dev_refresh_secret_key_12345678901234567890123456789012
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
PORT=4000
FRONTEND_URL=http://localhost:3000
```

### 3. Start the Server

```bash
cd backend
npm run start:dev
```

You should see:

```
🚀 Server running on http://localhost:4000
```

---

## Phase 1 Endpoint Testing (Incremental)

### Test 1.1: Register New User ✅

**Endpoint:** `POST /auth/register`

**Request Body:**

```json
{
  "email": "john@primebusiness.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "businessName": "Prime Store"
}
```

**cURL Command:**

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"john@primebusiness.com","password":"Password123!","firstName":"John","lastName":"Doe","businessName":"Prime Store"}'
```

**Expected Response (201 Created):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "email": "john@primebusiness.com",
    "firstName": "John",
    "lastName": "Doe",
    "businessName": "Prime Store",
    "role": "owner"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

**✅ Success Checklist:**

- [ ] Response status is 201
- [ ] Returns valid access_token and refresh_token
- [ ] User object contains correct data
- [ ] Email is correctly formatted
- [ ] Role is set to "owner"

**❌ Error Cases to Test:**

```bash
# Test duplicate email (should return 400)
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"john@primebusiness.com","password":"Password123!","firstName":"Jane","lastName":"Smith","businessName":"Another Store"}'

# Test weak password (should return 400)
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"weak","firstName":"Test","lastName":"User","businessName":"Test Store"}'

# Test invalid email (should return 400)
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"Password123!","firstName":"Test","lastName":"User","businessName":"Test Store"}'
```

**Save tokens for next tests:**

```bash
# Save the access_token from your response
export ACCESS_TOKEN="your_access_token_here"
export REFRESH_TOKEN="your_refresh_token_here"
```

---

### Test 1.2: Login with Credentials ✅

**Endpoint:** `POST /auth/login`

**Request Body:**

```json
{
  "email": "john@primebusiness.com",
  "password": "Password123!"
}
```

**cURL Command:**

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@primebusiness.com","password":"Password123!"}'
```

**Expected Response (200 OK):**

```json
{
  "user": {
    "id": "uuid-here",
    "email": "john@primebusiness.com",
    "firstName": "John",
    "lastName": "Doe",
    "businessName": "Prime Store",
    "role": "owner"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

**✅ Success Checklist:**

- [ ] Response status is 200
- [ ] Returns new access_token and refresh_token
- [ ] User data matches registered account
- [ ] Can use token in subsequent requests

**❌ Error Cases to Test:**

```bash
# Test wrong password (should return 401)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@primebusiness.com","password":"WrongPassword123!"}'

# Test non-existent email (should return 401)
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@email.com","password":"Password123!"}'
```

---

### Test 1.3: Get Current User (Protected Route) ✅

**Endpoint:** `GET /auth/me`

**Headers Required:**

```
Authorization: Bearer {access_token}
```

**cURL Command:**

```bash
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response (200 OK):**

```json
{
  "id": "uuid-here",
  "email": "john@primebusiness.com",
  "role": "owner",
  "businessName": "Prime Store"
}
```

**✅ Success Checklist:**

- [ ] Response status is 200
- [ ] Returns current user data from token
- [ ] JWT authentication works

**❌ Error Cases to Test:**

```bash
# Test without token (should return 401)
curl -X GET http://localhost:4000/auth/me

# Test with invalid token (should return 401)
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer invalid_token_here"
```

---

### Test 1.4: Refresh Access Token ✅

**Endpoint:** `POST /auth/refresh`

**Request Body:**

```json
{
  "refreshToken": "your_refresh_token_from_login"
}
```

**cURL Command:**

```bash
curl -X POST http://localhost:4000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

**Expected Response (200 OK):**

```json
{
  "user": {
    "id": "uuid-here",
    "email": "john@primebusiness.com",
    "firstName": "John",
    "lastName": "Doe",
    "businessName": "Prime Store",
    "role": "owner"
  },
  "access_token": "new_access_token_here",
  "refresh_token": "new_refresh_token_here"
}
```

**✅ Success Checklist:**

- [ ] Response status is 200
- [ ] Returns new fresh tokens
- [ ] New access_token works for protected routes

**❌ Error Cases to Test:**

```bash
# Test with invalid refresh token (should return 401)
curl -X POST http://localhost:4000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"invalid_refresh_token"}'

# Test with expired refresh token (should return 401)
# Wait 7 days or modify JWT_REFRESH_EXPIRATION=1s in .env for quick test
```

---

### Test 1.5: Logout ✅

**Endpoint:** `POST /auth/logout`

**Headers Required:**

```
Authorization: Bearer {access_token}
```

**cURL Command:**

```bash
curl -X POST http://localhost:4000/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

**Expected Response (200 OK):**

```json
{
  "message": "Logged out successfully"
}
```

**✅ Success Checklist:**

- [ ] Response status is 200
- [ ] Returns success message
- [ ] (Note: Token is not blacklisted in this MVP - production app would implement this)

---

## Postman Collection (Alternative to cURL)

If you prefer Postman, import this collection:

```json
{
  "info": {
    "name": "LUXA Sales - Phase 1 Auth",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register User",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "url": "http://localhost:4000/auth/register",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"john@primebusiness.com\",\n  \"password\": \"Password123!\",\n  \"firstName\": \"John\",\n  \"lastName\": \"Doe\",\n  \"businessName\": \"Prime Store\"\n}"
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "url": "http://localhost:4000/auth/login",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"john@primebusiness.com\",\n  \"password\": \"Password123!\"\n}"
        }
      }
    },
    {
      "name": "Get Current User",
      "request": {
        "method": "GET",
        "header": [
          { "key": "Authorization", "value": "Bearer {{access_token}}" }
        ],
        "url": "http://localhost:4000/auth/me"
      }
    },
    {
      "name": "Refresh Token",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "url": "http://localhost:4000/auth/refresh",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"refreshToken\": \"{{refresh_token}}\"\n}"
        }
      }
    },
    {
      "name": "Logout",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Authorization", "value": "Bearer {{access_token}}" }
        ],
        "url": "http://localhost:4000/auth/logout"
      }
    }
  ]
}
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Or if installed locally
pg_isready

# Test database connection
psql -U postgres -d luxa_sales -c "SELECT 1"
```

### Port Already in Use

```bash
# Kill process on port 4000
# Windows PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process

# Or change PORT in .env file
PORT=3002
```

### Module Not Found Errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Phase 1 Completion Checklist

Before moving to Phase 2, verify:

- [ ] ✅ Server starts successfully on port 4000
- [ ] ✅ Database tables created (users table exists)
- [ ] ✅ Register endpoint creates new users
- [ ] ✅ Login endpoint authenticates successfully
- [ ] ✅ JWT tokens are generated correctly
- [ ] ✅ Protected routes require authentication
- [ ] ✅ Refresh token endpoint works
- [ ] ✅ Error handling returns proper status codes
- [ ] ✅ Password validation enforces strong passwords
- [ ] ✅ Duplicate email registration prevented

**All tests passing? Move to Phase 2!** 🎉

---

## Database Verification

Check the users table:

```sql
-- Connect to database
psql -U postgres -d luxa_sales

-- View all users
SELECT id, email, "firstName", "lastName", "businessName", role, "createdAt" FROM users;

-- View specific user
SELECT * FROM users WHERE email = 'john@primebusiness.com';
```

---

## Next Phase Preview

Once Phase 1 is complete, Phase 2 will add:

- User profile management (GET /profile)
- Update profile (PATCH /profile)
- Change password (POST /profile/change-password)
- Notification preferences

**Document your results and get approval before proceeding to Phase 2!**
