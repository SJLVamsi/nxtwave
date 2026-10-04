import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

const LandingPage = lazy(() => import("./pages/landing/LandingPage"));
const LaunchpadPage = lazy(() => import("./pages/me/LaunchpadPage"));
const LeaderboardPage = lazy(() => import("./pages/leaderboard/LeaderboardPage"));
const AmbassadorPage = lazy(() => import("./pages/ambassador/AmbassadorPage"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const LivePage = lazy(() => import("./pages/live/LivePage"));
const HostPage = lazy(() => import("./pages/live/HostPage"));
const SubmitPage = lazy(() => import("./pages/submit/SubmitPage"));
const CertPage = lazy(() => import("./pages/cert/CertPage"));
const PlanPage = lazy(() => import("./pages/plan/PlanPage"));
const BuildPage = lazy(() => import("./pages/build/BuildPage"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-sm opacity-60">
            Loading…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/me" element={<LaunchpadPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/ambassador/:code" element={<AmbassadorPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/live/host" element={<HostPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/cert/:id" element={<CertPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/build" element={<BuildPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
