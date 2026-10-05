import {
  useMutation,
  useQuery,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useCallback, useState, type FormEvent } from "react";
import type { AdminOverview } from "../../../shared/contracts";
import { Button, Input } from "../../design";
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
  StatRuler,
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

function LoginScreen({
  password,
  onPasswordChange,
  error,
  pending,
  onSubmit,
}: {
  password: string;
  onPasswordChange: (value: string) => void;
  error: string | null;
  pending: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center bg-canvas px-4 text-ink">
      <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative w-full max-w-[380px]">
        <p className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-[-0.02em]">Ship60</span>
          <span className="font-mono text-[11px] text-ink-subtle">war room</span>
        </p>
        <h1 className="mt-6 text-[clamp(1.75rem,6vw,2.25rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
          Admin war room
        </h1>
        <p className="mt-2 max-w-[38ch] text-[14px] leading-relaxed text-ink-muted">
          Sign in with the admin password to review the campaign.
        </p>
        <form onSubmit={onSubmit} className="mt-7 border-t border-hairline-strong pt-6">
          <Input
            label="Admin password"
            type="password"
            autoComplete="current-password"
            spellCheck={false}
            required
            data-testid="admin-password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
          {error ? (
            <p className="mt-3 text-[13px] text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={pending}
            data-testid="admin-login"
            className="mt-5"
          >
            Sign in
          </Button>
        </form>
        <p className="mt-4 font-mono text-[11px] text-ink-subtle">
          daily 9 PM review · registrations, pacing, flags, brief
        </p>
      </div>
    </main>
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
      <main className="grid min-h-screen place-items-center bg-canvas text-ink">
        <p className="font-mono text-[12px] text-ink-subtle">Checking session…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <LoginScreen
        password={password}
        onPasswordChange={setPassword}
        error={loginError}
        pending={loginMutation.isPending}
        onSubmit={handleLogin}
      />
    );
  }

  const coreError =
    core.error instanceof Error &&
    !(core.error instanceof AdminApiError && core.error.status === 401)
      ? core.error.message
      : null;
  const busyFlag = flagMutation.isPending ? (flagMutation.variables?.userId ?? null) : null;
  const refreshing = core.isFetching || brief.isFetching;

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-hairline bg-canvas">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center gap-3 px-4 sm:px-6">
          <p className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 text-[15px] font-semibold tracking-[-0.02em] text-ink">
              Ship60
            </span>
            <span className="truncate font-mono text-[11px] text-ink-subtle">
              war room<span className="hidden md:inline"> · daily 9 PM review</span>
            </span>
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {refreshing ? (
              <span className="hidden font-mono text-[11px] text-ink-subtle md:inline">
                refreshing…
              </span>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => {
                void core.refetch();
                void brief.refetch();
              }}
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              loading={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
            >
              Log out
            </Button>
          </div>
        </div>
        {core.data ? (
          <SimulatedBanner
            overview={core.data.overview}
            onToggle={setIncludeSimulated}
            refreshing={core.isFetching}
          />
        ) : null}
      </header>

      {core.data ? <StatRuler overview={core.data.overview} /> : null}

      <div className="mx-auto max-w-[1120px] px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
        {coreError || actionError ? (
          <p
            role="alert"
            className="mb-8 rounded-control border border-danger/50 bg-danger/10 px-3 py-2 text-[13px] text-danger"
          >
            {coreError ?? actionError}
          </p>
        ) : null}

        {core.data ? (
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-3">
            <PacingPanel
              className="lg:col-span-3"
              pacing={core.data.pacing}
              includeSimulated={includeSimulated}
              onEnableSimulated={() => setIncludeSimulated(true)}
            />
            <FunnelPanel className="lg:col-span-2" steps={core.data.funnel} />
            <ChannelsPanel rows={core.data.channels} />
            <CollegesPanel className="lg:col-span-2" rows={core.data.colleges} />
            <VariantsPanel rows={core.data.variants} />
            <FlagsPanel
              className="lg:col-span-3"
              rows={core.data.flags}
              busyId={busyFlag}
              onDecide={handleFlag}
            />
            <AmbassadorsPanel
              className="lg:col-span-3"
              rows={core.data.ambassadors}
              colleges={core.data.colleges}
              onCreate={handleCreateAmbassador}
            />
            <BriefPanel
              className="lg:col-span-2"
              brief={brief.data ?? null}
              loading={brief.isFetching}
              onGenerate={() => void brief.refetch()}
            />
            <div className="space-y-12">
              <AiUsagePanel usage={core.data.aiUsage} />
              <ExportPanel
                includeSimulated={includeSimulated}
                onExport={downloadRegistrationsCsv}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6" aria-hidden="true">
            <div className="h-16 animate-skeleton rounded bg-surface-2" />
            <div className="h-64 animate-skeleton rounded bg-surface-2" />
            <div className="h-40 animate-skeleton rounded bg-surface-2" />
          </div>
        )}
      </div>
    </main>
  );
}
