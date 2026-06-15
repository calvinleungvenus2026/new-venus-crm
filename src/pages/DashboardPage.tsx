import { useMemo, useState } from 'react';
import {
  ChevronDown,
  Grid2x2,
  Home,
  LogOut,
  Plus,
} from 'lucide-react';
import { AuthSession } from '../App';

interface DashboardPageProps {
  session: AuthSession;
  onLogout: () => void;
  onSwitchCompany: (companyId: string) => void;
}

type ProjectStatus = '进行中' | '已计划' | '已暂停';
type ProjectPriority = '高' | '中' | '低' | '紧急';

interface ProjectRow {
  id: number;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  dueDate: string;
  owners: string[];
  tasks: string[];
}

const projectRows: ProjectRow[] = [
  {
    id: 1,
    name: '官网改版',
    description: '完成公司官网与营销落地页的整体重设计。',
    status: '进行中',
    priority: '高',
    dueDate: '2024-12-31',
    owners: ['Alice Johnson', 'Carol Lee'],
    tasks: ['实现登录功能', '测试落地页']
  },
  {
    id: 2,
    name: '移动端应用开发',
    description: '为销售与客户经理开发跨平台移动应用。',
    status: '已计划',
    priority: '中',
    dueDate: '2025-03-15',
    owners: ['Bob Smith', 'Carol Lee', 'Eva Martinez'],
    tasks: ['设计引导页面', '接入数据分析']
  },
  {
    id: 3,
    name: 'API 集成',
    description: '集成第三方支付、CRM 同步与邮件追踪服务。',
    status: '已暂停',
    priority: '低',
    dueDate: '2025-01-20',
    owners: ['Alice Johnson', 'David Kim'],
    tasks: ['编写 API 文档']
  },
  {
    id: 4,
    name: '市场营销活动',
    description: '为第一季度客户线索增长上线多渠道营销活动。',
    status: '已计划',
    priority: '高',
    dueDate: '2024-11-01',
    owners: ['Bob Smith'],
    tasks: ['审核广告素材', '销售跟进流程']
  },
  {
    id: 5,
    name: '数据迁移',
    description: '迁移旧 CRM 联系人与客户归属数据并完成清洗。',
    status: '进行中',
    priority: '紧急',
    dueDate: '2025-02-28',
    owners: ['Carol Lee', 'Eva Martinez'],
    tasks: ['校验导入结果', '清理重复数据']
  }
];

const leftNavItems = [{ label: '首页', icon: Home }];

const statusClasses: Record<ProjectStatus, string> = {
  进行中: 'bg-amber-100 text-amber-900',
  已计划: 'bg-indigo-100 text-indigo-800',
  已暂停: 'bg-slate-200 text-slate-700'
};

