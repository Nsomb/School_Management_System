# EDU School Management System

Multi-tenant SaaS for managing multiple schools.

## Features

- Multi-school support (unified platform, isolated data)
- Role-based access: Super Admin, School Admin, Bursar, Teacher
- Student, teacher, class, subject management
- Marks, attendance, fees tracking
- Report cards, honour rolls, PDF generation
- SMS + WhatsApp messaging (hybrid delivery)
- Excel exports for all reports

## Tech Stack

- **Backend:** Node.js + Express + PostgreSQL
- **Frontend:** React + TypeScript + Vite + MUI
- **Database:** PostgreSQL with Row-Level Security (RLS)
- **Messaging:** SMS provider + WhatsApp Cloud API

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DB credentials
npm start