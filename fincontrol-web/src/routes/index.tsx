import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import Login from '../pages/Login';
import VerifyEmail from '../pages/VerifyEmail';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Unsubscribe from '../pages/Unsubscribe';
import Dashboard from '../pages/Dashboard';
import Transactions from '../pages/Transactions';
import TransactionForm from '../pages/TransactionForm';
import Simulations from '../pages/Simulations';
import Cards from '../pages/Cards';
import CardCycleDetail from '../pages/CardCycleDetail';
import Categories from '../pages/Categories';
import MonthlyReference from '../pages/MonthlyReference';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={isAuthenticated ? <Navigate to="/" /> : <ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/new" element={<TransactionForm />} />
          <Route path="/transactions/:id/edit" element={<TransactionForm />} />
          <Route path="/simulations" element={<Simulations />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/cards/:id" element={<CardCycleDetail />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/monthly-reference" element={<MonthlyReference />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
