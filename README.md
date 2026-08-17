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
3. User submits a tx hash from the portal **Deposit** page
4. Admin approves or rejects the payment
