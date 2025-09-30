# Deployment Checklist

## Pre-Deployment
- [ ] All code committed to GitHub
- [ ] Environment variables documented
- [ ] Database connection string ready
- [ ] CORS settings configured

## Backend Deployment
- [ ] Vercel project created
- [ ] Environment variables set:
  - [ ] SECRET_KEY
  - [ ] DATABASE_URL
  - [ ] ALLOWED_HOST
  - [ ] DJANGO_SETTINGS_MODULE
  - [ ] VERCEL=1
- [ ] Database migrations run
- [ ] Superuser created
- [ ] API endpoints tested

## Frontend Deployment
- [ ] Vercel project created
- [ ] Environment variables set:
  - [ ] NEXT_PUBLIC_API_URL
- [ ] Build successful
- [ ] Frontend connects to backend

## Post-Deployment Testing
- [ ] Backend API accessible
- [ ] Frontend loads correctly
- [ ] Authentication works
- [ ] Database operations work
- [ ] File uploads work (if applicable)
- [ ] All user roles can access their dashboards

## Security
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Environment variables secure
- [ ] Database credentials secure

## Monitoring
- [ ] Error tracking set up
- [ ] Performance monitoring enabled
- [ ] Logs accessible
