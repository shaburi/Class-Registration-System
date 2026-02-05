# UPTM Class Registration & Scheduling System

A comprehensive, secure class registration and scheduling system for UPTM FCOM.

## 🎯 Features

- **Role-Based Access Control**: Student, Lecturer, and Head of Programme roles
- **Smart Scheduling**: Automatic clash detection for time conflicts
- **Swap Requests**: Students can request section swaps
- **Manual Join Requests**: Request approval from lecturers for full sections
- **Real-time Timetables**: Dynamic schedule views for all users
- **Comprehensive Security**: SHA-256 hashing, JWT authentication, rate limiting, audit logging
- **Beautiful UI**: Modern, responsive interface built with React and TailwindCSS

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# Then create the database schema
psql -U postgres -f database/schema.sql

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at http://localhost:5173 and the backend API at http://localhost:5000.

## 📁 Project Structure

```
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── database/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   └── utils/
│   └── index.html
│
└── database/
    └── schema.sql
```

## 🔐 Default Accounts

After running the database schema, you'll have these test accounts:

**Head of Programme:**
- Email: hop@uptm.edu.my
- Firebase UID: firebase_hop_uid_123

**Lecturer:**
- Email: lecturer1@uptm.edu.my
- Firebase UID: firebase_lecturer_uid_456

**Students:**
- Email: student1@student.uptm.edu.my
- Email: student2@student.uptm.edu.my

## 🛠️ Tech Stack

**Backend:**
- Node.js & Express.js
- PostgreSQL with Row-Level Security
- Firebase Authentication
- Winston logging
- Joi validation
- Helmet security headers

**Frontend:**
- React 19
- Vite
- TailwindCSS
- Framer Motion
- React Router DOM
- Lucide React (icons)

## 📚 API Documentation

See [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) for complete API reference.

## 🔒 Security Features

- JWT-based authentication with Firebase
- bcrypt password hashing
- SHA-256 user ID anonymization in logs
- Rate limiting on all endpoints
- Helmet security headers
- CORS protection
- SQL injection prevention (parameterized queries)
- Row-level security in PostgreSQL
- Comprehensive audit logging

## 📊 Database Schema

The system uses 7 main tables:
- `users` - All user accounts
- `subjects` - Course subjects
- `sections` - Class sections with schedules
- `registrations` - Student enrollments
- `swap_requests` - Section swap requests
- `manual_join_requests` - Full-section join requests
- `audit_logs` - Security and action tracking

## 🚢 Deployment

**Recommended Free Hosting:**

- **Frontend**: Vercel (vercel.com)
- **Backend**: Render (render.com)
- **Database**: Render PostgreSQL or Supabase

See deployment guides in `/docs` folder.

## 📝 License

MIT License - See LICENSE file for details

## 👥 Authors

UPTM FCOM Development Team

## 🆘 Support

For issues and questions, please create an issue in the GitHub repository.

---

**Built with ❤️ for UPTM FCOM**
