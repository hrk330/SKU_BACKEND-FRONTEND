# SKU System Deployment Guide

## Environment Variables Setup

### Frontend (.env.local)
Create `sku-system-frontend/.env.local` with:
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001/api/v1
```

### Backend Environment Variables (Vercel)
Set these in your Vercel project settings:

```
SECRET_KEY=your-django-secret-key-here
DATABASE_URL=postgresql://user:password@host:port/database
ALLOWED_HOST=your-backend-domain.vercel.app
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
REDIS_URL=redis://localhost:6379/1
```

## Deployment Steps

### 1. Backend Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy

### 2. Frontend Deployment
1. Update API URL to backend domain
2. Deploy to Vercel
3. Test integration

## Database Setup
- Use PostgreSQL (recommended: Neon, Supabase, or Railway)
- Run migrations after deployment
