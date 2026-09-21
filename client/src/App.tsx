import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { RequireAuth } from "./components/auth/RequireAuth";
import { LoginPage } from "./pages/auth/LoginPage";
import { AuthCallbackPage } from "./pages/auth/AuthCallbackPage";
import { TenantListPage } from "./pages/tenants/TenantListPage";
import { TenantCreatePage } from "./pages/tenants/TenantCreatePage";
import { CandidateListPage } from "./pages/candidates/CandidateListPage";
import { CandidateCreatePage } from "./pages/candidates/CandidateCreatePage";
import { CandidateDetailPage } from "./pages/candidates/CandidateDetailPage";
import { CandidateEditPage } from "./pages/candidates/CandidateEditPage";
import { JobOrderListPage } from "./pages/jobOrders/JobOrderListPage";
import { JobOrderCreatePage } from "./pages/jobOrders/JobOrderCreatePage";
import { JobOrderDetailPage } from "./pages/jobOrders/JobOrderDetailPage";
import { JobOrderEditPage } from "./pages/jobOrders/JobOrderEditPage";
import { SubmissionListPage } from "./pages/submissions/SubmissionListPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ActivityPage } from "./pages/activity/ActivityPage";

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="auth/callback" element={<AuthCallbackPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="activity" element={<ActivityPage />} />

          <Route path="tenants" element={<TenantListPage />} />
          <Route path="tenants/new" element={<TenantCreatePage />} />

          <Route path="candidates" element={<CandidateListPage />} />
          <Route path="candidates/new" element={<CandidateCreatePage />} />
          <Route path="candidates/:id" element={<CandidateDetailPage />} />
          <Route path="candidates/:id/edit" element={<CandidateEditPage />} />

          <Route path="job-orders" element={<JobOrderListPage />} />
          <Route path="job-orders/new" element={<JobOrderCreatePage />} />
          <Route path="job-orders/:id" element={<JobOrderDetailPage />} />
          <Route path="job-orders/:id/edit" element={<JobOrderEditPage />} />

          <Route path="submissions" element={<SubmissionListPage />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
