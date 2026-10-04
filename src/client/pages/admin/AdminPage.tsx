import { useMutation, useQuery, useQueryClient, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useState, type FormEvent } from "react";
import type { AdminOverview } from "../../../shared/contracts";
import {
  AdminApiError,
  adminFetch,
  createAmbassador,
  decideFlag,
  downloadRegistrationsCsv,
  fetchAdminCore,
  fetchBrief,
  login,
  logout,
  type CreateAmbassadorInput,
} from "./api";
import {
  AiUsagePanel,
  AmbassadorsPanel,
  BriefPanel,
  ChannelsPanel,
  CollegesPanel,
  ExportPanel,
  FlagsPanel,
  FunnelPanel,
  PacingPanel,
  SimulatedBanner,
  StatCards,
  VariantsPanel,
} from "./sections";

export default function AdminPage() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <AdminDashboard />
    </QueryClientProvider>
  );
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const [includeSimulated, setIncludeSimulated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const session = useQuery({
    queryKey: ["admin", "session"],
    queryFn: () => adminFetch<AdminOverview>("/api/admin/overview?includeSimulated=false"),
  });
  const authed = session.isSuccess;

  const core = useQuery({
    queryKey: ["admin", "core", includeSimulated],
    queryFn: () => fetchAdminCore(includeSimulated),
    enabled: authed,
  });

  const brief = useQuery({
    queryKey: ["admin", "brief", includeSimulated],
    queryFn: () => fetchBrief(includeSimulated),
    enabled: authed,
  });

  const handleAuthError = useCallback(
    (error: unknown) => {
      if (error instanceof AdminApiError && error.status === 401) {
        void queryClient.invalidateQueries({ queryKey: ["admin", "session"] });
      } else if (error instanceof Error) {
        setActionError(error.message);
      }
    },
    [queryClient],
  );

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      setPassword("");
      setLoginError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "session"] });
    },
    onError: (error) => setLoginError(error instanceof Error ? error.message : "Login failed."),
  });

  const createMutation = useMutation({
    mutationFn: createAmbassador,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "core"] }),
    onError: handleAuthError,
  });

  const flagMutation = useMutation({
    mutationFn: (input: { userId: string; decision: "approve" | "reject" }) =>
      decideFlag(input.userId, input.decision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "core"] }),
    onError: handleAuthError,
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "session"] });
    },
  });

  function handleLogin(event: FormEvent) {
    event.preventDefault();
    setActionError(null);
    loginMutation.mutate(password);
  }

  const handleCreateAmbassador = useCallback(
    async (input: CreateAmbassadorInput) => {
      setActionError(null);
      await createMutation.mutateAsync(input);
    },
    [createMutation],
  );

  const handleFlag = useCallback(
    (userId: string, decision: "approve" | "reject") => {
      setActionError(null);
      flagMutation.mutate({ userId, decision });
    },
    [flagMutation],
  );

  if (session.isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBFCFE] text-sm text-[#2E333B]/60">
        Checking session…
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FBFCFE] px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-md border border-[#DDE5F2] bg-white p-5"
        >
          <h1 className="text-lg font-semibold text-[#1F3A93]">Admin war room</h1>
          <p className="mt-1 text-xs text-[#2E333B]/60">
            Ship60 · sign in with the admin password to review the campaign.
          </p>
          <label className="mt-4 block text-xs text-[#2E333B]/70">
            Admin password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-sm border border-[#DDE5F2] px-2 py-1.5 text-sm text-[#2E333B]"
            />
          </label>
          {loginError ? <p className="mt-2 text-xs text-[#D7263D]">{loginError}</p> : null}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="mt-4 w-full rounded-sm bg-[#1F3A93] px-3 py-2 text-sm font-medium text-white hover:bg-[#182e75] disabled:opacity-50"
          >
            {loginMutation.isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  const coreError =
    core.error instanceof Error && !(core.error instanceof AdminApiError && core.error.status === 401)
      ? core.error.message
      : null;
  const busyFlag = flagMutation.isPending ? (flagMutation.variables?.userId ?? null) : null;

  return (
    <main className="min-h-screen bg-[#FBFCFE] px-3 py-4 text-[#2E333B] sm:px-5">
      <div className="mx-auto max-w-6xl space-y-3">
        <header className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-[#1F3A93]">Admin war room</h1>
          <span className="text-xs text-[#2E333B]/60">Ship60 · daily 9 PM review</span>
          <div className="ml-auto flex items-center gap-2">
            {core.isFetching || brief.isFetching ? (
              <span className="text-[11px] text-[#2E333B]/50">Refreshing…</span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                void core.refetch();
                void brief.refetch();
              }}
              className="rounded-sm border border-[#DDE5F2] px-2 py-1 text-[11px] text-[#2E333B] hover:bg-[#DDE5F2]/40"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              className="rounded-sm border border-[#DDE5F2] px-2 py-1 text-[11px] text-[#2E333B] hover:bg-[#DDE5F2]/40"
            >
              Log out
            </button>
          </div>
        </header>

        {coreError || actionError ? (
          <p className="rounded-md border border-[#D7263D]/40 bg-[#D7263D]/5 px-3 py-2 text-xs text-[#D7263D]">
            {coreError ?? actionError}
          </p>
        ) : null}

        {core.data ? (
          <>
            <SimulatedBanner
              overview={core.data.overview}
              onToggle={setIncludeSimulated}
              refreshing={core.isFetching}
            />
            <StatCards overview={core.data.overview} />
            <PacingPanel
              pacing={core.data.pacing}
              includeSimulated={includeSimulated}
              onEnableSimulated={() => setIncludeSimulated(true)}
            />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <FunnelPanel steps={core.data.funnel} />
              <ChannelsPanel rows={core.data.channels} />
              <CollegesPanel rows={core.data.colleges} />
              <VariantsPanel rows={core.data.variants} />
              <AmbassadorsPanel
                rows={core.data.ambassadors}
                colleges={core.data.colleges}
                onCreate={handleCreateAmbassador}
              />
              <div className="space-y-3">
                <FlagsPanel rows={core.data.flags} busyId={busyFlag} onDecide={handleFlag} />
                <AiUsagePanel usage={core.data.aiUsage} />
                <ExportPanel
                  includeSimulated={includeSimulated}
                  onExport={downloadRegistrationsCsv}
                />
              </div>
            </div>
            <BriefPanel
              brief={brief.data ?? null}
              loading={brief.isFetching}
              onGenerate={() => void brief.refetch()}
            />
          </>
        ) : (
          <p className="text-sm text-[#2E333B]/60">
            {core.isPending ? "Loading war room…" : "War room data unavailable."}
          </p>
        )}
      </div>
    </main>
  );
}
