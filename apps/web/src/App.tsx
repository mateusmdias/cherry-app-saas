import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage'
import { CustomerFormPage } from '@/pages/customers/CustomerFormPage'
import { CustomerListPage } from '@/pages/customers/CustomerListPage'
import { EstimateDetailPage } from '@/pages/estimates/EstimateDetailPage'
import { EstimateEditPage } from '@/pages/estimates/EstimateEditPage'
import { EstimatePrintPage } from '@/pages/estimates/EstimatePrintPage'
import { EstimatesIndexPage } from '@/pages/estimates/EstimatesIndexPage'
import { NewEstimatePage } from '@/pages/estimates/NewEstimatePage'
import { ProductEditPage } from '@/pages/products/ProductEditPage'
import { ProductListPage } from '@/pages/products/ProductListPage'
import { ProductNewPage } from '@/pages/products/ProductNewPage'
import { ReportsPage } from '@/pages/reports/ReportsPage'
import { BrandingPage } from '@/pages/BrandingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { SetupPage } from '@/pages/SetupPage'
import { isSupabaseConfigured } from '@/lib/env'

function AuthenticatedRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<ProtectedRoute />}>
          <Route path="estimates/:estimateId/print" element={<EstimatePrintPage />} />
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="branding" element={<BrandingPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="customers/new" element={<CustomerFormPage />} />
            <Route path="customers/:customerId/edit" element={<CustomerFormPage />} />
            <Route path="customers/:customerId" element={<CustomerDetailPage />} />
            <Route path="products" element={<ProductListPage />} />
            <Route path="products/new" element={<ProductNewPage />} />
            <Route path="products/:productId/edit" element={<ProductEditPage />} />
            <Route path="estimates" element={<EstimatesIndexPage />} />
            <Route path="estimates/new" element={<NewEstimatePage />} />
            <Route path="estimates/:estimateId/edit" element={<EstimateEditPage />} />
            <Route path="estimates/:estimateId" element={<EstimateDetailPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <SetupPage />
  }

  return <AuthenticatedRoutes />
}
