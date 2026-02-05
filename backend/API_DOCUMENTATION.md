# UPTM Class Registration & Scheduling System - API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
All endpoints (except health check) require authentication via Firebase token in the Authorization header:
```
Authorization: Bearer <firebase_token>
```

---

## Student Endpoints

### 1. View Available Subjects
**GET** `/student/subjects`

Get all sections available for student's semester and programme.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "subject_id": "uuid",
      "code": "CSC301",
      "name": "Data Structures and Algorithms",
      "credit_hours": 3,
      "section_id": "uuid",
      "section_number": "A",
      "capacity": 30,
      "enrolled_count": 25,
      "available_seats": 5,
      "day": "monday",
      "start_time": "09:00",
      "end_time": "11:00",
      "room": "R301",
      "lecturer_name": "Prof. Siti Aminah"
    }
  ]
}
```

### 2. Register for Section
**POST** `/student/register/:sectionId`

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/v1/student/register/section-uuid-here \
  -H "Authorization: Bearer your-firebase-token" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully registered for section",
  "registration": {
    "id": "uuid",
    "student_id": "uuid",
    "section_id": "uuid",
    "registered_at": "2026-01-09T08:49:35Z",
    "registration_type": "normal"
  }
}
```

### 3. Unregister from Section
**DELETE** `/student/register/:registrationId`

**cURL Example:**
```bash
curl -X DELETE http://localhost:5000/api/v1/student/register/registration-uuid \
  -H "Authorization: Bearer your-firebase-token"
```

### 4. View Current Registrations
**GET** `/student/registrations`

### 5. Create Swap Request
**POST** `/student/swap-request`

**Request Body:**
```json
{
  "requesterSectionId": "uuid",
  "targetId": "target-student-uuid",
  "targetSectionId": "uuid"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/v1/student/swap-request \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "requesterSectionId": "your-section-uuid",
    "targetId": "target-student-uuid",
    "targetSectionId": "target-section-uuid"
  }'
```

### 6. Respond to Swap Request
**PUT** `/student/swap-request/:id/respond`

**Request Body:**
```json
{
  "accept": true,
  "reason": "Optional reason"
}
```

### 7. View Swap Requests
**GET** `/student/swap-requests?status=pending`

### 8. Create Manual Join Request
**POST** `/student/manual-join-request`

**Request Body:**
```json
{
  "sectionId": "uuid",
  "reason": "Need this class to graduate on time"
}
```

### 9. View Manual Join Requests
**GET** `/student/manual-join-requests?status=pending`

### 10. View Personal Timetable
**GET** `/student/timetable`

**Response:**
```json
{
  "success": true,
  "data": {
    "monday": [
      {
        "code": "CSC301",
        "subject_name": "Data Structures",
        "section_number": "A",
        "start_time": "09:00",
        "end_time": "11:00",
        "room": "R301",
        "lecturer_name": "Prof. Siti"
      }
    ],
    "tuesday": [],
    ...
  }
}
```

---

## Lecturer Endpoints

### 1. View Assigned Subjects
**GET** `/lecturer/subjects`

### 2. View Assigned Sections
**GET** `/lecturer/sections`

### 3. View Section Students
**GET** `/lecturer/sections/:id/students`

### 4. View Manual Join Requests
**GET** `/lecturer/manual-join-requests?status=pending`

### 5. Approve Manual Join Request
**PUT** `/lecturer/manual-join-requests/:id/approve`

**Request Body:**
```json
{
  "approvalReason": "Student has valid reason"
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/api/v1/lecturer/manual-join-requests/request-uuid/approve \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"approvalReason": "Valid academic reason"}'
```

### 6. Reject Manual Join Request
**PUT** `/lecturer/manual-join-requests/:id/reject`

**Request Body:**
```json
{
  "rejectionReason": "Section is full and cannot accommodate more students"
}
```

### 7. View Teaching Timetable
**GET** `/lecturer/timetable`

---

## Head of Programme (HOP) Endpoints

### Subject Management

#### 1. Get All Subjects
**GET** `/hop/subjects?semester=3&programme=Computer%20Science`

