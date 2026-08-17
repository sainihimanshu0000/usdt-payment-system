import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { UserAuthProvider } from './context/UserAuthContext';
import PrivateRoute from './components/Layout/PrivateRoute';
import UserPrivateRoute from './components/Layout/UserPrivateRoute';
import Layout from './components/Layout/Layout';
import UserLayout from './components/Layout/UserLayout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Payments = lazy(() => import('./pages/Payments'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminBankAccounts = lazy(() => import('./pages/AdminBankAccounts'));
const UserLogin = lazy(() => import('./pages/user/UserLogin'));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const Deposit = lazy(() => import('./pages/user/Deposit'));
const BankAccounts = lazy(() => import('./pages/user/BankAccounts'));
const AddBank = lazy(() => import('./pages/user/AddBank'));

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <UserAuthProvider>
          <ToastContainer position="top-right" autoClose={3000} transition={Bounce} />
          <Suspense fallback={<div className="p-4">Loading...</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/portal/login" element={<UserLogin />} />

              <Route path="/portal" element={<UserPrivateRoute />}>
                <Route element={<UserLayout />}>
                  <Route index element={<UserDashboard />} />
                  <Route path="deposit" element={<Deposit />} />
                  <Route path="banks" element={<BankAccounts />} />
                  <Route path="banks/add" element={<AddBank />} />
                  <Route path="banks/:id/edit" element={<AddBank />} />
                </Route>
              </Route>

              <Route path="/" element={<PrivateRoute />}>
                <Route element={<Layout />}>
                  <Route index element={<Navigate to="/dashboard" />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="users" element={<Users />} />
                  <Route path="bank-accounts" element={<AdminBankAccounts />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </UserAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
