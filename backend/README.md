# UPTM Class Registration & Scheduling System - Backend

A secure, scalable backend API for the UPTM Class Registration and Scheduling System built with Node.js, Express, PostgreSQL, and Firebase Authentication.

## Features

- ✅ **Role-Based Access Control**: Student, Lecturer, and Head of Programme roles
- ✅ **Capacity Management**: Atomic transactions prevent overbooking
- ✅ **Schedule Clash Detection**: Prevents time conflicts during registration
- ✅ **Swap Requests**: Students can swap sections with automatic validation
- ✅ **Manual Join Requests**: Request approval to join full sections
- ✅ **Comprehensive Security**: SHA-256 hashing, AES-256 encryption, reCAPTCHA v3, rate limiting
- ✅ **Audit Logging**: Every action is logged with encrypted sensitive data
- ✅ **CSV Exports**: Download registration reports
- ✅ **Real-time Timetables**: View schedules by role

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL 14+
- **Authentication**: Firebase Admin SDK
- **Security**: Helmet, CORS, rate-limiting, bcrypt, crypto
- **Validation**: Joi

## Installation

### 1. Clone Repository
```bash
cd "d:/FYP/AntiGravity UPTM/backend"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database

Install PostgreSQL and create database:
```bash
psql -U postgres
CREATE DATABASE uptm_registration;
\q
```

Run schema:
```bash
npm run db:setup
```

Or manually:
```bash
psql -U postgres -d uptm_registration -f database/schema.sql
```

### 4. Configure Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Update `.env` with your credentials:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=uptm_registration
DB_USER=postgres
DB_PASSWORD=your_password

# Firebase (get from Firebase Console)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com

# Generate encryption key
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AES_ENCRYPTION_KEY=your_64_character_hex_key

# reCAPTCHA v3 (get from Google reCAPTCHA)
RECAPTCHA_SECRET_KEY=your_secret_key
RECAPTCHA_SITE_KEY=your_site_key
```

### 5. Generate Encryption Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Running the Server

### Development Mode (with nodemon)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

### Quick Test
```bash
# Health check
curl http://localhost:5000/health

# API info
curl http://localhost:5000/api/v1
```

## Testing

```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration
```

## Project Structure

```
backend/
├── database/
│   ├── schema.sql          # PostgreSQL schema
│   └── connection.js       # DB connection pool
├── middleware/
│   ├── auth.js            # Firebase authentication
│   ├── rbac.js            # Role-based access control
│   ├── security.js        # Security utilities
│   └── audit.js           # Audit logging
├── services/
│   ├── registration.service.js  # Registration logic
│   ├── swap.service.js          # Swap requests
│   ├── manualJoin.service.js    # Manual join requests
│   ├── scheduling.service.js    # Timetables & exports
│   └── hop.service.js           # HOP management
├── routes/
│   ├── student.routes.js   # Student endpoints
│   ├── lecturer.routes.js  # Lecturer endpoints
│   └── hop.routes.js       # HOP endpoints
├── server.js              # Express server
├── package.json
├── .env.example
├── .gitignore
└── API_DOCUMENTATION.md
```

## Security Features

### 1. SHA-256 Hashing
User identifiers in audit logs are hashed for privacy.

### 2. AES-256 Encryption
Sensitive fields (request bodies in audit logs) are encrypted.

### 3. reCAPTCHA v3
Protects authentication endpoints from bots.

### 4. Brute Force Protection
- Max 5 failed login attempts
- 15-minute lockout period

### 5. Rate Limiting
- General API: 100 requests/minute
- Auth endpoints: 10 requests/minute

### 6. Input Sanitization
All inputs are sanitized to prevent XSS and SQL injection.

### 7. SSL Enforcement
Production mode redirects HTTP to HTTPS.

## Development Mode

For development without Firebase:

```bash
# Set in .env
NODE_ENV=development

# Use dev auth with header
curl -X GET http://localhost:5000/api/v1/student/subjects \
  -H "x-dev-user-email: student1@student.uptm.edu.my"
```

## Database Sample Data

The schema includes sample data:
- **HOP**: hop@uptm.edu.my
- **Lecturer**: lecturer1@uptm.edu.my
- **Students**: student1@student.uptm.edu.my, student2@student.uptm.edu.my
- **Subject**: CSC301 - Data Structures and Algorithms
- **Sections**: A (Monday 9-11am), B (Wednesday 2-4pm)

## Example Workflows

### Student Registration Flow
```bash
# 1. View available subjects
GET /api/v1/student/subjects

# 2. Register for section
POST /api/v1/student/register/{sectionId}

# 3. View registrations
GET /api/v1/student/registrations

# 4. View timetable
GET /api/v1/student/timetable
```

### Swap Request Flow
```bash
# 1. Create swap request
POST /api/v1/student/swap-request
Body: { requesterSectionId, targetId, targetSectionId }

# 2. Target student responds
PUT /api/v1/student/swap-request/{id}/respond
Body: { accept: true }

# Sections are automatically swapped
```

### Manual Join Flow
```bash
# 1. Student requests manual join
POST /api/v1/student/manual-join-request
Body: { sectionId, reason }

# 2. Lecturer approves
PUT /api/v1/lecturer/manual-join-requests/{id}/approve

# Student is automatically registered
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port | No (default: 5000) |
| `DB_HOST` | PostgreSQL host | Yes |
| `DB_PORT` | PostgreSQL port | No (default: 5432) |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database user | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `DB_SSL` | Enable SSL for DB | No |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `FIREBASE_PRIVATE_KEY` | Firebase private key | Yes |
| `FIREBASE_CLIENT_EMAIL` | Firebase client email | Yes |
| `AES_ENCRYPTION_KEY` | 64-char hex encryption key | Yes |
| `JWT_SECRET` | JWT secret (32+ chars) | Yes |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 secret | Yes |
| `RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key | Yes |
| `CORS_ORIGIN` | Allowed CORS origin | No |

## Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Verify database exists
psql -U postgres -l | grep uptm_registration

# Test connection with credentials from .env
psql -h localhost -U postgres -d uptm_registration
```

### Firebase Auth Error
- Verify Firebase credentials in `.env`
- Check private key format (must include `\n` for newlines)
- Ensure service account has correct permissions

### Rate Limit Issues
Increase limits in `.env`:
```env
RATE_LIMIT_MAX_REQUESTS=200
RATE_LIMIT_AUTH_MAX=20
```

## Contributing

1. Follow existing code structure
2. Add input validation for all endpoints
3. Include error handling
4. Update API documentation
5. Write tests for new features

## License

MIT License - UPTM FCOM

## Support

For issues or questions, contact UPTM FCOM IT Department.
