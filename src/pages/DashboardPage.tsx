import { BarChart3, Building2, LogOut, ShieldCheck, Users } from 'lucide-react';
import type { AuthSession } from '../App';

interface DashboardPageProps {
  session: AuthSession;
  onLogout: () => void;
  onSwitchCompany: (companyId: string) => void;
}

const quickStats = [
  {
    label: 'Active Workspace',
    value: 'CRM Online',
    icon: BarChart3
  },
  {
    label: 'Accessible Companies',
    value: 'Multi-tenant',
    icon: Building2
  },
  {
    label: 'Session Role',
    value: 'Secured',
    icon: ShieldCheck
  }
] as const;

export function DashboardPage({ session, onLogout, onSwitchCompany }: DashboardPageProps) {
  const canSwitchCompanies = session.role === 'SUPER_ADMIN' && session.companies.length > 1;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 lg:px-10">
        <header className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/70">
              Venus Platform
            </p>
            <h1 className="m-0 text-3xl font-bold tracking-tight text-slate-950">CRM Dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Welcome back, {session.name}. This React entry is now restored so the production build can complete
              successfully.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {canSwitchCompanies && (
              <select
                value={session.company.id}
                onChange={(event) => onSwitchCompany(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
              >
                {session.companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                style={{ background: session.company.color }}
              >
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="m-0 text-xl font-semibold text-slate-950">{session.company.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Signed in as {session.email} · {session.role}
                </p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50/70 p-5">
              <p className="m-0 text-sm leading-6 text-slate-700">
                The production error happened because <code>src/App.tsx</code> imported{' '}
                <code>./pages/DashboardPage</code>, but that file was missing from the deployed source tree. This page
                restores that module so <code>vite build</code> can resolve the import again.
              </p>
            </div>
          </section>

          <aside className="grid gap-4">
            {quickStats.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {item.label}
                    </span>
                    <Icon className="h-5 w-5 text-sky-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-950">{item.value}</div>
                </article>
              );
            })}

            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Company Access</span>
                <Users className="h-5 w-5 text-sky-600" />
              </div>
              <div className="text-2xl font-bold text-slate-950">{session.companies.length}</div>
              <p className="mb-0 mt-2 text-sm text-slate-600">
                {canSwitchCompanies ? 'You can switch between all configured companies.' : 'This account is scoped to its assigned company.'}
              </p>
            </article>
          </aside>
        </main>
      </div>
    </div>
  );
}
