# Deployment Guide

## Architecture
- **Frontend:** Vercel (React + Vite)
- **Backend:** Render.com (Node.js + Express)
- **Database:** MongoDB Atlas

## Backend Deployment (Render.com)

### 1. Подготовка
Backend уже готов в папке `server/` со всеми необходимыми файлами:
- `server.js` - главный файл сервера
- `models/` - Mongoose модели (User, Post, Comment, Like, Story)
- `routes/` - API endpoints
- `middleware/` - authentication middleware
- `package.json` - зависимости

### 2. Создание Web Service на Render.com
1. Перейдите на https://render.com
2. Войдите через GitHub
3. Нажмите "New+" → "Web Service"
4. Подключите ваш GitHub репозиторий `v1je13/Vhelp`
5. Настройте:

**Build & Deploy:**
- Root Directory: `server`
- Build Command: `npm install`
- Start Command: `node server.js`
- Root Directory: `server`

**Environment Variables:**
- `MONGODB_URI` = `mongodb+srv://dwije48_db_user:TwViXE3tFtZqEOA2@travel-diary.ru6yi58.mongodb.net/?appName=travel-diary`
- `JWT_SECRET` = `travel_diary_secret_key_2024_secure`
- `NODE_ENV` = `production`
- `PORT` = `10000`

6. Нажмите "Create Web Service"

### 3. Проверка
После деплоя проверьте health endpoint:
```
https://travel-diary-backend.onrender.com/api/health
```
Должен вернуть: `{"status":"ok","message":"Server is running"}`

## Frontend Deployment (Vercel)

### 1. Подготовка
Frontend уже готов для Vercel:
- `vercel.json` - конфигурация деплоя
- `.env.example` - пример environment variables

### 2. Создание проекта на Vercel
1. Перейдите на https://vercel.com
2. Войдите через GitHub
3. Нажмите "Add New Project"
4. Импортируйте репозиторий `v1je13/Vhelp`
5. Настройте:

**Build Settings:**
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: `npm install`

**Environment Variables:**
- `VITE_API_URL` = `https://travel-diary-backend.onrender.com/api`

6. Нажмите "Deploy"

### 3. Проверка
После деплоя откройте ваш Vercel URL и протестируйте приложение.

## MongoDB Atlas Setup

### 1. Создание кластера
1. Перейдите на https://www.mongodb.com/cloud/atlas
2. Создайте бесплатный кластер (M0)
3. Создайте базу данных "travel-diary"

### 2. Создание пользователя
1. Database Access → Create User
2. Username и Password (сохраните их)
3. Roles: Read and write to any database

### 3. Network Access
1. Network Access → Add IP Address
2. IP: `0.0.0.0/0` (для доступа с Vercel и Render.com)

### 4. Получение Connection String
1. Connect → Connect your application
2. Driver: Node.js
3. Copy connection string
4. Замените `<password>` на ваш пароль

## Локальная разработка

### Backend
```bash
cd server
npm install
node server.js
```
Backend будет доступен на `http://localhost:5000/api`

### Frontend
```bash
npm install
npm start
```
Frontend будет доступен на `http://localhost:5173`

## Troubleshooting

**Backend не запускается на Render.com:**
- Проверьте логи в Render.com dashboard
- Убедитесь что все environment variables добавлены
- Проверьте что MongoDB Atlas IP whitelist включает 0.0.0.0/0

**Frontend не подключается к backend:**
- Проверьте что VITE_API_URL указывает на правильный backend URL
- Проверьте что backend работает и отвечает на /api/health
- Проверьте CORS настройки в server.js

**MongoDB connection error:**
- Проверьте что connection string правильный
- Убедитесь что IP добавлен в Network Access на MongoDB Atlas
- Проверьте что пользователь имеет нужные права
