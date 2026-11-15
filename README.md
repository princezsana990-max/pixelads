# Pixel Ads - Production Business Order Management System

A production-ready order management platform built with React (Vite) frontend, Node.js + Express backend, and Supabase (PostgreSQL) database. Fully responsive on desktop and mobile, with role-based portals for Administrators, Order Takers, and Video Editors.

---

## 1. Stack & Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, React Query (TanStack Query), React Router 6, jsPDF.
- **Backend**: Node.js, Express, Zod input validation, Bcrypt password hashing, JWT in httpOnly cookies, Nodemailer SMTP, ExcelJS, Supabase JS client.
- **Database & Storage**: Supabase PostgreSQL with Row Level Security (RLS), B-tree indexes, Supabase Storage for direct signed uploads, and Supabase Realtime channels with Presence.
- **Deployment**: Monorepo deployed on Vercel with `/client` and `/server`, Express exported as a serverless function (`api/index.js`), and `vercel.json` routing.
- **Desktop & Mobile**: Electron desktop wrapper with electron-builder installer, and Capacitor Android wrapper for APK generation.
- **Design System**: 80% white, 10% black, 10% orange (`#F97316`). Headings in Calibri, body in Arial. All borders 1.5px with rounded corners. Zero emojis, zero gradients. Tables automatically transform into cards on mobile viewports.

---

## 2. Directory Structure

```text
PIXEL-ADS/
├── package.json
├── vercel.json
├── .gitignore
├── .env.example
├── README.md
├── capacitor.config.json
├── api/
│   └── index.js
├── electron/
│   ├── package.json
│   ├── main.js
│   └── preload.js
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/
│       ├── components/
│       │   ├── ui/
│       │   ├── layout/
│       │   ├── chat/
│       │   └── shared/
│       ├── context/
│       ├── hooks/
│       ├── pages/
│       └── utils/
└── server/
    ├── package.json
    ├── .env.example
    ├── api/
    │   └── index.js
    ├── migrations/
    │   └── 001_initial_schema.sql
    └── src/
        ├── app.js
        ├── server.js
        ├── config/
        ├── constants/
        ├── controllers/
        ├── middleware/
        ├── routes/
        ├── services/
        ├── utils/
        └── validators/
```

---

## 3. Database Setup (Supabase)

1. Open your Supabase project dashboard.
2. Go to **SQL Editor**.
3. Open `server/migrations/001_initial_schema.sql`.
4. Copy and execute the full SQL script.
   - Creates tables: `users`, `orders`, `order_files`, `assignments`, `messages`, `ad_sessions`, `notifications`, `settings`.
   - Creates B-tree indexes on foreign keys, status, created_at, and search columns.
   - Sets up automatic `updated_at` trigger functions.
   - Enables Row Level Security (RLS) on all tables.
   - Configures storage buckets: `order-files`, `chat-media`, and `branding`.
   - Seeds initial administrator account:
     - **Username**: `admin`
     - **Password**: `admin123`
     - **Employee ID**: `EMP-1000`

---

## 4. Environment Variables

Create `.env` at the root and in `server/`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=admin@pixelads.com
NODE_ENV=development
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 5. Local Development Commands

### Install all dependencies

```bash
# Root
npm install

# Server
cd server
npm install
cd ..

# Client
cd client
npm install
cd ..
```

### Start Both Client and Server

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

### Build Production Assets

```bash
npm run build
```

---

## 6. Vercel Deployment

1. Push this repository to GitHub or GitLab.
2. Go to [Vercel](https://vercel.com) and click **Add New Project**.
3. Select this repository.
4. Set the Environment Variables in the Vercel dashboard from your `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `JWT_SECRET`
   - `CLIENT_URL` (set to your Vercel domain, e.g. `https://your-domain.vercel.app`)
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Click **Deploy**. Vercel will:
   - Build client SPA into static assets using `@vercel/static-build`.
   - Mount Express API as a serverless function at `/api/*` using `@vercel/node`.

---

## 7. Electron Desktop App Build

To build the standalone Windows installer (`.exe`):

```bash
cd electron
npm install
npm run dist
```

- Target: NSIS installer.
- Output: `electron/dist/Pixel Ads Order Management Setup 1.0.0.exe`.
- Can be distributed directly to employees on Windows.

---

## 8. Capacitor Android APK Build

To wrap the web application into an Android APK:

1. Install Capacitor CLI and Android platform:

```bash
cd client
npm install -D @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Pixel Ads" "com.pixelads.mobile" --web-dir dist
npm run build
npx cap add android
npx cap sync android
```

2. Open and build APK in Android Studio:

```bash
npx cap open android
```

3. In Android Studio:
   - Select **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - The compiled release/debug APK will be located in `android/app/build/outputs/apk/debug/app-debug.apk`.
   - Distribute the APK file to staff devices or deploy to internal MDM.