#### 2. Create Subject
**POST** `/hop/subjects`

**Request Body:**
```json
{
  "code": "CSC401",
  "name": "Machine Learning",
  "creditHours": 3,
  "semester": 4,
  "programme": "Computer Science",
  "description": "Introduction to ML algorithms",
  "prerequisites": ["CSC301", "MATH201"]
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/v1/hop/subjects \
  -H "Authorization: Bearer your-hop-token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "CSC401",
    "name": "Machine Learning",
    "creditHours": 3,
    "semester": 4,
    "programme": "Computer Science"
  }'
```

#### 3. Update Subject
**PUT** `/hop/subjects/:id`

**Request Body:**
```json
{
  "name": "Advanced Machine Learning",
  "description": "Updated description"
}
```

#### 4. Delete Subject
**DELETE** `/hop/subjects/:id`

### Section Management

#### 5. Get All Sections
**GET** `/hop/sections?subjectId=uuid`

#### 6. Create Section
**POST** `/hop/sections`

**Request Body:**
```json
{
  "subjectId": "uuid",
  "sectionNumber": "B",
  "capacity": 35,
  "day": "wednesday",
  "startTime": "14:00",
  "endTime": "16:00",
  "room": "R402",
  "building": "Engineering Building",
  "lecturerId": "lecturer-uuid"
}
```

#### 7. Update Section
**PUT** `/hop/sections/:id`

**Request Body:**
```json
{
  "capacity": 40,
  "room": "R501"
}
```

#### 8. Assign Lecturer to Section
**PUT** `/hop/sections/:id/assign-lecturer`

**Request Body:**
```json
{
  "lecturerId": "lecturer-uuid"
}
```

#### 9. Delete Section
**DELETE** `/hop/sections/:id`

### Registration Management

#### 10. Override Registration
**PUT** `/hop/registrations/:studentId/override`

**Request Body:**
```json
{
  "sectionId": "section-uuid"
}
```

**Description:** Force register a student even if section is full or has schedule clash.

### Request Management

#### 11. View All Manual Join Requests
**GET** `/hop/manual-join-requests?status=pending`

#### 12. Approve Manual Join Request
**PUT** `/hop/manual-join-requests/:id/approve`

#### 13. Reject Manual Join Request
**PUT** `/hop/manual-join-requests/:id/reject`

#### 14. View All Swap Requests
**GET** `/hop/swap-requests?status=pending`

### Reports & Analytics

#### 15. View Global Timetable
**GET** `/hop/timetable?semester=3&programme=Computer%20Science&day=monday`

#### 16. Get Statistics
**GET** `/hop/statistics`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalStudents": 500,
    "totalSections": 120,
    "totalRegistrations": 2400,
    "fullSections": 15,
    "averageUtilization": "85.50",
    "pendingSwapRequests": 3,
    "pendingManualJoinRequests": 7
  }
}
```

#### 17. Export Registrations to CSV
**GET** `/hop/export/registrations?semester=3&programme=Computer%20Science`

**Response:** CSV file download

**cURL Example:**
```bash
curl -X GET "http://localhost:5000/api/v1/hop/export/registrations?semester=3" \
  -H "Authorization: Bearer your-hop-token" \
  --output registrations.csv
```

#### 18. Export Section Summary to CSV
**GET** `/hop/export/section-summary?semester=3&programme=Computer%20Science`

**Response:** CSV file download with enrollment statistics per section

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error: sectionId is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "No authentication token provided"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Required role(s): hop",
  "userRole": "student"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Endpoint not found",
  "path": "/api/v1/invalid-path",
  "method": "GET"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 1674123456
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Database connection error"
}
```

---

## Common Query Parameters

- `status` - Filter by status: `pending`, `approved`, `rejected`, `cancelled`
- `semester` - Filter by semester: `1-8`
- `programme` - Filter by programme name
- `day` - Filter by day: `monday`, `tuesday`, etc.

---

## Rate Limits

- **General API**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **Failed login attempts**: 5 attempts, then 15-minute lockout

---

## Security Headers

All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`
