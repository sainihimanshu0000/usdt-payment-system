# USDT Payment System

Admin panel, user deposit portal, and Node.js API for collecting and approving USDT deposits.

## Stack

- **Backend:** Express, MongoDB, JWT, Swagger
- **Frontend:** React (Vite) admin panel + user portal

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API runs on `http://localhost:4000`  
Swagger docs: `http://localhost:4000/api/docs`

Requires MongoDB on `mongodb://localhost:27017`.

### 2. Admin panel

```bash
cd admin-panel
cp .env.example .env
npm install
npm run dev
```

- Admin login: `http://localhost:5173/login`
- User portal: `http://localhost:5173/portal/login`

Default admin credentials come from `backend/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Flow

1. Set the receiving wallet in **Settings**
2. Create a user in **Users**
3. User adds a bank account in the portal (**Banks**), then activates it
4. Active bank accounts appear on **Deposit** for UPI
5. User submits a tx hash from the portal **Deposit** page
6. Admin approves or rejects the payment

User portal bank screens: `/portal/banks` and `/portal/banks/add`

## Deploy on Vercel

You need **2 Vercel projects** + **MongoDB Atlas** (Vercel has no local MongoDB).

### 1. MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Database Access → create a user
3. Network Access → allow `0.0.0.0/0` (or Vercel IPs)
4. Connect → copy the URI, e.g. `mongodb+srv://USER:PASS@cluster.../usdt-payment`

### 2. Deploy backend API

1. [vercel.com/new](https://vercel.com/new) → Import `sainihimanshu0000/usdt-payment-system`
2. **Root Directory:** `backend`
3. Framework: Other
4. Environment Variables:

| Name | Example |
|------|---------|
| `MONGODB_URI` | your Atlas connection string |
| `JWT_SECRET` | long random string |
| `ADMIN_EMAIL` | `admin@apex.com` |
| `ADMIN_PASSWORD` | strong password |
| `SKIP_BLOCKCHAIN_VERIFY` | `true` (set `false` in real production) |

5. Deploy → copy the URL, e.g. `https://usdt-api.vercel.app`

Swagger: `https://YOUR-API.vercel.app/api/docs`

### 3. Deploy admin panel + user portal

1. Import the **same** GitHub repo again as a second project
2. **Root Directory:** `admin-panel`
3. Framework: Vite
4. Environment Variable:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://YOUR-API.vercel.app/api` |

5. Deploy → open `https://YOUR-APP.vercel.app/login`

### 4. After deploy

1. Admin login with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
2. Set wallet in **Settings**
3. Create a user, then use `/portal/login` for deposits

### Notes

- `VITE_API_URL` is baked in at **build time** — change it, then redeploy the admin panel
- Cold starts on the free API can take a few seconds
- For a always-on API, Railway/Render is often smoother; Vercel still works for this app
