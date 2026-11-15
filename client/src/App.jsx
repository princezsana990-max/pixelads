import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Skeleton } from './components/ui/Skeleton';

const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const OrdersManagementPage = lazy(() => import('./pages/admin/OrdersManagementPage').then(m => ({ default: m.OrdersManagementPage })));
const EmployeesPage = lazy(() => import('./pages/admin/EmployeesPage').then(m => ({ default: m.EmployeesPage })));
const PaymentsPage = lazy(() => import('./pages/admin/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const InvoicesPage = lazy(() => import('./pages/admin/InvoicesPage').then(m => ({ default: m.InvoicesPage })));
const CommunicationsPage = lazy(() => import('./pages/admin/CommunicationsPage').then(m => ({ default: m.CommunicationsPage })));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage').then(m => ({ default: m.SettingsPage })));

const OrderTakerDashboardPage = lazy(() => import('./pages/orderTaker/OrderTakerDashboardPage').then(m => ({ default: m.OrderTakerDashboardPage })));
const NewOrderPage = lazy(() => import('./pages/orderTaker/NewOrderPage').then(m => ({ default: m.NewOrderPage })));
const OrderInvoicePage = lazy(() => import('./pages/orderTaker/OrderInvoicePage').then(m => ({ default: m.OrderInvoicePage })));
const OrderReviewPage = lazy(() => import('./pages/orderTaker/OrderReviewPage').then(m => ({ default: m.OrderReviewPage })));

const EditorDashboardPage = lazy(() => import('./pages/editor/EditorDashboardPage').then(m => ({ default: m.EditorDashboardPage })));
const EditorOrderDetailPage = lazy(() => import('./pages/editor/EditorOrderDetailPage').then(m => ({ default: m.EditorOrderDetailPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

const RouteFallback = () => (
  <div className="p-8 max-w-4xl mx-auto space-y-4">
    <Skeleton className="h-8 w-60" />
    <Skeleton className="h-48 w-full" />
  </div>
);

const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'order_taker') return <Navigate to="/order-taker/dashboard" replace />;
  if (user.role === 'editor') return <Navigate to="/editor/dashboard" replace />;

  return <Navigate to="/login" replace />;
};

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <ToastProvider>
              <BrowserRouter
                future={{
                  v7_startTransition: true,
                  v7_relativeSplatPath: true
                }}
              >
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<RootRedirect />} />

                    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                      <Route element={<AppLayout />}>
                        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                        <Route path="/admin/orders" element={<OrdersManagementPage />} />
                        <Route path="/admin/employees" element={<EmployeesPage />} />
                        <Route path="/admin/payments" element={<PaymentsPage />} />
                        <Route path="/admin/invoices" element={<InvoicesPage />} />
                        <Route path="/admin/communications" element={<CommunicationsPage />} />
                        <Route path="/admin/reports" element={<ReportsPage />} />
                        <Route path="/admin/settings" element={<SettingsPage />} />
                        <Route path="/admin/orders/new" element={<NewOrderPage />} />
                        <Route path="/admin/orders/:id/invoice" element={<OrderInvoicePage />} />
                      </Route>
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={['order_taker', 'admin']} />}>
                      <Route element={<AppLayout />}>
                        <Route path="/order-taker/dashboard" element={<OrderTakerDashboardPage />} />
                        <Route path="/order-taker/orders/new" element={<NewOrderPage />} />
                        <Route path="/order-taker/orders/:id/invoice" element={<OrderInvoicePage />} />
                        <Route path="/order-taker/orders/:id/review" element={<OrderReviewPage />} />
                      </Route>
                    </Route>

                    <Route element={<ProtectedRoute allowedRoles={['editor', 'admin']} />}>
                      <Route element={<AppLayout />}>
                        <Route path="/editor/dashboard" element={<EditorDashboardPage />} />
                        <Route path="/editor/orders/:id" element={<EditorOrderDetailPage />} />
                      </Route>
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ToastProvider>
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