const priorityClasses: Record<ProjectPriority, string> = {
  高: 'bg-rose-100 text-rose-700',
  中: 'bg-amber-100 text-amber-800',
  低: 'bg-emerald-100 text-emerald-700',
  紧急: 'bg-violet-200 text-violet-800'
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN').format(new Date(date));
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function DashboardPage({ session, onLogout, onSwitchCompany }: DashboardPageProps) {
  const [statusFilter, setStatusFilter] = useState<'全部' | ProjectStatus>('全部');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const canSwitchCompanies = session.companies.length > 1;

  const filteredRows = useMemo(() => {
    const nextRows = projectRows.filter((row) => {
      const matchesStatus = statusFilter === '全部' || row.status === statusFilter;

      return matchesStatus;
    });

    return [...nextRows].sort((a, b) => {
      const aDate = new Date(a.dueDate).getTime();
      const bDate = new Date(b.dueDate).getTime();
      return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
    });
  }, [sortDirection, statusFilter]);

  const companyRows = useMemo(
    () =>
      filteredRows.map((row) => ({
        ...row,
        name: `${session.company.shortName} · ${row.name}`
      })),
    [filteredRows, session.company.shortName]
  );

  return (
    <div className="min-h-screen bg-[#fbfbfc] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-[#f8f8fa] lg:min-h-screen lg:w-[272px] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: session.company.color }}
              >
                {session.company.shortName}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-slate-900">Calvin 的工作区</p>
              </div>
            </div>
            <button className="text-slate-400">
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-slate-200 px-4 py-3">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              当前公司
            </label>
            {canSwitchCompanies ? (
              <select
                value={session.company.id}
                onChange={(event) => onSwitchCompany(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400"
              >
                {session.companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
                {session.company.name}
              </div>
            )}
          </div>

          <div className="px-2">
            {leftNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-slate-400" />
                    {item.label}
                  </span>
                  {item.badge ? <span className="text-sm text-slate-400">{item.badge}</span> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-slate-200 px-2 pt-4">
            <div className="mb-2 flex items-center justify-between px-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              <span>数据库</span>
              <button className="text-slate-400">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl px-2 py-1">
              <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm text-slate-700">
                <Grid2x2 className="h-4 w-4 text-slate-400" />
                {session.company.shortName} 项目管理
              </button>

              <div className="ml-4 space-y-1 border-l border-slate-200 pl-3">
                <button className="w-full rounded-lg bg-slate-100 px-3 py-2 text-left text-sm font-medium text-slate-900">
                  项目
                </button>
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-500 transition hover:bg-slate-100">
                  任务
                </button>
              </div>
            </div>

            <button className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-slate-500 transition hover:text-slate-700">
              <Plus className="h-4 w-4" />
              新建数据表
            </button>
          </div>

          <div className="mt-auto border-t border-slate-200 px-3 py-3">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              退出登录
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="border-b border-slate-200 bg-white px-4 py-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-medium text-slate-800">
                <Grid2x2 className="h-4 w-4 text-[#4e8ef7]" />
                <span>项目表格</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="hidden rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 md:inline-flex">
                  当前主体：{session.company.shortName}
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as '全部' | ProjectStatus)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="全部">全部状态</option>
                  <option value="进行中">进行中</option>
                  <option value="已计划">已计划</option>
                  <option value="已暂停">已暂停</option>
                </select>
                <button
                  onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  {sortDirection === 'asc' ? '日期升序' : '日期降序'}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead className="bg-[#fbfbfc]">
                <tr>
                  <th className="w-16 border-b border-r border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-500">
                    #
                  </th>
                  <th className="w-[260px] border-b border-r border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-600">
                    项目名称
                  </th>
                  <th className="w-[320px] border-b border-r border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-600">
                    描述
                  </th>
                  <th className="w-[210px] border-b border-r border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-600">
                    状态
                  </th>
                  <th className="w-[180px] border-b border-r border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-600">
                    优先级
                  </th>
                  <th className="w-[200px] border-b border-r border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-600">
                    截止日期
                  </th>
                  <th className="w-[260px] border-b border-r border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-600">
                    负责人
                  </th>
                  <th className="min-w-[260px] border-b border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-600">
                    任务
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white">
                {companyRows.map((row) => (
                  <tr key={row.id} className="align-top hover:bg-slate-50/80">
                    <td className="border-b border-r border-slate-200 px-4 py-3 text-sm text-slate-700">{row.id}</td>
                    <td className="border-b border-r border-slate-200 px-4 py-3 text-[15px] text-slate-900">
                      {row.name}
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3 text-[15px] text-slate-700">
                      <span className="line-clamp-1">{row.description}</span>
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3">
                      <Pill className={statusClasses[row.status]}>{row.status}</Pill>
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3">
                      <Pill className={priorityClasses[row.priority]}>{row.priority}</Pill>
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3 text-[15px] text-slate-800">
                      {formatDate(row.dueDate)}
                    </td>
                    <td className="border-b border-r border-slate-200 px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.owners.map((owner) => (
                          <span
                            key={owner}
                            className="rounded-md bg-slate-100 px-2.5 py-1 text-[13px] text-slate-800"
                          >
                            {owner}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="border-b border-slate-200 px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {row.tasks.map((task) => (
                          <span
                            key={task}
                            className="rounded-md bg-slate-100 px-2.5 py-1 text-[13px] text-slate-800"
                          >
                            {task}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}

                <tr>
                  <td className="border-r border-slate-200 px-4 py-3 text-slate-400">+</td>
                  <td className="border-r border-slate-200 px-4 py-3 text-sm text-slate-300">新建记录</td>
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td className="border-r border-slate-200" />
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
