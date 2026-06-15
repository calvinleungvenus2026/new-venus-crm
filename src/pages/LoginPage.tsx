import { useState } from 'react';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => boolean;
}

const TEST_PASSWORD = 'testtest123';

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    await new Promise((resolve) => window.setTimeout(resolve, 600));

    if (onLogin(email, password)) {
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setError('请输入已配置的公司账号，所有演示账号密码均为 testtest123。');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_32%),linear-gradient(135deg,#eff6ff_0%,#ffffff_42%,#dbeafe_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-10 lg:px-10">
        <div className="w-full">
          <section className="rounded-[2rem] border border-white/10 bg-[#06081d] p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.28)] lg:p-10">
            <div className="mb-8">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/70">
                Venus 平台
              </p>
              <h1 className="text-center text-3xl font-bold tracking-tight text-white">CRM 系统</h1>
              <p className="mt-3 text-center text-sm text-slate-300">
                使用公司账号登录，进入客户、线索与团队协作管理界面。
              </p>
              <div className="mt-4 rounded-2xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                超级管理员：<span className="font-semibold">admin-crm@universal.com</span> /{' '}
                <span className="font-semibold">testtest123</span>
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                公司账号登录后仅可查看所属公司数据；只有 <span className="font-semibold">admin-crm@universal.com</span>{' '}
                登录后可切换并查看全部公司数据。
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                例如：<span className="font-semibold">admin-crm@venuslondontechnology.co.uk</span> /{' '}
                <span className="font-semibold">testtest123</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-200">
                  密码
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white px-4 py-3 pr-12 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="请输入密码"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 transition hover:text-slate-700"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" />
                {isSubmitting ? '登录中...' : '登录'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
