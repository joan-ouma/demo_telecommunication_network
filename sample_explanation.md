# Sample Code Explanation: server/routes/auth.js

## Overview
This file handles user authentication, including registration, login, and profile retrieval. It uses `bcryptjs` for password hashing and `jsonwebtoken` for session management.

## Code & SQL Breakdown

### 1. Registration Route (`POST /register`)
**Logic:**
- Validates that `username`, `email`, `password`, `first_name`, and `last_name` are present.
- Checks if the user already exists in the database.
- Hashes the password using `bcrypt`.
- Inserts the new user into the **Users** table.
- Generates a JWT token.

**SQL Statements:**
```sql
-- Check for existing user
SELECT user_id FROM Users WHERE username = ? OR email = ?

-- Insert new user
INSERT INTO Users (username, email, password_hash, first_name, last_name, phone_number, role) 
VALUES (?, ?, ?, ?, ?, ?, ?)
```

---

### 2. Login Route (`POST /login`)
**Logic:**
- Validates `username` and `password`.
- Fetches the user from the database.
- Compares the provided password with the stored hash.
- Logs the login action using `logAction`.
- Returns the user profile and JWT token.

**SQL Statements:**
```sql
-- Retrieve user details
SELECT * FROM Users WHERE username = ? OR email = ?
```

---

### 3. Profile Route (`GET /profile`)
**Logic:**
- Decodes the JWT token from the Authorization header.
- Fetches the user's details using the ID from the token.

**SQL Statements:**
```sql
-- Get current user profile
SELECT user_id, username, email, role, full_name, phone_number, created_at 
FROM Users WHERE user_id = ?
```
