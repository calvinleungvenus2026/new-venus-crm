import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

interface Company {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

interface SessionResponse {
  token: string;
  email: string;
  name: string;
  role: string;
  company: Company;
  companies: Company[];
}

interface StoredAuth {
  token: string;
}

interface ProjectRow {
  id: number;
  source?: 'manual' | 'drive';
  sourceKey?: string;
  companyId?: string;
  company: string;
  clientCompany: string;
  quoNumber: string;
  quoStatus: string;
  msaNumber: string;
  msaStatus: string;
  date: string;
  amountGbp: string;
  relatedInvoice: string;
  deliverables: string;
  engagementType: string;
  startDate: string;
  deliveryDate: string;
  phase1Status: string;
  phase2Status: string;
  phase3Status: string;
  msaSigner: string;
  note: string;
  completionStatus: string;
  cellStyleJson?: string;
  cellStyles?: Partial<Record<EditableProjectField, CellFormat>>;
}

interface NewProjectForm {
  clientCompany: string;
  quoNumber: string;
  quoStatus: string;
  msaNumber: string;
  msaStatus: string;
  date: string;
  amountGbp: string;
  relatedInvoice: string;
  deliverables: string;
  engagementType: string;
  startDate: string;
  deliveryDate: string;
  phase1Status: string;
  phase2Status: string;
  phase3Status: string;
  msaSigner: string;
  note: string;
  completionStatus: string;
}

interface NewProjectSummaryForm {
  [header: string]: string;
}

interface ProjectFileRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  dataUrl: string;
}

interface PendingProjectFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  dataUrl: string;
}

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  modifiedTime?: string;
  size?: string;
}

interface DriveFolderResponse {
  companyId: string;
  folderId: string;
  drive: {
    files: DriveItem[];
  };
}

interface ProjectRowDbPayload extends ProjectRow {
  companyId?: string;
}

interface ProjectSummaryResponse {
  headers: string[];
  rowIds: string[];
  rows: string[][];
}

interface CachedProjectSummary {
  headers: string[];
  rowIds: string[];
  rows: string[][];
  cachedAt: string;
}

interface CachedDashboardData {
  summaryHeaders: string[];
  summaryRows: string[][];
  invoiceHeaders: string[];
  invoiceRows: string[][];
  cachedAt: string;
}

interface DashboardCompanySummary {
  companyId: string;
  companyName: string;
  shortName: string;
  color: string;
  totalProjects: number;
  totalAmount: number;
  signedMsaCount: number;
  completedCount: number;
}

interface DashboardClientSummary {
  clientCompany: string;
  projectCount: number;
  totalAmount: number;
}

interface DashboardPieSlice {
  label: string;
  count: number;
  color: string;
}

interface DashboardActivityItem {
  companyName: string;
  clientCompany: string;
  quoNumber: string;
  date: string;
  amountGbp: string;
  completionStatus: string;
}

interface DashboardMetricBar {
  label: string;
  count: number;
  ratio: number;
  tone: string;
  helper: string;
}

interface DashboardClientPerformance extends DashboardClientSummary {
  share: number;
  averageValue: number;
}

interface DashboardTrendMonth {
  label: string;
  amount: number;
  count: number;
  ratio: number;
}

interface DashboardPipelineStage {
  label: string;
  subtitle: string;
  count: number;
  amount: number;
  ratio: number;
  tone: 'blue' | 'purple' | 'teal' | 'orange';
}

interface DashboardPhaseSummary {
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
}

interface PhaseStatusItem {
  label: string;
  value: string;
}

interface CellFormat {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  numberFormat?: 'plain' | 'currency' | 'percent' | 'decimal1' | 'decimal2';
}

interface DisplayCellStyle {
  'font-weight'?: string | null;
  color?: string | null;
  'background-color'?: string | null;
}

type EditableProjectField =
  | 'clientCompany'
  | 'quoNumber'
  | 'quoStatus'
  | 'msaNumber'
  | 'msaStatus'
  | 'date'
  | 'amountGbp'
  | 'relatedInvoice'
  | 'deliverables'
  | 'engagementType'
  | 'startDate'
  | 'deliveryDate'
  | 'completionStatus'
  | 'msaSigner'
  | 'note';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly defaultProjectSummaryHeaders = [
    '客户公司名',
    '项目ID',
    '终端客户/服务对象',
    '报价单编号',
    '报价日期',
    '报价金额',
    '合同编号',
    '合同日期',
    '合同金额',
    '目标金额',
    '项目内容/服务名称',
    '项目描述',
    '合作类型/期限',
    '发票编号',
    '发票日期',
    '发票金额',
    '发票状态',
    '匹配备注',
    '源文件'
  ] as const;
  readonly defaultInvoiceDetailsHeaders = [
    '客户公司名',
    '匹配项目ID',
    '发票编号',
    '发票日期',
    '到期日',
    '小计',
    'VAT金额',
    '发票总额',
    '应付金额',
    '项目/行项目说明',
    '匹配说明',
    '源文件'
  ] as const;

  private readonly http = inject(HttpClient);
  private readonly storageKey = 'venus-crm-angular-auth';
  private readonly resetMarkerKey = 'venus-crm-data-reset-v1';
  private readonly projectSummaryCacheKey = 'venus-crm-project-summary-cache-v1';
  private readonly projectSummaryColumnWidthCacheKey = 'venus-crm-project-summary-column-widths-v1';
  private readonly projectSummaryRowHeightCacheKey = 'venus-crm-project-summary-row-heights-v1';
  private readonly dashboardCacheKey = 'venus-crm-dashboard-cache-v1';
  private readonly pageSize = 15;
  private readonly apiBaseUrl = this.resolveApiBaseUrl();
  private projectSummaryRowDragBounds: Array<{ rowId: string; rowIndex: number; top: number; bottom: number }> = [];
  private projectSummaryColumnResizeStartX = 0;
  private projectSummaryColumnResizeStartWidth = 0;
  private projectSummaryRowResizeStartY = 0;
  private projectSummaryRowResizeStartHeight = 0;

  email = signal('admin-crm@venuslondontechnology.co.uk');
  password = signal('testtest123');
  error = signal('');
  submitting = signal(false);
  restoringSession = signal(false);
  session = signal<SessionResponse | null>(null);
  selectedCompanyId = signal('');
  currentSection = signal<'dashboard' | 'projects' | 'invoices' | 'invoice-details' | 'drive'>('dashboard');
  statusFilter = signal('筛选');
  searchTerm = signal('');
  sortDirection = signal<'asc' | 'desc'>('asc');
  projectViewMode = signal<'table' | 'grid'>('table');
  projectSummaryViewMode = signal<'table' | 'grid'>('table');
  showProjectSearch = signal(false);
  showProjectFilter = signal(false);
  showProjectSummarySearch = signal(false);
  showProjectSummaryFilter = signal(false);
  showProjectSummaryFormatToolbar = signal(true);
  projectSummarySearchTerm = signal('');
  projectSummaryStatusFilter = signal('筛选');
  projectSummaryClampLines = signal<1 | 2>(2);
  currentProjectPage = signal(1);
  currentSummaryPage = signal(1);
  currentDrivePage = signal(1);
  projects = signal<ProjectRow[]>([]);
  projectsLoading = signal(false);
  syncingProjects = signal(false);
  syncError = signal('');
  dashboardRows = signal<ProjectRow[]>([]);
  dashboardSummaryHeaders = signal<string[]>([]);
  dashboardSummaryRows = signal<string[][]>([]);
  dashboardInvoiceHeaders = signal<string[]>([]);
  dashboardInvoiceRows = signal<string[][]>([]);
  dashboardLoading = signal(false);
  dashboardError = signal('');
  showAddModal = signal(false);
  addProjectError = signal('');
  editingProjectId = signal<number | null>(null);
  editingProjectSource = signal<'manual' | 'drive' | null>(null);
  editingProjectSourceKey = signal('');
  driveFiles = signal<DriveItem[]>([]);
  driveLoading = signal(false);
  driveError = signal('');
  projectSummaryHeaders = signal<string[]>([]);
  projectSummaryColumnWidths = signal<number[]>([]);
  projectSummaryRowHeights = signal<Record<string, number>>({});
  projectSummaryRowIds = signal<string[]>([]);
  projectSummaryRowsData = signal<string[][]>([]);
  projectSummaryCellStyles = signal<Record<string, CellFormat>>({});
  projectSummaryLoading = signal(false);
  projectSummaryError = signal('');
  newProject: NewProjectForm = this.createEmptyProjectForm();
  newProjectSummary: NewProjectSummaryForm = {};
  selectedPhaseProject = signal<ProjectRow | null>(null);
  editingCell = signal<{ rowId: number; field: EditableProjectField } | null>(null);
  editingValue = signal('');
  selectedCell = signal<{ rowId: number; field: EditableProjectField } | null>(null);
  selectedProjectSummaryCell = signal<{ rowKey: string; colIndex: number } | null>(null);
  selectedProjectSummaryRows = signal<string[]>([]);
  projectSummaryRowSelectionAnchor = signal<string | null>(null);
  projectSummaryRowDragActive = signal(false);
  projectSummaryRowDragStart = signal<string | null>(null);
  projectSummaryRowDragMoved = signal(false);
  projectSummaryRowToggleCandidate = signal(false);
  selectedProjectSummaryColumns = signal<number[]>([]);
  projectSummaryColumnSelectionAnchor = signal<number | null>(null);
  projectSummaryColumnDragActive = signal(false);
  projectSummaryColumnDragStart = signal<number | null>(null);
  projectSummaryColumnDragMoved = signal(false);
  projectSummaryColumnToggleCandidate = signal(false);
  projectSummaryResizingColumnIndex = signal<number | null>(null);
  projectSummaryResizingRowId = signal<string | null>(null);
  suppressProjectSummaryCellClick = signal(false);
  projectSummaryVisibleRowIds = signal<string[]>([]);
  editingProjectSummaryCell = signal<{ rowId: string; colIndex: number } | null>(null);
  editingProjectSummaryValue = signal('');
  showFormatToolbar = signal(false);
  readonly fontFamilies = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New'];
  readonly projectFilterOptions = [
    '筛选',
    '进行中',
    '待开始',
    '已完成',
    '日期从新到旧',
    '日期从旧到新',
    '金额从高到低',
    '金额从低到高'
  ];
  private authToken = signal(this.readStoredToken());

  constructor() {
    this.clearAllStoredProjectDataOnce();
    if (this.authToken()) {
      this.restoringSession.set(true);
      this.restoreSession();
    }
  }

  private resolveApiBaseUrl() {
    if (typeof window === 'undefined') {
      return '';
    }

    const { hostname, port } = window.location;
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '4200') {
      return 'http://127.0.0.1:8080';
    }

    return '';
  }

  onEmailChange(value: string) {
    this.email.set(value);
  }

  onPasswordChange(value: string) {
    this.password.set(value);
  }

  onStatusChange(value: string) {
    this.resetProjectToolbarState('filter');
    this.statusFilter.set(value);
    this.showProjectFilter.set(false);
    this.currentProjectPage.set(1);
  }

  onSearchChange(value: string) {
    this.searchTerm.set(value);
    this.currentProjectPage.set(1);
  }

  onProjectSummarySearchChange(value: string) {
    this.projectSummarySearchTerm.set(value);
    this.currentSummaryPage.set(1);
  }

  toggleProjectSearch() {
    const nextOpen = !this.showProjectSearch();
    this.resetProjectToolbarState(nextOpen ? 'search' : 'none');
    this.showProjectSearch.set(nextOpen);
  }

  toggleProjectFilter() {
    const nextOpen = !this.showProjectFilter();
    this.resetProjectToolbarState(nextOpen ? 'filter' : 'none');
    this.showProjectFilter.set(nextOpen);
  }

  toggleProjectSummarySearch() {
    const nextOpen = !this.showProjectSummarySearch();
    this.resetProjectSummaryToolbarState(nextOpen ? 'search' : 'none');
    this.showProjectSummarySearch.set(nextOpen);
  }

  toggleProjectSummaryFilter() {
    const nextOpen = !this.showProjectSummaryFilter();
    this.resetProjectSummaryToolbarState(nextOpen ? 'filter' : 'none');
    this.showProjectSummaryFilter.set(nextOpen);
  }

  onProjectSummaryStatusChange(value: string) {
    this.projectSummaryStatusFilter.set(value);
    this.showProjectSummaryFilter.set(false);
    this.currentSummaryPage.set(1);
  }

  onCompanyChange(value: string) {
    this.selectedCompanyId.set(value);
    const currentSession = this.session();
    if (!currentSession) return;

    const nextCompany = currentSession.companies.find((company) => company.id === value);
    if (!nextCompany) return;

    this.http
      .post<SessionResponse>(`${this.apiBaseUrl}/api/auth/company`, { companyId: nextCompany.id }, this.authOptions())
      .subscribe({
        next: (response) => {
          this.setAuthenticatedSession(response);
          this.loadDashboardData();
          this.loadProjects();
          this.loadProjectSummary();
          this.loadDriveFiles();
        },
        error: () => {
          this.error.set('切换公司失败，请重新登录后再试。');
        }
      });
  }

  canSwitchCompanies() {
    return (this.session()?.companies.length || 0) > 1;
  }

  showDashboardSection() {
    this.currentSection.set('dashboard');
  }

  showProjectsSection() {
    this.currentSection.set('projects');
    this.currentProjectPage.set(1);
  }

  showInvoicesSection() {
    this.currentSection.set('invoices');
    this.currentSummaryPage.set(1);
    this.loadProjectSummary();
  }

  showInvoiceDetailsSection() {
    this.currentSection.set('invoice-details');
    this.currentSummaryPage.set(1);
    this.loadProjectSummary();
  }

  setProjectSummaryViewMode(mode: 'table' | 'grid') {
    this.resetProjectSummaryToolbarState(mode === 'grid' ? 'grid' : 'none');
    this.projectSummaryViewMode.set(mode);
    this.showProjectSummaryFormatToolbar.set(mode === 'table');
  }

  toggleProjectSummaryGridView() {
    if (this.projectSummaryViewMode() === 'grid') {
      this.setProjectSummaryViewMode('table');
      return;
    }
    this.setProjectSummaryViewMode('grid');
  }

  setProjectViewMode(mode: 'table' | 'grid') {
    this.resetProjectToolbarState(mode === 'grid' ? 'grid' : 'none');
    this.projectViewMode.set(mode);
    if (mode !== 'table') {
      this.showFormatToolbar.set(false);
      this.selectedCell.set(null);
      this.cancelInlineEdit();
    }
  }

  toggleProjectGridView() {
    if (this.projectViewMode() === 'grid') {
      this.setProjectViewMode('table');
      return;
    }
    this.setProjectViewMode('grid');
  }

  showDriveSection() {
    this.currentSection.set('drive');
    this.currentDrivePage.set(1);
  }

  login() {
    this.submitting.set(true);
    this.error.set('');

    this.http
      .post<SessionResponse>(`${this.apiBaseUrl}/api/auth/login`, {
        email: this.email(),
        password: this.password()
      })
      .subscribe({
        next: (response) => {
          this.authToken.set(response.token);
          localStorage.setItem(this.storageKey, JSON.stringify({ token: response.token } satisfies StoredAuth));
          this.setAuthenticatedSession(response);
          this.submitting.set(false);
          this.restoringSession.set(false);
          this.loadDashboardData();
          this.loadProjects();
          this.loadProjectSummary();
          this.loadDriveFiles();
        },
        error: () => {
          this.submitting.set(false);
          this.restoringSession.set(false);
          this.error.set(
            '登录失败，请确认 Java 后端已启动，并使用已配置账号，例如 admin-crm@venuslondontechnology.co.uk / testtest123。'
          );
        }
      });
  }

  logout() {
    this.http.post(`${this.apiBaseUrl}/api/auth/logout`, {}, this.authOptions()).subscribe({
      next: () => this.clearAuthState(),
      error: () => this.clearAuthState()
    });
  }

  openAddModal() {
    this.resetProjectToolbarState('none');
    this.newProject = this.createEmptyProjectForm();
    this.newProjectSummary = this.createEmptyProjectSummaryForm();
    this.addProjectError.set('');
    this.editingProjectId.set(null);
    this.editingProjectSource.set(null);
    this.editingProjectSourceKey.set('');
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
    this.addProjectError.set('');
    this.editingProjectId.set(null);
    this.editingProjectSource.set(null);
    this.editingProjectSourceKey.set('');
  }

  openEditModal(project: ProjectRow) {
    this.newProject = {
      clientCompany: project.clientCompany,
      quoNumber: project.quoNumber,
      quoStatus: project.quoStatus,
      msaNumber: project.msaNumber,
      msaStatus: project.msaStatus,
      date: project.date,
      amountGbp: project.amountGbp,
      relatedInvoice: project.relatedInvoice,
      deliverables: project.deliverables,
      engagementType: project.engagementType,
      startDate: project.startDate,
      deliveryDate: project.deliveryDate,
      phase1Status: project.phase1Status,
      phase2Status: project.phase2Status,
      phase3Status: project.phase3Status,
      msaSigner: project.msaSigner,
      note: project.note,
      completionStatus: project.completionStatus
    };
    this.editingProjectId.set(project.id);
    this.editingProjectSource.set(project.source || 'manual');
    this.editingProjectSourceKey.set(project.sourceKey || '');
    this.addProjectError.set('');
    this.showAddModal.set(true);
  }

  addProject() {
    const currentSession = this.session();
    if (!currentSession) return;

    const clientCompany = this.newProject.clientCompany.trim();
    const date = this.newProject.date.trim();
    const amountGbp = this.newProject.amountGbp.trim();

    if (!clientCompany || !date || !amountGbp) {
      this.addProjectError.set('请至少填写客户公司、日期和金额。');
      return;
    }

    const editingId = this.editingProjectId();

    const payload: ProjectRowDbPayload = {
      id: editingId ?? 0,
      companyId: currentSession.company.id,
      source: 'manual',
      sourceKey: this.editingProjectSourceKey(),
      company: currentSession.company.name,
      clientCompany,
      quoNumber: this.newProject.quoNumber.trim(),
      quoStatus: this.newProject.quoStatus,
      msaNumber: this.newProject.msaNumber.trim(),
      msaStatus: this.newProject.msaStatus,
      date,
      amountGbp,
      relatedInvoice: this.newProject.relatedInvoice.trim(),
      deliverables: this.newProject.deliverables.trim(),
      engagementType: this.newProject.engagementType,
      startDate: this.newProject.startDate.trim(),
      deliveryDate: this.newProject.deliveryDate.trim(),
      phase1Status: this.newProject.phase1Status,
      phase2Status: this.newProject.phase2Status,
      phase3Status: this.newProject.phase3Status,
      msaSigner: this.newProject.msaSigner.trim(),
      note: this.newProject.note.trim(),
      completionStatus: this.newProject.completionStatus
    };

    this.http
      .post(`${this.apiBaseUrl}/api/project-rows/save`, payload, this.authOptions())
      .subscribe({
        next: () => {
          this.closeAddModal();
          this.loadDashboardData();
          this.loadProjects();
        },
        error: () => {
          this.addProjectError.set('项目保存失败，请确认数据库与 Java backend 正在运行。');
        }
      });
  }

  addProjectSummaryRow() {
    const currentSession = this.session();
    if (!currentSession) return;

    const rowValues = this.projectSummaryColumns().map((header) => (this.newProjectSummary[header] || '').trim());
    if (rowValues.every((value) => value.length === 0)) {
      this.addProjectError.set(`请至少填写一项${this.currentDetailSectionLabel()}内容。`);
      return;
    }

    this.http
      .post<{ ok: boolean; rowId: string }>(
        `${this.apiBaseUrl}/api/project-summary/add-row`,
        {
          companyId: currentSession.company.id,
          sheetName: this.currentDetailSheetName(),
          rowJson: JSON.stringify(rowValues)
        },
        this.authOptions()
      )
      .subscribe({
        next: (response) => {
          this.projectSummaryRowIds.set([...this.projectSummaryRowIds(), response.rowId]);
          this.projectSummaryRowsData.set([...this.projectSummaryRowsData(), rowValues]);
          this.persistCurrentProjectSummaryCache();
          this.currentSummaryPage.set(this.projectSummaryTotalPages());
          this.closeAddModal();
        },
        error: () => {
          this.addProjectError.set(`${this.currentDetailSectionLabel()}新增失败，请确认数据库与 Java backend 正在运行。`);
        }
      });
  }

  deleteProject(projectId: number) {
    this.http
      .post(`${this.apiBaseUrl}/api/project-rows/delete`, { id: projectId }, this.authOptions())
      .subscribe({
        next: () => {
          this.loadDashboardData();
          this.loadProjects();
        },
        error: () => {
          this.error.set('删除失败，请确认数据库与 Java backend 正在运行。');
        }
      });
  }

  syncProjects() {
    const currentSession = this.session();
    if (!currentSession || this.syncingProjects()) return;

    this.resetProjectToolbarState('none');
    this.syncingProjects.set(true);
    this.syncError.set('');

    this.http
      .post<ProjectRow[]>(
        `${this.apiBaseUrl}/api/project-rows/sync?companyId=${encodeURIComponent(currentSession.company.id)}`,
        {},
        this.authOptions()
      )
      .subscribe({
        next: (rows) => {
          this.projects.set((rows || []).map((row) => this.hydrateProjectRow(row)));
          this.loadDashboardData();
          this.projectsLoading.set(false);
          this.syncingProjects.set(false);
          this.currentProjectPage.set(1);
        },
        error: () => {
          this.syncingProjects.set(false);
          this.syncError.set('同步失败，请确认 Google Drive 文件和 Java backend 正在运行。');
        }
      });
  }

  startInlineEdit(row: ProjectRow, field: EditableProjectField) {
    this.selectedCell.set({ rowId: row.id, field });
    this.editingCell.set({ rowId: row.id, field });
    this.editingValue.set(row[field] || '');
  }

  updateInlineEditValue(value: string) {
    this.editingValue.set(value);
  }

  isEditingCell(rowId: number, field: EditableProjectField) {
    const cell = this.editingCell();
    return cell?.rowId === rowId && cell.field === field;
  }

  cancelInlineEdit() {
    this.editingCell.set(null);
    this.editingValue.set('');
  }

  saveInlineEdit(row: ProjectRow, field: EditableProjectField) {
    const nextValue = this.editingValue();
    this.cancelInlineEdit();
    if ((row[field] || '') === nextValue) {
      return;
    }

    this.saveProjectRow(row, { [field]: nextValue });
  }

  inlineFieldInputType(field: EditableProjectField) {
    if (field === 'date' || field === 'startDate' || field === 'deliveryDate') {
      return 'date';
    }
    return 'text';
  }

  isInlineSelectField(field: EditableProjectField) {
    return [
      'quoStatus',
      'msaStatus',
      'engagementType',
      'completionStatus'
    ].includes(field);
  }

  inlineSelectOptions(field: EditableProjectField) {
    switch (field) {
      case 'quoStatus':
        return ['草稿', '已发送', '已批准', '已拒绝'];
      case 'msaStatus':
        return ['未开始', '处理中', '已签署', '已终止', 'signed'];
      case 'engagementType':
        return ['one-off', 'phase-based'];
      case 'completionStatus':
        return ['进行中', '待开始', '已完成'];
      default:
        return [];
    }
  }

  toggleFormatToolbar() {
    if (this.showFormatToolbar()) {
      this.resetProjectToolbarState('none');
      this.showFormatToolbar.set(false);
      return;
    }

    this.setProjectViewMode('table');
    this.resetProjectToolbarState('format');
    this.showFormatToolbar.set(true);
  }

  toggleProjectFormat() {
    if (this.showFormatToolbar()) {
      this.toggleFormatToolbar();
      return;
    }

    this.setProjectViewMode('table');
    this.toggleFormatToolbar();
  }

  toggleProjectSummaryFormat() {
    this.projectSummaryViewMode.set('table');
    this.showProjectSummaryFormatToolbar.set(true);
  }

  setProjectSummaryClampLines(lines: 1 | 2) {
    this.projectSummaryClampLines.set(lines);
  }

  selectProjectSummaryCell(rowKey: string, colIndex: number) {
    this.selectedProjectSummaryRows.set([]);
    this.projectSummaryRowSelectionAnchor.set(null);
    this.selectedProjectSummaryColumns.set([]);
    this.projectSummaryColumnSelectionAnchor.set(null);
    this.selectedProjectSummaryCell.set({ rowKey, colIndex });
  }

  selectProjectSummaryRow(rowKey: string, event?: MouseEvent) {
    this.cancelProjectSummaryInlineEdit();
    this.selectedProjectSummaryCell.set(null);

    const orderedRowIds = this.projectSummaryVisibleRowIds().length
      ? this.projectSummaryVisibleRowIds()
      : this.filteredProjectSummaryRows().map((record) => record.rowId);
    const clickedIndex = orderedRowIds.indexOf(rowKey);
    if (clickedIndex < 0) {
      return;
    }

    const isToggleSelection = !!event && (event.metaKey || event.ctrlKey);
    const isRangeSelection = !!event?.shiftKey;

    if (isRangeSelection) {
      this.selectedProjectSummaryColumns.set([]);
      this.projectSummaryColumnSelectionAnchor.set(null);
      const anchor = this.projectSummaryRowSelectionAnchor() || rowKey;
      const anchorIndex = orderedRowIds.indexOf(anchor);
      const rangeStart = Math.min(anchorIndex >= 0 ? anchorIndex : clickedIndex, clickedIndex);
      const rangeEnd = Math.max(anchorIndex >= 0 ? anchorIndex : clickedIndex, clickedIndex);
      const rangeIds = orderedRowIds.slice(rangeStart, rangeEnd + 1);
      this.selectedProjectSummaryRows.set(rangeIds);
      this.projectSummaryRowSelectionAnchor.set(anchorIndex >= 0 ? anchor : rowKey);
      return;
    }

    if (isToggleSelection) {
      this.selectedProjectSummaryColumns.set([]);
      this.projectSummaryColumnSelectionAnchor.set(null);
      const current = this.selectedProjectSummaryRows();
      const next = current.includes(rowKey)
        ? current.filter((item) => item !== rowKey)
        : [...current, rowKey];
      this.selectedProjectSummaryRows.set(next);
      this.projectSummaryRowSelectionAnchor.set(rowKey);
      return;
    }

    this.selectedProjectSummaryColumns.set([]);
    this.projectSummaryColumnSelectionAnchor.set(null);
    this.selectedProjectSummaryRows.set([rowKey]);
    this.projectSummaryRowSelectionAnchor.set(rowKey);
  }

  selectProjectSummaryColumn(colIndex: number, event?: MouseEvent) {
    this.cancelProjectSummaryInlineEdit();
    this.selectedProjectSummaryCell.set(null);
    this.selectedProjectSummaryRows.set([]);
    this.projectSummaryRowSelectionAnchor.set(null);

    const totalColumns = this.projectSummaryHeaders().length;
    if (colIndex < 0 || colIndex >= totalColumns) {
      return;
    }

    const isToggleSelection = !!event && (event.metaKey || event.ctrlKey);
    const isRangeSelection = !!event?.shiftKey;

    if (isRangeSelection) {
      const anchor = this.projectSummaryColumnSelectionAnchor() ?? colIndex;
      const rangeStart = Math.min(anchor, colIndex);
      const rangeEnd = Math.max(anchor, colIndex);
      this.selectedProjectSummaryColumns.set(Array.from({ length: rangeEnd - rangeStart + 1 }, (_, index) => rangeStart + index));
      this.projectSummaryColumnSelectionAnchor.set(anchor);
      return;
    }

    if (isToggleSelection) {
      const current = this.selectedProjectSummaryColumns();
      const next = current.includes(colIndex)
        ? current.filter((item) => item !== colIndex)
        : [...current, colIndex].sort((a, b) => a - b);
      this.selectedProjectSummaryColumns.set(next);
      this.projectSummaryColumnSelectionAnchor.set(colIndex);
      return;
    }

    this.selectedProjectSummaryColumns.set([colIndex]);
    this.projectSummaryColumnSelectionAnchor.set(colIndex);
  }

  beginProjectSummaryRowSelection(rowKey: string, event: MouseEvent) {
    if ((event.target as HTMLElement | null)?.closest('.summary-row-resize-handle')) {
      return;
    }

    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    this.selectedProjectSummaryColumns.set([]);
    this.projectSummaryColumnSelectionAnchor.set(null);
    this.projectSummaryVisibleRowIds.set(this.paginatedProjectSummaryRows().map((record) => record.rowId));
    this.cacheProjectSummaryRowDragBounds();
    const currentSelection = this.selectedProjectSummaryRows();
    const canToggleOff = !event.shiftKey
      && !event.metaKey
      && !event.ctrlKey
      && currentSelection.length === 1
      && currentSelection[0] === rowKey;

    this.projectSummaryRowDragActive.set(true);
    this.projectSummaryRowDragStart.set(rowKey);
    this.projectSummaryRowDragMoved.set(false);
    this.projectSummaryRowToggleCandidate.set(canToggleOff);

    if (canToggleOff) {
      this.cancelProjectSummaryInlineEdit();
      this.selectedProjectSummaryCell.set(null);
      this.projectSummaryRowSelectionAnchor.set(rowKey);
      return;
    }

    this.selectProjectSummaryRow(rowKey, event);
  }

  beginProjectSummaryColumnSelection(colIndex: number, event: MouseEvent) {
    if ((event.target as HTMLElement | null)?.closest('.summary-column-resize-handle')) {
      return;
    }

    const headerCell = event.currentTarget as HTMLElement | null;
    if (headerCell) {
      const rect = headerCell.getBoundingClientRect();
      if (event.clientX >= rect.right - 12) {
        this.beginProjectSummaryColumnResize(colIndex, event);
        return;
      }
    }

    if ((event.target as HTMLElement | null)?.closest('.summary-row-resize-handle')) {
      return;
    }

    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    const currentSelection = this.selectedProjectSummaryColumns();
    const canToggleOff = !event.shiftKey
      && !event.metaKey
      && !event.ctrlKey
      && currentSelection.length === 1
      && currentSelection[0] === colIndex;

    this.projectSummaryColumnDragActive.set(true);
    this.projectSummaryColumnDragStart.set(colIndex);
    this.projectSummaryColumnDragMoved.set(false);
    this.projectSummaryColumnToggleCandidate.set(canToggleOff);

    if (canToggleOff) {
      this.cancelProjectSummaryInlineEdit();
      this.selectedProjectSummaryCell.set(null);
      this.projectSummaryColumnSelectionAnchor.set(colIndex);
      return;
    }

    this.selectProjectSummaryColumn(colIndex, event);
  }

  extendProjectSummaryRowSelection(rowKey: string) {
    if (!this.projectSummaryRowDragActive()) {
      return;
    }

    const anchor = this.projectSummaryRowSelectionAnchor();
    if (!anchor) {
      return;
    }

    const orderedRowIds = this.projectSummaryVisibleRowIds().length
      ? this.projectSummaryVisibleRowIds()
      : this.filteredProjectSummaryRows().map((record) => record.rowId);
    const anchorIndex = orderedRowIds.indexOf(anchor);
    const currentIndex = orderedRowIds.indexOf(rowKey);
    if (anchorIndex < 0 || currentIndex < 0) {
      return;
    }

    if (this.projectSummaryRowDragStart() !== rowKey) {
      this.projectSummaryRowDragMoved.set(true);
      this.projectSummaryRowToggleCandidate.set(false);
    }

    const rangeStart = Math.min(anchorIndex, currentIndex);
    const rangeEnd = Math.max(anchorIndex, currentIndex);
    this.selectedProjectSummaryRows.set(orderedRowIds.slice(rangeStart, rangeEnd + 1));
    window.getSelection()?.removeAllRanges();
  }

  extendProjectSummaryColumnSelection(colIndex: number) {
    if (!this.projectSummaryColumnDragActive()) {
      return;
    }

    const anchor = this.projectSummaryColumnSelectionAnchor();
    const totalColumns = this.projectSummaryHeaders().length;
    if (anchor === null || colIndex < 0 || colIndex >= totalColumns) {
      return;
    }

    if (this.projectSummaryColumnDragStart() !== colIndex) {
      this.projectSummaryColumnDragMoved.set(true);
      this.projectSummaryColumnToggleCandidate.set(false);
    }

    const rangeStart = Math.min(anchor, colIndex);
    const rangeEnd = Math.max(anchor, colIndex);
    this.selectedProjectSummaryColumns.set(Array.from({ length: rangeEnd - rangeStart + 1 }, (_, index) => rangeStart + index));
    window.getSelection()?.removeAllRanges();
  }

  handleProjectSummaryCellClick(rowId: string, colIndex: number, value: string) {
    if (this.suppressProjectSummaryCellClick()) {
      this.suppressProjectSummaryCellClick.set(false);
      return;
    }

    this.selectProjectSummaryCell(rowId, colIndex);
    this.startProjectSummaryInlineEdit(rowId, colIndex, value);
  }

  beginProjectSummaryRowSelectionFromCell(rowId: string, event: MouseEvent) {
    if (!this.isProjectSummaryRowSelected(rowId)) {
      return;
    }

    this.beginProjectSummaryRowSelection(rowId, event);
  }

  private cacheProjectSummaryRowDragBounds() {
    const rows = Array.from(document.querySelectorAll('tr[data-summary-row-id][data-summary-row-index]')) as HTMLElement[];
    this.projectSummaryRowDragBounds = rows
      .map((row) => {
        const rowId = row.getAttribute('data-summary-row-id');
        const rowIndex = Number.parseInt(row.getAttribute('data-summary-row-index') || '-1', 10);
        const rect = row.getBoundingClientRect();
        if (!rowId || Number.isNaN(rowIndex)) {
          return null;
        }

        return {
          rowId,
          rowIndex,
          top: rect.top,
          bottom: rect.bottom
        };
      })
      .filter((row): row is { rowId: string; rowIndex: number; top: number; bottom: number } => !!row)
      .sort((a, b) => a.rowIndex - b.rowIndex);
  }

  private projectSummaryRowIdFromClientY(clientY: number) {
    if (!this.projectSummaryRowDragBounds.length) {
      this.cacheProjectSummaryRowDragBounds();
    }

    if (!this.projectSummaryRowDragBounds.length) {
      return null;
    }

    for (const row of this.projectSummaryRowDragBounds) {
      if (clientY >= row.top && clientY <= row.bottom) {
        return row.rowId;
      }
    }

    const firstRow = this.projectSummaryRowDragBounds[0];
    const lastRow = this.projectSummaryRowDragBounds[this.projectSummaryRowDragBounds.length - 1];

    if (clientY < firstRow.top) {
      return firstRow.rowId;
    }

    if (clientY > lastRow.bottom) {
      return lastRow.rowId;
    }

    return null;
  }

  onProjectSummaryRowDragOverlayMove(event: MouseEvent) {
    if (!this.projectSummaryRowDragActive()) {
      return;
    }

    event.preventDefault();
    const rowKey = this.projectSummaryRowIdFromClientY(event.clientY);
    if (!rowKey) {
      return;
    }

    this.extendProjectSummaryRowSelection(rowKey);
  }

  startProjectSummaryInlineEdit(rowId: string, colIndex: number, value: string) {
    this.selectedProjectSummaryCell.set({ rowKey: rowId, colIndex });
    this.editingProjectSummaryCell.set({ rowId, colIndex });
    this.editingProjectSummaryValue.set(value || '');
  }

  updateProjectSummaryInlineEditValue(value: string) {
    this.editingProjectSummaryValue.set(value);
  }

  isEditingProjectSummaryCell(rowId: string, colIndex: number) {
    const cell = this.editingProjectSummaryCell();
    return cell?.rowId === rowId && cell.colIndex === colIndex;
  }

  cancelProjectSummaryInlineEdit() {
    this.editingProjectSummaryCell.set(null);
    this.editingProjectSummaryValue.set('');
  }

  saveProjectSummaryInlineEdit(rowId: string, colIndex: number) {
    const nextValue = this.editingProjectSummaryValue();
    this.cancelProjectSummaryInlineEdit();
    this.saveProjectSummaryCell(rowId, colIndex, nextValue);
  }

  isProjectSummaryCellSelected(rowKey: string, colIndex: number) {
    const selected = this.selectedProjectSummaryCell();
    return selected?.rowKey === rowKey && selected.colIndex === colIndex;
  }

  isProjectSummaryRowSelected(rowKey: string) {
    return this.selectedProjectSummaryRows().includes(rowKey);
  }

  isProjectSummaryColumnSelected(colIndex: number) {
    return this.selectedProjectSummaryColumns().includes(colIndex);
  }

  projectSummaryColumnWidth(colIndex: number) {
    return this.projectSummaryColumnWidths()[colIndex] || this.projectSummaryDefaultColumnWidth(this.projectSummaryHeaders()[colIndex] || '');
  }

  projectSummaryColumnStyle(colIndex: number) {
    const width = this.projectSummaryColumnWidth(colIndex);
    return {
      width: `${width}px`,
      minWidth: `${width}px`,
      maxWidth: `${width}px`
    };
  }

  projectSummaryTableWidth() {
    return 52 + this.projectSummaryHeaders().reduce((sum, _header, index) => sum + this.projectSummaryColumnWidth(index), 0);
  }

  projectSummaryRowHeight(rowId: string) {
    return this.projectSummaryRowHeights()[rowId] || 56;
  }

  projectSummaryRowStyle(rowId: string) {
    const height = this.projectSummaryRowHeight(rowId);
    return {
      height: `${height}px`,
      minHeight: `${height}px`
    };
  }

  projectSummaryRowNumberStyle(rowId: string) {
    return this.projectSummaryRowStyle(rowId);
  }

  projectSummaryBodyCellStyle(rowId: string, row: string[], colIndex: number) {
    return {
      ...this.projectSummaryColumnStyle(colIndex),
      ...this.projectSummaryRowStyle(rowId),
      ...this.projectSummaryCellDisplayStyle(rowId, row, colIndex)
    };
  }

  beginProjectSummaryColumnResize(colIndex: number, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    window.getSelection()?.removeAllRanges();
    this.projectSummaryResizingColumnIndex.set(colIndex);
    this.projectSummaryColumnResizeStartX = event.clientX;
    this.projectSummaryColumnResizeStartWidth = this.projectSummaryColumnWidth(colIndex);
  }

  beginProjectSummaryRowResize(rowId: string, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    window.getSelection()?.removeAllRanges();
    this.projectSummaryResizingRowId.set(rowId);
    this.projectSummaryRowResizeStartY = event.clientY;
    this.projectSummaryRowResizeStartHeight = this.projectSummaryRowHeight(rowId);
  }

  @HostListener('document:mousemove', ['$event'])
  onProjectSummaryRowSelectionDrag(event: MouseEvent) {
    if (this.projectSummaryResizingRowId() !== null) {
      return;
    }

    if (!this.projectSummaryRowDragActive()) {
      return;
    }

    const rowKey = this.projectSummaryRowIdFromClientY(event.clientY);
    if (!rowKey) {
      return;
    }

    this.extendProjectSummaryRowSelection(rowKey);
  }

  @HostListener('document:mousemove', ['$event'])
  onProjectSummaryRowResizeDrag(event: MouseEvent) {
    const rowId = this.projectSummaryResizingRowId();
    if (!rowId) {
      return;
    }

    const delta = event.clientY - this.projectSummaryRowResizeStartY;
    const nextHeight = Math.max(36, this.projectSummaryRowResizeStartHeight + delta);
    this.projectSummaryRowHeights.set({
      ...this.projectSummaryRowHeights(),
      [rowId]: nextHeight
    });
  }

  @HostListener('document:mousemove', ['$event'])
  onProjectSummaryColumnSelectionDrag(event: MouseEvent) {
    if (this.projectSummaryResizingColumnIndex() !== null) {
      return;
    }

    if (!this.projectSummaryColumnDragActive()) {
      return;
    }

    const elementUnderPointer = document.elementFromPoint(event.clientX, event.clientY);
    if (!(elementUnderPointer instanceof HTMLElement)) {
      return;
    }

    const cell = elementUnderPointer.closest('[data-summary-col-index]');
    const colIndexValue = cell?.getAttribute('data-summary-col-index');
    if (colIndexValue === null || colIndexValue === undefined) {
      return;
    }

    const colIndex = Number.parseInt(colIndexValue, 10);
    if (Number.isNaN(colIndex)) {
      return;
    }

    this.extendProjectSummaryColumnSelection(colIndex);
  }

  @HostListener('document:mousemove', ['$event'])
  onProjectSummaryColumnResizeDrag(event: MouseEvent) {
    const colIndex = this.projectSummaryResizingColumnIndex();
    if (colIndex === null) {
      return;
    }

    const delta = event.clientX - this.projectSummaryColumnResizeStartX;
    const nextWidth = Math.max(80, this.projectSummaryColumnResizeStartWidth + delta);
    const widths = [...this.projectSummaryColumnWidths()];
    widths[colIndex] = nextWidth;
    this.projectSummaryColumnWidths.set(widths);
  }

  @HostListener('document:mouseup')
  endProjectSummaryRowSelection() {
    let shouldSuppressCellClick = false;

    if (this.projectSummaryRowDragActive() && this.projectSummaryRowToggleCandidate() && !this.projectSummaryRowDragMoved()) {
      this.selectedProjectSummaryRows.set([]);
      this.projectSummaryRowSelectionAnchor.set(null);
    }

    if (this.projectSummaryRowDragActive() && this.projectSummaryRowDragMoved()) {
      shouldSuppressCellClick = true;
    }

    this.projectSummaryRowDragActive.set(false);
    this.projectSummaryRowDragStart.set(null);
    this.projectSummaryRowDragMoved.set(false);
    this.projectSummaryRowToggleCandidate.set(false);
    this.projectSummaryVisibleRowIds.set([]);
    this.projectSummaryRowDragBounds = [];

    if (this.projectSummaryColumnDragActive() && this.projectSummaryColumnToggleCandidate() && !this.projectSummaryColumnDragMoved()) {
      this.selectedProjectSummaryColumns.set([]);
      this.projectSummaryColumnSelectionAnchor.set(null);
    }

    if (this.projectSummaryColumnDragActive() && this.projectSummaryColumnDragMoved()) {
      shouldSuppressCellClick = true;
    }

    if (this.projectSummaryResizingColumnIndex() !== null) {
      this.persistProjectSummaryColumnWidths();
      shouldSuppressCellClick = true;
    }

    if (this.projectSummaryResizingRowId() !== null) {
      this.persistProjectSummaryRowHeights();
      shouldSuppressCellClick = true;
    }

    this.projectSummaryColumnDragActive.set(false);
    this.projectSummaryColumnDragStart.set(null);
    this.projectSummaryColumnDragMoved.set(false);
    this.projectSummaryColumnToggleCandidate.set(false);
    this.projectSummaryResizingColumnIndex.set(null);
    this.projectSummaryResizingRowId.set(null);

    this.suppressProjectSummaryCellClick.set(shouldSuppressCellClick);
  }

  projectSummarySelectedCellFormat() {
    const targets = this.projectSummaryFormatTargets();
    if (!targets.length) {
      return null;
    }

    const firstTarget = targets[0];
    return this.projectSummaryCellStyles()[this.projectSummaryCellStyleKey(firstTarget.rowKey, firstTarget.colIndex)] || null;
  }

  projectSummarySelectedCellLabel() {
    const selectedRows = this.selectedProjectSummaryRows();
    if (selectedRows.length > 0) {
      return `已选择 ${selectedRows.length} 行`;
    }

    const selectedColumns = this.selectedProjectSummaryColumns();
    if (selectedColumns.length > 0) {
      return `已选择 ${selectedColumns.length} 列`;
    }

    const selected = this.selectedProjectSummaryCell();
    if (!selected) {
      return '未选择单元格';
    }

    return this.projectSummaryHeaders()[selected.colIndex] || '未命名列';
  }

  setProjectSummarySelectedCellFontFamily(value: string) {
    this.updateProjectSummarySelectedCellFormat({ fontFamily: value });
  }

  setProjectSummarySelectedCellFontSize(value: number) {
    this.updateProjectSummarySelectedCellFormat({ fontSize: value });
  }

  adjustProjectSummarySelectedCellFontSize(delta: number) {
    const currentSize = this.projectSummarySelectedCellFormat()?.fontSize || 13;
    this.updateProjectSummarySelectedCellFormat({ fontSize: Math.max(8, Math.min(48, currentSize + delta)) });
  }

  toggleProjectSummarySelectedCellMark(mark: 'bold' | 'italic' | 'underline' | 'strikethrough') {
    const current = this.projectSummarySelectedCellFormat();
    this.updateProjectSummarySelectedCellFormat({ [mark]: !current?.[mark] } as Partial<CellFormat>);
  }

  setProjectSummarySelectedCellTextColor(value: string) {
    this.updateProjectSummarySelectedCellFormat({ textColor: value });
  }

  setProjectSummarySelectedCellBackgroundColor(value: string) {
    this.updateProjectSummarySelectedCellFormat({ backgroundColor: value });
  }

  setProjectSummarySelectedCellTextAlign(value: 'left' | 'center' | 'right') {
    this.updateProjectSummarySelectedCellFormat({ textAlign: value });
  }

  clearProjectSummarySelectedCellFormat() {
    const targets = this.projectSummaryFormatTargets();
    if (!targets.length) {
      return;
    }

    const nextStyles = { ...this.projectSummaryCellStyles() };
    for (const target of targets) {
      delete nextStyles[this.projectSummaryCellStyleKey(target.rowKey, target.colIndex)];
    }
    this.projectSummaryCellStyles.set(nextStyles);
  }

  projectSummaryCellDisplayStyle(rowKey: string, row: string[], colIndex: number) {
    const format = this.projectSummaryCellStyles()[this.projectSummaryCellStyleKey(rowKey, colIndex)] || {};
    const autoStyle = this.projectSummaryAutoCellStyle(row, colIndex);

    return {
      ...autoStyle,
      'font-family': format.fontFamily || null,
      'font-size.px': format.fontSize || null,
      'font-weight': format.bold ? '700' : autoStyle['font-weight'] || null,
      'font-style': format.italic ? 'italic' : null,
      'text-decoration': [
        format.underline ? 'underline' : '',
        format.strikethrough ? 'line-through' : ''
      ].filter(Boolean).join(' ') || null,
      color: format.textColor || autoStyle.color || null,
      'background-color': format.backgroundColor || autoStyle['background-color'] || null,
      'text-align': format.textAlign || null
    };
  }

  projectSummaryRowKey(item: string[], rowIndex: number) {
    return item[1]?.trim() || `${rowIndex}-${item[0] || 'row'}`;
  }

  private resetProjectToolbarState(active: 'search' | 'grid' | 'format' | 'filter' | 'none') {
    if (active !== 'search') {
      this.showProjectSearch.set(false);
      this.searchTerm.set('');
    }

    if (active !== 'grid' && active !== 'search') {
      this.projectViewMode.set('table');
    }

    if (active !== 'format') {
      this.showFormatToolbar.set(false);
      this.selectedCell.set(null);
      this.cancelInlineEdit();
    }

    if (active !== 'filter') {
      this.statusFilter.set('筛选');
      this.showProjectFilter.set(false);
    }
  }

  private resetProjectSummaryToolbarState(active: 'search' | 'grid' | 'format' | 'filter' | 'none') {
    if (active !== 'search') {
      this.showProjectSummarySearch.set(false);
      this.projectSummarySearchTerm.set('');
    }

    if (active !== 'grid' && active !== 'search') {
      this.projectSummaryViewMode.set('table');
    }

    if (active !== 'format') {
      this.showProjectSummaryFormatToolbar.set(false);
    }

    if (active !== 'filter') {
      this.projectSummaryStatusFilter.set('筛选');
      this.showProjectSummaryFilter.set(false);
    }
  }

  private projectSummaryCellStyleKey(rowKey: string, colIndex: number) {
    return `${rowKey}::${colIndex}`;
  }

  private projectSummaryFormatTargets() {
    const selectedRows = this.selectedProjectSummaryRows();
    if (selectedRows.length > 0) {
      const columnCount = this.projectSummaryHeaders().length;
      return selectedRows.flatMap((rowKey) =>
        Array.from({ length: columnCount }, (_, colIndex) => ({ rowKey, colIndex }))
      );
    }

    const selectedColumns = this.selectedProjectSummaryColumns();
    if (selectedColumns.length > 0) {
      const visibleRowIds = this.paginatedProjectSummaryRows().map((record) => record.rowId);
      return visibleRowIds.flatMap((rowKey) =>
        selectedColumns.map((colIndex) => ({ rowKey, colIndex }))
      );
    }

    const selectedCell = this.selectedProjectSummaryCell();
    return selectedCell ? [selectedCell] : [];
  }

  private updateProjectSummarySelectedCellFormat(patch: Partial<CellFormat>) {
    const targets = this.projectSummaryFormatTargets();
    if (!targets.length) {
      return;
    }

    const nextStyles = { ...this.projectSummaryCellStyles() };
    for (const target of targets) {
      const key = this.projectSummaryCellStyleKey(target.rowKey, target.colIndex);
      nextStyles[key] = {
        ...(nextStyles[key] || {}),
        ...patch
      }
    }
    this.projectSummaryCellStyles.set(nextStyles);
  }

  selectCell(row: ProjectRow, field: EditableProjectField) {
    this.selectedCell.set({ rowId: row.id, field });
  }

  isSelectedCell(rowId: number, field: EditableProjectField) {
    const selected = this.selectedCell();
    return selected?.rowId === rowId && selected.field === field;
  }

  selectedCellFormat() {
    const selected = this.selectedCell();
    if (!selected) {
      return null;
    }

    const row = this.projects().find((item) => item.id === selected.rowId);
    return row?.cellStyles?.[selected.field] || null;
  }

  selectedCellLabel() {
    const selected = this.selectedCell();
    if (!selected) {
      return '未选择单元格';
    }
    return this.fieldLabel(selected.field);
  }

  setSelectedCellFontFamily(value: string) {
    this.updateSelectedCellFormat({ fontFamily: value });
  }

  setSelectedCellFontSize(value: number) {
    this.updateSelectedCellFormat({ fontSize: value });
  }

  adjustSelectedCellFontSize(delta: number) {
    const currentSize = this.selectedCellFormat()?.fontSize || 13;
    this.updateSelectedCellFormat({ fontSize: Math.max(8, Math.min(48, currentSize + delta)) });
  }

  toggleSelectedCellMark(mark: 'bold' | 'italic' | 'underline' | 'strikethrough') {
    const current = this.selectedCellFormat();
    this.updateSelectedCellFormat({ [mark]: !current?.[mark] } as Partial<CellFormat>);
  }

  setSelectedCellTextColor(value: string) {
    this.updateSelectedCellFormat({ textColor: value });
  }

  setSelectedCellBackgroundColor(value: string) {
    this.updateSelectedCellFormat({ backgroundColor: value });
  }

  setSelectedCellTextAlign(value: 'left' | 'center' | 'right') {
    this.updateSelectedCellFormat({ textAlign: value });
  }

  setSelectedCellNumberFormat(value: CellFormat['numberFormat']) {
    this.updateSelectedCellFormat({ numberFormat: value || 'plain' });
  }

  clearSelectedCellFormat() {
    const selected = this.selectedCell();
    if (!selected) {
      return;
    }

    const row = this.projects().find((item) => item.id === selected.rowId);
    if (!row) {
      return;
    }

    const nextStyles = { ...(row.cellStyles || {}) };
    delete nextStyles[selected.field];

    const updatedRow: ProjectRow = {
      ...row,
      cellStyles: nextStyles,
      cellStyleJson: JSON.stringify(nextStyles)
    };

    this.projects.set(this.projects().map((item) => item.id === row.id ? updatedRow : item));
    this.saveProjectRow(updatedRow, {});
  }

  cellDisplayStyle(row: ProjectRow, field: EditableProjectField) {
    const format = row.cellStyles?.[field];
    if (!format) {
      return {};
    }

    return {
      'font-family': format.fontFamily || null,
      'font-size.px': format.fontSize || null,
      'font-weight': format.bold ? '700' : null,
      'font-style': format.italic ? 'italic' : null,
      'text-decoration': [
        format.underline ? 'underline' : '',
        format.strikethrough ? 'line-through' : ''
      ].filter(Boolean).join(' ') || null,
      color: format.textColor || null,
      'background-color': format.backgroundColor || null,
      'text-align': format.textAlign || null
    };
  }

  formattedCellValue(row: ProjectRow, field: EditableProjectField) {
    const value = row[field] || '';
    const numberFormat = row.cellStyles?.[field]?.numberFormat;
    if (!numberFormat || value.trim() === '') {
      return value;
    }

    const numericValue = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isNaN(numericValue)) {
      return value;
    }

    switch (numberFormat) {
      case 'currency':
        return numericValue.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });
      case 'percent':
        return `${(numericValue * 100).toFixed(2)}%`;
      case 'decimal1':
        return numericValue.toFixed(1);
      case 'decimal2':
        return numericValue.toFixed(2);
      default:
        return value;
    }
  }

  private updateSelectedCellFormat(patch: Partial<CellFormat>) {
    const selected = this.selectedCell();
    if (!selected) {
      return;
    }

    const row = this.projects().find((item) => item.id === selected.rowId);
    if (!row) {
      return;
    }

    const nextStyles: Partial<Record<EditableProjectField, CellFormat>> = {
      ...(row.cellStyles || {}),
      [selected.field]: {
        ...(row.cellStyles?.[selected.field] || {}),
        ...patch
      }
    };

    const updatedRow: ProjectRow = {
      ...row,
      cellStyles: nextStyles,
      cellStyleJson: JSON.stringify(nextStyles)
    };

    this.projects.set(this.projects().map((item) => item.id === row.id ? updatedRow : item));
    this.saveProjectRow(updatedRow, {});
  }

  filteredProjects() {
    const rows = [...this.projects()];
    const normalizedSearch = this.searchTerm().trim().toLowerCase();
    const statusOrSort = this.statusFilter();

    const filtered = rows.filter((row) => {
      const matchesStatus = !['进行中', '待开始', '已完成'].includes(statusOrSort) || row.completionStatus === statusOrSort;
      const searchableValues = [
        row.company,
        row.clientCompany,
        row.quoNumber,
        row.quoStatus,
        row.msaNumber,
        row.msaStatus,
        row.date,
        row.amountGbp,
        row.relatedInvoice,
        row.deliverables,
        row.engagementType,
        row.startDate,
        row.deliveryDate,
        row.phase1Status,
        row.phase2Status,
        row.phase3Status,
        row.msaSigner,
        row.note,
        row.completionStatus
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 || searchableValues.includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });

    return filtered.sort((a, b) => {
      const aDate = new Date(a.deliveryDate || a.date).getTime();
      const bDate = new Date(b.deliveryDate || b.date).getTime();
      const aAmount = Number.parseFloat(a.amountGbp || '0') || 0;
      const bAmount = Number.parseFloat(b.amountGbp || '0') || 0;

      if (statusOrSort === '日期从新到旧') {
        return bDate - aDate;
      }

      if (statusOrSort === '日期从旧到新') {
        return aDate - bDate;
      }

      if (statusOrSort === '金额从高到低') {
        return bAmount - aAmount;
      }

      if (statusOrSort === '金额从低到高') {
        return aAmount - bAmount;
      }

      return this.sortDirection() === 'asc' ? aDate - bDate : bDate - aDate;
    });
  }

  dashboardCompanySummaries() {
    const currentSession = this.session();
    if (!currentSession) {
      return [] as DashboardCompanySummary[];
    }

    const company = currentSession.company;
    const rows = this.dashboardRows();
    return [{
      companyId: company.id,
      companyName: company.name,
      shortName: company.shortName,
      color: company.color,
      totalProjects: rows.length,
      totalAmount: rows.reduce((sum, row) => sum + this.parseAmount(row.amountGbp), 0),
      signedMsaCount: rows.filter((row) => this.normalizeStatus(row.msaStatus).includes('signed') || this.normalizeStatus(row.msaStatus).includes('已签')).length,
      completedCount: rows.filter((row) => this.normalizeStatus(row.completionStatus).includes('completed') || this.normalizeStatus(row.completionStatus).includes('已完成')).length
    }];
  }

  dashboardTopClients() {
    const clients = new Map<string, DashboardClientSummary>();
    for (const row of this.dashboardRows()) {
      const key = row.clientCompany.trim();
      if (!key) continue;
      const existing = clients.get(key) || {
        clientCompany: key,
        projectCount: 0,
        totalAmount: 0
      };
      existing.projectCount += 1;
      existing.totalAmount += this.parseAmount(row.amountGbp);
      clients.set(key, existing);
    }

    return [...clients.values()]
      .sort((a, b) => {
        if (b.projectCount !== a.projectCount) {
          return b.projectCount - a.projectCount;
        }
        return b.totalAmount - a.totalAmount;
      })
      .slice(0, 6);
  }

  dashboardClientCount() {
    const clients = new Set<string>();
    for (const row of this.dashboardRows()) {
      const key = row.clientCompany.trim();
      if (key) {
        clients.add(key);
      }
    }

    return clients.size;
  }

  dashboardSignedMsaCount() {
    return this.dashboardRows().filter((row) => this.isSignedMsaStatus(row.msaStatus)).length;
  }

  dashboardSignedMsaRate() {
    return this.toPercent(this.dashboardSignedMsaCount(), this.dashboardTotalProjects());
  }

  dashboardCompletionRate() {
    return this.toPercent(this.dashboardCompletedCount(), this.dashboardTotalProjects());
  }

  dashboardSignedValue() {
    return this.dashboardRows()
      .filter((row) => this.isSignedMsaStatus(row.msaStatus))
      .reduce((sum, row) => sum + this.parseAmount(row.amountGbp), 0);
  }

  dashboardDueIn30DaysCount() {
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 30);

    const dueDateIndex = this.dashboardHeaderIndex(this.dashboardInvoiceHeaders(), ['到期日']);
    const payableIndex = this.dashboardFirstHeaderIndex(this.dashboardInvoiceHeaders(), ['应付金额', '发票总额', '小计']);
    if (dueDateIndex < 0) {
      return this.dashboardRows().filter((row) => {
        const dueDate = this.parseDate(row.deliveryDate || row.date);
        return dueDate !== null && dueDate >= now && dueDate <= end;
      }).length;
    }

    return this.dashboardInvoiceRows().filter((row) => {
      const dueDate = this.parseDate(row[dueDateIndex] || '');
      const payableAmount = payableIndex >= 0 ? this.parseAmount(row[payableIndex]) : 0;
      return dueDate !== null && dueDate >= now && dueDate <= end && payableAmount > 0;
    }).length;
  }

  dashboardDataCompleteness() {
    const summaryHeaders = this.dashboardSummaryHeaders();
    const summaryRows = this.dashboardSummaryRows();
    const invoiceHeaders = this.dashboardInvoiceHeaders();
    const invoiceRows = this.dashboardInvoiceRows();

    const summaryFields = [
      this.dashboardHeaderIndex(summaryHeaders, ['客户公司名']),
      this.dashboardHeaderIndex(summaryHeaders, ['项目ID']),
      this.dashboardHeaderIndex(summaryHeaders, ['报价单编号']),
      this.dashboardHeaderIndex(summaryHeaders, ['合同编号']),
      this.dashboardFirstHeaderIndex(summaryHeaders, ['目标金额', '合同金额', '报价金额']),
      this.dashboardHeaderIndex(summaryHeaders, ['发票编号']),
      this.dashboardHeaderIndex(summaryHeaders, ['状态'])
    ];
    const invoiceFields = [
      this.dashboardHeaderIndex(invoiceHeaders, ['匹配项目ID']),
      this.dashboardHeaderIndex(invoiceHeaders, ['发票编号']),
      this.dashboardHeaderIndex(invoiceHeaders, ['发票日期']),
      this.dashboardHeaderIndex(invoiceHeaders, ['到期日']),
      this.dashboardFirstHeaderIndex(invoiceHeaders, ['应付金额', '发票总额', '小计'])
    ];

    let totalCells = 0;
    let completedCells = 0;

    for (const row of summaryRows) {
      for (const fieldIndex of summaryFields) {
        if (fieldIndex < 0) {
          continue;
        }
        totalCells += 1;
        if ((row[fieldIndex] || '').trim()) {
          completedCells += 1;
        }
      }
    }

    for (const row of invoiceRows) {
      for (const fieldIndex of invoiceFields) {
        if (fieldIndex < 0) {
          continue;
        }
        totalCells += 1;
        if ((row[fieldIndex] || '').trim()) {
          completedCells += 1;
        }
      }
    }

    if (!totalCells) {
      return 0;
    }

    return (completedCells / totalCells) * 100;
  }

  dashboardAverageProjectValue() {
    return this.dashboardTotalProjects() ? this.dashboardTotalAmount() / this.dashboardTotalProjects() : 0;
  }

  dashboardActiveDeliveryCount() {
    return this.dashboardRows().filter((row) => !this.isCompletedStatus(row.completionStatus)).length;
  }

  dashboardTopClientConcentration() {
    const total = this.dashboardTotalAmount();
    if (total <= 0) {
      return 0;
    }

    const topThreeAmount = this.dashboardTopClients()
      .slice(0, 3)
      .reduce((sum, client) => sum + client.totalAmount, 0);
    return this.toPercent(topThreeAmount, total);
  }

  dashboardRevenueLeaders() {
    const total = this.dashboardTotalAmount();
    return this.dashboardTopClients().map((client) => ({
      ...client,
      share: total > 0 ? (client.totalAmount / total) * 100 : 0,
      averageValue: client.projectCount > 0 ? client.totalAmount / client.projectCount : 0
    } satisfies DashboardClientPerformance));
  }

  dashboardMonthlyTrend() {
    const months: DashboardTrendMonth[] = [];
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    for (let index = 0; index < 6; index += 1) {
      const date = new Date(startMonth.getFullYear(), startMonth.getMonth() + index, 1);
      months.push({
        label: date.toLocaleString('en-GB', { month: 'short' }),
        amount: 0,
        count: 0,
        ratio: 0
      });
    }

    for (const row of this.dashboardRows()) {
      const rowDate = this.parseDate(row.date);
      if (!rowDate) continue;
      const monthOffset = (rowDate.getFullYear() - startMonth.getFullYear()) * 12 + (rowDate.getMonth() - startMonth.getMonth());
      if (monthOffset < 0 || monthOffset >= months.length) continue;
      months[monthOffset].count += 1;
      months[monthOffset].amount += this.parseAmount(row.amountGbp);
    }

    const maxAmount = Math.max(...months.map((month) => month.amount), 0);
    return months.map((month) => ({
      ...month,
      ratio: maxAmount > 0 ? (month.amount / maxAmount) * 100 : 6
    }));
  }

  dashboardPipelineStages() {
    const rows = this.dashboardRows();
    const totalAmount = this.dashboardTotalAmount();
    const stages: Omit<DashboardPipelineStage, 'ratio'>[] = [
      {
        label: '项目已录入',
        subtitle: '已进入 CRM 的全部项目',
        count: rows.length,
        amount: totalAmount,
        tone: 'blue'
      },
      {
        label: 'QUO 已推进',
        subtitle: '已有报价动作或报价编号',
        count: rows.filter((row) => String(row.quoNumber || row.quoStatus || '').trim().length > 0).length,
        amount: rows
          .filter((row) => String(row.quoNumber || row.quoStatus || '').trim().length > 0)
          .reduce((sum, row) => sum + this.parseAmount(row.amountGbp), 0),
        tone: 'purple'
      },
      {
        label: 'MSA 已签署',
        subtitle: '适合视作较高确定性的项目',
        count: this.dashboardSignedMsaCount(),
        amount: this.dashboardSignedValue(),
        tone: 'teal'
      },
      {
        label: '交付进行中',
        subtitle: '仍在执行或等待启动的项目',
        count: this.dashboardActiveDeliveryCount(),
        amount: rows
          .filter((row) => !this.isCompletedStatus(row.completionStatus))
          .reduce((sum, row) => sum + this.parseAmount(row.amountGbp), 0),
        tone: 'orange'
      }
    ];

    return stages.map((stage) => ({
      ...stage,
      ratio: totalAmount > 0 ? (stage.amount / totalAmount) * 100 : 0
    } satisfies DashboardPipelineStage));
  }

  dashboardMsaPipeline() {
    const rows = this.dashboardRows();
    const total = rows.length || 1;
    const signed = rows.filter((row) => this.isSignedMsaStatus(row.msaStatus)).length;
    const pending = rows.filter((row) => this.isPendingMsaStatus(row.msaStatus)).length;
    const blank = rows.length - signed - pending;

    return [
      {
        label: '已签署',
        count: signed,
        ratio: (signed / total) * 100,
        tone: 'positive',
        helper: '合同已完成签署'
      },
      {
        label: '待跟进',
        count: pending,
        ratio: (pending / total) * 100,
        tone: 'warning',
        helper: 'Pending / Review / 处理中'
      },
      {
        label: '未更新',
        count: Math.max(0, blank),
        ratio: (Math.max(0, blank) / total) * 100,
        tone: 'neutral',
        helper: '状态仍待补齐'
      }
    ] satisfies DashboardMetricBar[];
  }

  dashboardDeliveryPipeline() {
    const rows = this.dashboardRows();
    const total = rows.length || 1;
    const completed = rows.filter((row) => this.isCompletedStatus(row.completionStatus)).length;
    const inProgress = rows.filter((row) => this.isInProgressCompletionStatus(row.completionStatus)).length;
    const blank = rows.length - completed - inProgress;

    return [
      {
        label: '已完成',
        count: completed,
        ratio: (completed / total) * 100,
        tone: 'positive',
        helper: '交付已经落地'
      },
      {
        label: '执行中',
        count: inProgress,
        ratio: (inProgress / total) * 100,
        tone: 'accent',
        helper: '项目正在推进'
      },
      {
        label: '待启动',
        count: Math.max(0, blank),
        ratio: (Math.max(0, blank) / total) * 100,
        tone: 'neutral',
        helper: '未开始或未填写'
      }
    ] satisfies DashboardMetricBar[];
  }

  dashboardEngagementSlices() {
    const counts = new Map<string, DashboardPieSlice>([
      ['one-off', { label: 'One-off', count: 0, color: '#2563eb' }],
      ['phase-based', { label: 'Phase-based', count: 0, color: '#f97316' }],
      ['unknown', { label: '未填写', count: 0, color: '#cbd5e1' }]
    ]);

    for (const row of this.dashboardRows()) {
      const normalized = this.normalizeStatus(row.engagementType);
      const key = normalized.includes('phase') ? 'phase-based' : normalized.includes('one-off') || normalized.includes('oneoff') ? 'one-off' : 'unknown';
      const slice = counts.get(key);
      if (slice) {
        slice.count += 1;
      }
    }

    return [...counts.values()].filter((slice) => slice.count > 0);
  }

  dashboardEngagementGradient() {
    const slices = this.dashboardEngagementSlices();
    const total = slices.reduce((sum, slice) => sum + slice.count, 0);
    if (total === 0) {
      return 'conic-gradient(#e2e8f0 0deg 360deg)';
    }

    let current = 0;
    const segments = slices.map((slice) => {
      const start = current;
      current += (slice.count / total) * 360;
      return `${slice.color} ${start}deg ${current}deg`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  }

  dashboardEngagementPrimarySlice() {
    const slices = this.dashboardEngagementSlices();
    return slices.sort((a, b) => b.count - a.count)[0] || null;
  }

  dashboardEngagementTotal() {
    return this.dashboardEngagementSlices().reduce((sum, slice) => sum + slice.count, 0);
  }

  dashboardRecentActivities() {
    return [...this.dashboardRows()]
      .filter((row) => (row.date || '').trim().length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8)
      .map((row) => ({
        companyName: row.company || this.companyNameForId(row.companyId || ''),
        clientCompany: row.clientCompany,
        quoNumber: row.quoNumber,
        date: row.date,
        amountGbp: row.amountGbp,
        completionStatus: row.completionStatus
      } satisfies DashboardActivityItem));
  }

  private buildDashboardRowsFromSheets(summary: ProjectSummaryResponse, invoices: ProjectSummaryResponse, company: Company) {
    const summaryHeaders = summary.headers || [];
    const summaryRows = summary.rows || [];
    const invoiceHeaders = invoices.headers || [];
    const invoiceRows = invoices.rows || [];

    const invoiceProjectIdIndex = this.dashboardHeaderIndex(invoiceHeaders, ['匹配项目ID']);
    const invoiceClientIndex = this.dashboardHeaderIndex(invoiceHeaders, ['客户公司名']);
    const invoiceNumberIndex = this.dashboardHeaderIndex(invoiceHeaders, ['发票编号']);
    const invoiceDateIndex = this.dashboardHeaderIndex(invoiceHeaders, ['发票日期']);
    const invoiceDueDateIndex = this.dashboardHeaderIndex(invoiceHeaders, ['到期日']);
    const invoiceAmountIndex = this.dashboardFirstHeaderIndex(invoiceHeaders, ['应付金额', '发票总额', '小计']);
    const invoiceDescriptionIndex = this.dashboardFirstHeaderIndex(invoiceHeaders, ['项目/行项目说明', '匹配说明', '源文件']);

    const invoicesByProjectId = new Map<string, string[][]>();
    const invoicesByClient = new Map<string, string[][]>();
    for (const row of invoiceRows) {
      const projectId = invoiceProjectIdIndex >= 0 ? (row[invoiceProjectIdIndex] || '').trim() : '';
      const clientCompany = invoiceClientIndex >= 0 ? (row[invoiceClientIndex] || '').trim() : '';
      if (projectId) {
        invoicesByProjectId.set(projectId, [...(invoicesByProjectId.get(projectId) || []), row]);
      }
      if (clientCompany) {
        invoicesByClient.set(clientCompany, [...(invoicesByClient.get(clientCompany) || []), row]);
      }
    }

    const projectIdIndex = this.dashboardHeaderIndex(summaryHeaders, ['项目ID']);
    const clientCompanyIndex = this.dashboardHeaderIndex(summaryHeaders, ['客户公司名']);
    const quoNumberIndex = this.dashboardHeaderIndex(summaryHeaders, ['报价单编号']);
    const quoDateIndex = this.dashboardHeaderIndex(summaryHeaders, ['报价日期']);
    const quoAmountIndex = this.dashboardHeaderIndex(summaryHeaders, ['报价金额']);
    const msaNumberIndex = this.dashboardHeaderIndex(summaryHeaders, ['合同编号']);
    const msaDateIndex = this.dashboardHeaderIndex(summaryHeaders, ['合同日期']);
    const msaAmountIndex = this.dashboardHeaderIndex(summaryHeaders, ['合同金额']);
    const targetAmountIndex = this.dashboardHeaderIndex(summaryHeaders, ['目标金额']);
    const deliverablesIndex = this.dashboardHeaderIndex(summaryHeaders, ['项目内容/服务名称']);
    const engagementIndex = this.dashboardHeaderIndex(summaryHeaders, ['合作类型/期限']);
    const signerIndex = this.dashboardFirstHeaderIndex(summaryHeaders, ['服务方签署人', '负责人/联系人']);
    const invoiceNumbersIndex = this.dashboardHeaderIndex(summaryHeaders, ['发票编号']);
    const invoiceDateSummaryIndex = this.dashboardHeaderIndex(summaryHeaders, ['发票日期']);
    const unpaidAmountIndex = this.dashboardHeaderIndex(summaryHeaders, ['未开票金额']);
    const statusIndex = this.dashboardHeaderIndex(summaryHeaders, ['状态']);
    const noteIndex = this.dashboardFirstHeaderIndex(summaryHeaders, ['匹配备注', 'Column1']);

    return summaryRows.map((row, index) => {
      const projectId = projectIdIndex >= 0 ? (row[projectIdIndex] || '').trim() : '';
      const clientCompany = clientCompanyIndex >= 0 ? (row[clientCompanyIndex] || '').trim() : '';
      const matchedInvoices = projectId
        ? (invoicesByProjectId.get(projectId) || [])
        : (invoicesByClient.get(clientCompany) || []);
      const latestDueDate = this.dashboardLatestDate(
        matchedInvoices.map((invoiceRow) => invoiceDueDateIndex >= 0 ? invoiceRow[invoiceDueDateIndex] || '' : '')
      );
      const latestInvoiceDate = this.dashboardLatestDate(
        matchedInvoices.map((invoiceRow) => invoiceDateIndex >= 0 ? invoiceRow[invoiceDateIndex] || '' : '')
      );
      const invoiceNumbers = [
        ...(invoiceNumbersIndex >= 0 ? this.dashboardSplitValues(row[invoiceNumbersIndex]) : []),
        ...matchedInvoices.map((invoiceRow) => invoiceNumberIndex >= 0 ? (invoiceRow[invoiceNumberIndex] || '').trim() : '')
      ].filter(Boolean);
      const dedupedInvoiceNumbers = [...new Set(invoiceNumbers)];
      const summaryStatus = statusIndex >= 0 ? (row[statusIndex] || '').trim() : '';
      const unpaidAmount = unpaidAmountIndex >= 0 ? this.parseAmount(row[unpaidAmountIndex]) : 0;
      const payableAmount = matchedInvoices.reduce((sum, invoiceRow) => (
        sum + (invoiceAmountIndex >= 0 ? this.parseAmount(invoiceRow[invoiceAmountIndex]) : 0)
      ), 0);
      const hasContract = msaNumberIndex >= 0 && (row[msaNumberIndex] || '').trim().length > 0;
      const hasQuote = quoNumberIndex >= 0 && (row[quoNumberIndex] || '').trim().length > 0;
      const hasInvoice = dedupedInvoiceNumbers.length > 0 || matchedInvoices.length > 0;

      return this.hydrateProjectRow({
        id: index + 1,
        source: 'drive',
        sourceKey: projectId || `${company.id}-${index + 1}`,
        companyId: company.id,
        company: company.name,
        clientCompany,
        quoNumber: quoNumberIndex >= 0 ? (row[quoNumberIndex] || '').trim() : '',
        quoStatus: hasQuote ? '已报价' : '',
        msaNumber: msaNumberIndex >= 0 ? (row[msaNumberIndex] || '').trim() : '',
        msaStatus: this.dashboardDerivedMsaStatus(hasContract, hasQuote, summaryStatus),
        date: this.dashboardPreferredValue(
          msaDateIndex >= 0 ? row[msaDateIndex] : '',
          quoDateIndex >= 0 ? row[quoDateIndex] : '',
          invoiceDateSummaryIndex >= 0 ? row[invoiceDateSummaryIndex] : '',
          latestInvoiceDate
        ),
        amountGbp: this.dashboardPreferredValue(
          targetAmountIndex >= 0 ? row[targetAmountIndex] : '',
          msaAmountIndex >= 0 ? row[msaAmountIndex] : '',
          quoAmountIndex >= 0 ? row[quoAmountIndex] : '',
          String(payableAmount || '')
        ),
        relatedInvoice: dedupedInvoiceNumbers.join('; '),
        deliverables: this.dashboardPreferredValue(
          deliverablesIndex >= 0 ? row[deliverablesIndex] : '',
          matchedInvoices[0] && invoiceDescriptionIndex >= 0 ? matchedInvoices[0][invoiceDescriptionIndex] : ''
        ),
        engagementType: engagementIndex >= 0 ? (row[engagementIndex] || '').trim() : '',
        startDate: quoDateIndex >= 0 ? (row[quoDateIndex] || '').trim() : '',
        deliveryDate: latestDueDate,
        phase1Status: '',
        phase2Status: '',
        phase3Status: '',
        msaSigner: signerIndex >= 0 ? (row[signerIndex] || '').trim() : '',
        note: noteIndex >= 0 ? (row[noteIndex] || '').trim() : '',
        completionStatus: this.dashboardDerivedCompletionStatus(summaryStatus, unpaidAmount, hasContract, hasInvoice),
        cellStyleJson: ''
      });
    });
  }

  private dashboardHeaderIndex(headers: string[], aliases: string[]) {
    const normalizedAliases = aliases.map((alias) => this.dashboardNormalizeHeader(alias));
    return headers.findIndex((header) => normalizedAliases.includes(this.dashboardNormalizeHeader(header)));
  }

  private dashboardFirstHeaderIndex(headers: string[], aliases: string[]) {
    return this.dashboardHeaderIndex(headers, aliases);
  }

  private dashboardNormalizeHeader(value: string) {
    return (value || '').replace(/\s+/g, '').trim().toLowerCase();
  }

  private dashboardSplitValues(value?: string) {
    return (value || '')
      .split(/[;；,\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private dashboardLatestDate(values: string[]) {
    const dates = values
      .map((value) => ({ raw: value, parsed: this.parseDate(value) }))
      .filter((entry): entry is { raw: string; parsed: Date } => entry.parsed !== null)
      .sort((a, b) => b.parsed.getTime() - a.parsed.getTime());
    return dates[0]?.raw || '';
  }

  private dashboardPreferredValue(...values: Array<string | undefined>) {
    for (const value of values) {
      if ((value || '').trim()) {
        return value!.trim();
      }
    }
    return '';
  }

  private dashboardDerivedMsaStatus(hasContract: boolean, hasQuote: boolean, summaryStatus: string) {
    if (hasContract) {
      return '已签署';
    }
    if (hasQuote || this.normalizeStatus(summaryStatus).includes('部分')) {
      return '待跟进';
    }
    return '';
  }

  private dashboardDerivedCompletionStatus(summaryStatus: string, unpaidAmount: number, hasContract: boolean, hasInvoice: boolean) {
    const normalizedStatus = this.normalizeStatus(summaryStatus);
    if (normalizedStatus.includes('发票金额匹配') || (hasInvoice && unpaidAmount <= 0)) {
      return '已完成';
    }
    if (normalizedStatus.includes('部分开票') || hasContract) {
      return '进行中';
    }
    if (normalizedStatus.includes('未见发票')) {
      return '待启动';
    }
    return hasInvoice ? '进行中' : '';
  }

  projectSummaryRows() {
    return this.projectSummaryRowsData();
  }

  projectSummaryRecords() {
    return this.projectSummaryRows().map((row, index) => ({
      rowId: this.projectSummaryRowIds()[index] || String(index + 2),
      row
    }));
  }

  filteredProjectSummaryRows() {
    const normalizedSearch = this.projectSummarySearchTerm().trim().toLowerCase();
    const statusFilter = this.projectSummaryStatusFilter();
    const statusColumnIndex = this.projectSummaryStatusColumnIndex();

    return this.projectSummaryRecords().filter(({ row }) => {
      const matchesStatus = statusFilter === '筛选'
        || statusColumnIndex < 0
        || row[statusColumnIndex] === statusFilter;
      const searchableValues = row.join(' ').toLowerCase();
      const matchesSearch = normalizedSearch.length === 0 || searchableValues.includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }

  projectSummaryCount() {
    return this.filteredProjectSummaryRows().length;
  }

  projectSummaryInvoicedCount() {
    const invoiceNumberIndex = this.projectSummaryColumnIndex('发票编号');
    if (invoiceNumberIndex < 0) {
      return 0;
    }
    return this.projectSummaryRows().filter((row) => (row[invoiceNumberIndex] || '').trim().length > 0).length;
  }

  projectSummaryTargetAmount() {
    const amountIndex = this.projectSummaryFirstColumnIndex(['目标金额', '应付金额', '发票总额']);
    if (amountIndex < 0) {
      return 0;
    }
    return this.projectSummaryRows().reduce((sum, row) => sum + this.parseAmount(row[amountIndex]), 0);
  }

  projectSummaryUninvoicedAmount() {
    const amountIndex = this.projectSummaryColumnIndex('未开票金额');
    if (amountIndex < 0) {
      return 0;
    }
    return this.projectSummaryRows().reduce((sum, row) => sum + this.parseAmount(row[amountIndex]), 0);
  }

  projectSummaryStatusClass(value: string) {
    if (value === '发票金额匹配') {
      return 'dashboard-status-positive';
    }

    if (value === '部分开票') {
      return 'dashboard-status-warning';
    }

    if (value === '未见发票') {
      return 'dashboard-status-negative';
    }

    return 'dashboard-status-neutral';
  }

  projectSummaryGridStatusValue(row: string[]) {
    const statusColumnIndex = this.projectSummaryStatusColumnIndex();
    return statusColumnIndex >= 0 ? (row[statusColumnIndex] || '') : '';
  }

  projectSummaryShouldWrap(columnIndex: number) {
    const header = this.projectSummaryHeaders()[columnIndex] || '';
    return ['项目内容/服务名称', '项目描述', '合作类型/期限', '匹配备注', '源文件', '项目/行项目说明', '匹配说明'].includes(header);
  }

  projectSummaryIsStatusColumn(columnIndex: number) {
    return (this.projectSummaryHeaders()[columnIndex] || '') === '状态';
  }

  currentDetailHasStatusColumn() {
    return this.projectSummaryStatusColumnIndex() >= 0;
  }

  paginatedProjectSummaryRows() {
    const rows = this.filteredProjectSummaryRows();
    const totalPages = this.projectSummaryTotalPages();
    const safePage = Math.min(this.currentSummaryPage(), totalPages);
    if (safePage !== this.currentSummaryPage()) {
      this.currentSummaryPage.set(safePage);
    }
    const start = (safePage - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  projectSummaryColumnLabel(columnIndex: number) {
    let label = '';
    let current = columnIndex;

    do {
      label = String.fromCharCode(65 + (current % 26)) + label;
      current = Math.floor(current / 26) - 1;
    } while (current >= 0);

    return label;
  }

  projectSummaryRowNumber(rowIndex: number) {
    return ((this.currentSummaryPage() - 1) * this.pageSize) + rowIndex + 1;
  }

  loadProjectSummary(forceRefresh = false) {
    const currentSession = this.session();
    if (!currentSession) {
      this.projectSummaryHeaders.set([]);
      this.projectSummaryRowIds.set([]);
      this.projectSummaryRowsData.set([]);
      this.projectSummaryError.set('');
      return;
    }

    if (!forceRefresh) {
      const cached = this.readProjectSummaryCache(currentSession.company.id, this.currentDetailSheetName());
      if (cached) {
        this.applyProjectSummaryResponse(cached);
        this.projectSummaryLoading.set(false);
        this.projectSummaryError.set('');
        return;
      }
    }

    this.projectSummaryLoading.set(true);
    this.projectSummaryError.set('');

    this.http
      .get<ProjectSummaryResponse>(
        `${this.apiBaseUrl}/api/project-summary?companyId=${encodeURIComponent(currentSession.company.id)}&sheetName=${encodeURIComponent(this.currentDetailSheetName())}`,
        this.authOptions()
      )
      .subscribe({
        next: (response) => {
          this.applyProjectSummaryResponse(response);
          this.writeProjectSummaryCache(currentSession.company.id, this.currentDetailSheetName(), response);
          this.projectSummaryLoading.set(false);
        },
        error: () => {
          this.projectSummaryHeaders.set([]);
          this.projectSummaryRowIds.set([]);
          this.projectSummaryRowsData.set([]);
          this.projectSummaryLoading.set(false);
          this.projectSummaryError.set(`${this.currentDetailSectionLabel()}读取失败，请确认 Google Drive 文件和 Java backend 正在运行。`);
        }
      });
  }

  projectSummaryTotalPages() {
    return Math.max(1, Math.ceil(this.filteredProjectSummaryRows().length / this.pageSize));
  }

  goToProjectSummaryPage(page: number) {
    this.currentSummaryPage.set(Math.min(Math.max(1, page), this.projectSummaryTotalPages()));
  }

  projectSummaryFilterOptions() {
    const statuses = new Set<string>();
    const statusColumnIndex = this.projectSummaryStatusColumnIndex();
    for (const row of this.projectSummaryRows()) {
      if (statusColumnIndex >= 0 && row[statusColumnIndex]?.trim()) {
        statuses.add(row[statusColumnIndex].trim());
      }
    }
    return ['筛选', ...statuses];
  }

  dashboardTotalProjects() {
    return this.dashboardRows().length;
  }

  dashboardTotalAmount() {
    return this.dashboardRows().reduce((sum, row) => sum + this.parseAmount(row.amountGbp), 0);
  }

  dashboardPendingMsaCount() {
    return this.dashboardRows().filter((row) => {
      const status = this.normalizeStatus(row.msaStatus);
      return status.includes('pending') || status.includes('review') || status.includes('未开始') || status.includes('处理中');
    }).length;
  }

  dashboardDeliveryRiskCount() {
    return this.dashboardRows().filter((row) => {
      const dueDate = this.parseDate(row.deliveryDate || row.date);
      return dueDate !== null && dueDate < new Date() && !this.isCompletedStatus(row.completionStatus);
    }).length;
  }

  dashboardCompletedCount() {
    return this.dashboardRows().filter((row) => {
      const status = this.normalizeStatus(row.completionStatus);
      return status.includes('completed') || status.includes('已完成');
    }).length;
  }

  dashboardPhaseSummary() {
    const summary: DashboardPhaseSummary = {
      completed: 0,
      inProgress: 0,
      pending: 0,
      total: 0
    };

    for (const row of this.dashboardRows()) {
      const engagement = this.normalizeStatus(row.engagementType);
      if (!engagement.includes('phase')) {
        continue;
      }

      const statuses = [row.phase1Status, row.phase2Status, row.phase3Status];
      for (const statusValue of statuses) {
        const status = this.normalizeStatus(statusValue);
        if (!status) {
          continue;
        }

        summary.total += 1;
        if (status.includes('已完成') || status.includes('completed')) {
          summary.completed += 1;
        } else if (status.includes('进行中') || status.includes('in progress') || status.includes('处理中')) {
          summary.inProgress += 1;
        } else {
          summary.pending += 1;
        }
      }
    }

    return summary;
  }

  dashboardPhaseCompletionRate() {
    const summary = this.dashboardPhaseSummary();
    return this.toPercent(summary.completed, summary.total);
  }

  formatCurrency(value: number | string) {
    const amount = typeof value === 'number' ? value : this.parseAmount(value);
    return amount.toLocaleString('en-GB', { maximumFractionDigits: 0 });
  }

  dashboardCompletionStatusLabel(value: string) {
    return (value || '').trim() || '未填写';
  }

  dashboardCompletionStatusClass(value: string) {
    if (this.isCompletedStatus(value)) {
      return 'dashboard-status-positive';
    }

    if (this.isInProgressCompletionStatus(value)) {
      return 'dashboard-status-warning';
    }

    return 'dashboard-status-neutral';
  }

  paginatedProjects() {
    const rows = this.filteredProjects();
    const totalPages = this.projectTotalPages();
    const safePage = Math.min(this.currentProjectPage(), totalPages);
    if (safePage !== this.currentProjectPage()) {
      this.currentProjectPage.set(safePage);
    }
    const start = (safePage - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  projectTotalPages() {
    return Math.max(1, Math.ceil(this.filteredProjects().length / this.pageSize));
  }

  driveTotalPages() {
    return Math.max(1, Math.ceil(this.driveFiles().length / this.pageSize));
  }

  paginatedDriveFiles() {
    const files = this.driveFiles();
    const totalPages = this.driveTotalPages();
    const safePage = Math.min(this.currentDrivePage(), totalPages);
    if (safePage !== this.currentDrivePage()) {
      this.currentDrivePage.set(safePage);
    }
    const start = (safePage - 1) * this.pageSize;
    return files.slice(start, start + this.pageSize);
  }

  goToProjectPage(page: number) {
    this.currentProjectPage.set(Math.min(Math.max(1, page), this.projectTotalPages()));
  }

  goToDrivePage(page: number) {
    this.currentDrivePage.set(Math.min(Math.max(1, page), this.driveTotalPages()));
  }

  toggleSort() {
    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
  }

  openDriveItem(item: DriveItem) {
    const targetUrl = item.webViewLink || item.webContentLink;
    if (!targetUrl) {
      return;
    }
    window.open(targetUrl, '_blank', 'noopener');
  }

  openPhaseStatusModal(project: ProjectRow) {
    this.selectedPhaseProject.set(project);
  }

  closePhaseStatusModal() {
    this.selectedPhaseProject.set(null);
  }

  phaseStatusItems(project: ProjectRow): PhaseStatusItem[] {
    const phaseItems = [
      { order: 1, label: 'Phase 1 完成状态', value: project.phase1Status },
      { order: 2, label: 'Phase 2 完成状态', value: project.phase2Status },
      { order: 3, label: 'Phase 3 完成状态', value: project.phase3Status }
    ];

    return phaseItems
      .filter((item) => item.value.trim().length > 0)
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        label: item.label,
        value: item.value
      }));
  }

  hasPhaseStatus(project: ProjectRow) {
    return [project.phase1Status, project.phase2Status, project.phase3Status].some(
      (value) => (value || '').trim().length > 0
    );
  }

  phaseStatusButtonLabel(project: ProjectRow) {
    const count = this.phaseStatusItems(project).length;
    return count > 0 ? `查看 ${count} 个 Phase` : '无 Phase';
  }

  isDriveFolder(item: DriveItem) {
    return item.mimeType === 'application/vnd.google-apps.folder';
  }

  private readStoredToken() {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return '';

    try {
      return (JSON.parse(raw) as StoredAuth).token || '';
    } catch {
      localStorage.removeItem(this.storageKey);
      return '';
    }
  }

  private loadProjects() {
    const currentSession = this.session();
    if (!currentSession) return;
    this.projectsLoading.set(true);
    this.syncError.set('');

    this.http
      .get<ProjectRow[]>(
        `${this.apiBaseUrl}/api/project-rows?companyId=${encodeURIComponent(currentSession.company.id)}`,
        this.authOptions()
      )
      .subscribe({
        next: (rows) => {
          this.projects.set((rows || []).map((row) => this.hydrateProjectRow(row)));
          this.projectsLoading.set(false);
        },
        error: () => {
          this.projects.set([]);
          this.projectsLoading.set(false);
        }
      });
  }

  private saveProjectRow(row: ProjectRow, overrides: Partial<ProjectRow>) {
    const currentSession = this.session();
    if (!currentSession) {
      return;
    }

    const payload: ProjectRowDbPayload = {
      ...row,
      ...overrides,
      companyId: row.companyId || currentSession.company.id,
      company: row.company || currentSession.company.name,
      source: 'manual',
      sourceKey: row.sourceKey || '',
      cellStyleJson: JSON.stringify(row.cellStyles || {})
    };

    this.http
      .post(`${this.apiBaseUrl}/api/project-rows/save`, payload, this.authOptions())
      .subscribe({
        next: () => {
          this.loadDashboardData();
          this.loadProjects();
        },
        error: () => {
          this.error.set('单元格保存失败，请确认数据库与 Java backend 正在运行。');
        }
      });
  }

  private saveProjectSummaryCell(rowId: string, columnIndex: number, value: string) {
    const currentSession = this.session();
    if (!currentSession) {
      return;
    }

    const rowIndex = this.projectSummaryRowIds().findIndex((item) => item === rowId);
    if (rowIndex < 0) {
      return;
    }

    const currentRow = this.projectSummaryRowsData()[rowIndex] || [];
    if ((currentRow[columnIndex] || '') === value) {
      return;
    }

    const nextRows = this.projectSummaryRowsData().map((row, index) => {
      if (index !== rowIndex) {
        return row;
      }
      const nextRow = [...row];
      nextRow[columnIndex] = value;
      return nextRow;
    });
    this.projectSummaryRowsData.set(nextRows);
    this.persistCurrentProjectSummaryCache();

    this.http
      .post(
        `${this.apiBaseUrl}/api/project-summary/save-cell`,
        {
          companyId: currentSession.company.id,
          sheetName: this.currentDetailSheetName(),
          rowId,
          columnIndex,
          value
        },
        this.authOptions()
      )
      .subscribe({
        error: () => {
          this.projectSummaryError.set(`${this.currentDetailSectionLabel()}单元格保存失败，请确认数据库与 Java backend 正在运行。`);
          this.loadProjectSummary(true);
        }
      });
  }

  private loadDashboardData() {
    const currentSession = this.session();
    if (!currentSession) {
      this.dashboardRows.set([]);
      this.dashboardSummaryHeaders.set([]);
      this.dashboardSummaryRows.set([]);
      this.dashboardInvoiceHeaders.set([]);
      this.dashboardInvoiceRows.set([]);
      this.dashboardError.set('');
      return;
    }

    this.dashboardError.set('');
    const cached = this.readDashboardCache(currentSession.company.id);
    if (cached) {
      this.applyDashboardCache(currentSession.company, cached);
      this.dashboardLoading.set(false);
    } else {
      this.dashboardLoading.set(true);
    }

    forkJoin({
      summary: this.http.get<ProjectSummaryResponse>(
        `${this.apiBaseUrl}/api/project-summary?companyId=${encodeURIComponent(currentSession.company.id)}&sheetName=${encodeURIComponent('项目汇总')}`,
        this.authOptions()
      ),
      invoiceDetails: this.http.get<ProjectSummaryResponse>(
        `${this.apiBaseUrl}/api/project-summary?companyId=${encodeURIComponent(currentSession.company.id)}&sheetName=${encodeURIComponent('发票明细')}`,
        this.authOptions()
      )
    })
      .subscribe({
        next: ({ summary, invoiceDetails }) => {
          this.dashboardSummaryHeaders.set(summary.headers || []);
          this.dashboardSummaryRows.set(summary.rows || []);
          this.dashboardInvoiceHeaders.set(invoiceDetails.headers || []);
          this.dashboardInvoiceRows.set(invoiceDetails.rows || []);
          this.dashboardRows.set(this.buildDashboardRowsFromSheets(summary, invoiceDetails, currentSession.company));
          this.writeDashboardCache(currentSession.company.id, {
            summaryHeaders: summary.headers || [],
            summaryRows: summary.rows || [],
            invoiceHeaders: invoiceDetails.headers || [],
            invoiceRows: invoiceDetails.rows || []
          });
          this.dashboardLoading.set(false);
        },
        error: () => {
          this.dashboardLoading.set(false);
          if (!cached) {
            this.dashboardRows.set([]);
            this.dashboardSummaryHeaders.set([]);
            this.dashboardSummaryRows.set([]);
            this.dashboardInvoiceHeaders.set([]);
            this.dashboardInvoiceRows.set([]);
            this.dashboardError.set('Dashboard 数据读取失败，请确认项目汇总、发票明细和 Java backend 正在运行。');
          }
        }
      });
  }

  private parseAmount(value: string) {
    return Number.parseFloat((value || '').replace(/,/g, '').trim()) || 0;
  }

  private toPercent(value: number, total: number) {
    if (!total) {
      return 0;
    }

    return (value / total) * 100;
  }

  private hydrateProjectRow(row: ProjectRow) {
    return {
      ...row,
      cellStyles: this.parseCellStyles(row.cellStyleJson)
    };
  }

  private parseCellStyles(value?: string) {
    if (!value || !value.trim()) {
      return {};
    }

    try {
      return JSON.parse(value) as Partial<Record<EditableProjectField, CellFormat>>;
    } catch {
      return {};
    }
  }

  private normalizeStatus(value: string) {
    return (value || '').trim().toLowerCase();
  }

  private projectSummaryAutoCellStyle(row: string[], colIndex: number) {
    const header = this.projectSummaryHeaders()[colIndex] || '';
    const cellValue = row[colIndex] || '';
    const dateStyle = this.projectSummaryDateAlertStyle(header, cellValue);

    return dateStyle || {};
  }

  private projectSummaryDateAlertStyle(header: string, value: string): DisplayCellStyle | null {
    const dateHeaders = new Set(['报价日期', '合同日期', '发票日期', '开始日期', '交付日期', '到期日']);
    if (!dateHeaders.has(header)) {
      return null;
    }

    const date = this.parseDate(value);
    if (!date) {
      return null;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 7) {
      return {
        color: '#b91c1c',
        'background-color': '#fee2e2',
        'font-weight': '700'
      };
    }

    return null;
  }

  private parseDate(value?: string) {
    if (!value || !value.trim()) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private isSignedMsaStatus(value: string) {
    const status = this.normalizeStatus(value);
    return status.includes('signed') || status.includes('已签');
  }

  private isPendingMsaStatus(value: string) {
    const status = this.normalizeStatus(value);
    return status.includes('pending') || status.includes('review') || status.includes('未开始') || status.includes('处理中');
  }

  private isCompletedStatus(value: string) {
    const status = this.normalizeStatus(value);
    return status.includes('completed') || status.includes('已完成');
  }

  private isInProgressCompletionStatus(value: string) {
    const status = this.normalizeStatus(value);
    return status.includes('进行中') || status.includes('in progress') || status.includes('处理中');
  }

  private companyNameForId(companyId: string) {
    const currentSession = this.session();
    return currentSession?.companies.find((company) => company.id === companyId)?.name || '';
  }

  private fieldLabel(field: EditableProjectField) {
    const labels: Record<EditableProjectField, string> = {
      clientCompany: '客户公司',
      quoNumber: 'QUO 编号',
      quoStatus: 'QUO 状态',
      msaNumber: 'MSA 编号',
      msaStatus: 'MSA 状态',
      date: '日期',
      amountGbp: '金额 (GBP)',
      relatedInvoice: '关联发票',
      deliverables: '交付内容',
      engagementType: 'one-off/ Phase-based',
      startDate: '开始日期',
      deliveryDate: '交付日期',
      completionStatus: 'one-off 完成状态',
      msaSigner: '跟进人（MSA签署人）',
      note: '备注'
    };

    return labels[field];
  }

  private loadDriveFiles() {
    const currentSession = this.session();
    if (!currentSession) {
      this.driveFiles.set([]);
      this.driveError.set('');
      return;
    }

    this.driveLoading.set(true);
    this.driveError.set('');

    this.http
      .get<DriveFolderResponse>(
        `${this.apiBaseUrl}/api/drive/folder?companyId=${encodeURIComponent(currentSession.company.id)}`,
        this.authOptions()
      )
      .subscribe({
        next: (response) => {
          this.driveFiles.set(response.drive.files || []);
          this.driveLoading.set(false);
        },
        error: () => {
          this.driveFiles.set([]);
          this.driveLoading.set(false);
          this.driveError.set('Google Drive 文件读取失败，请确认 Java backend 正在运行。');
        }
      });
  }

  private createEmptyProjectForm(): NewProjectForm {
    return {
      clientCompany: '',
      quoNumber: '',
      quoStatus: '草稿',
      msaNumber: '',
      msaStatus: '未开始',
      date: '',
      amountGbp: '',
      relatedInvoice: '',
      deliverables: '',
      engagementType: 'one-off',
      startDate: '',
      deliveryDate: '',
      phase1Status: '待开始',
      phase2Status: '待开始',
      phase3Status: '待开始',
      msaSigner: '',
      note: '',
      completionStatus: '进行中'
    };
  }

  private createEmptyProjectSummaryForm(): NewProjectSummaryForm {
    const values: NewProjectSummaryForm = {};
    for (const header of this.projectSummaryColumns()) {
      values[header] = '';
    }
    return values;
  }

  projectSummaryColumns() {
    return this.projectSummaryHeaders().length > 0
      ? this.projectSummaryHeaders()
      : this.defaultDetailHeaders();
  }

  projectSummaryFieldRows() {
    return this.projectSummaryColumns().map((header) => ({
      header,
      isLongText: ['项目内容/服务名称', '项目描述', '匹配备注', '源文件', '项目/行项目说明', '匹配说明'].includes(header)
    }));
  }

  currentDetailSheetName() {
    return this.currentSection() === 'invoice-details' ? '发票明细' : '项目汇总';
  }

  currentDetailSectionLabel() {
    return this.currentSection() === 'invoice-details' ? '发票明细' : '项目汇总';
  }

  private defaultDetailHeaders() {
    return this.currentSection() === 'invoice-details'
      ? [...this.defaultInvoiceDetailsHeaders]
      : [...this.defaultProjectSummaryHeaders];
  }

  private projectSummaryDefaultColumnWidth(header: string) {
    if (header === '客户公司名' || header === '终端客户/服务对象') return 220;
    if (header === '项目ID' || header === '合同编号' || header === '发票编号') return 180;
    if (header === '报价单编号') return 200;
    if (header === '报价日期' || header === '合同日期' || header === '发票日期' || header === '到期日') return 130;
    if (header === '报价金额' || header === '合同金额' || header === '目标金额' || header === '发票张数' || header === '发票总金额' || header === '发票应付金额' || header === '未开票金额' || header === '小计' || header === 'VAT金额' || header === '应付金额') return 120;
    if (header === '状态') return 130;
    if (header === '项目内容/服务名称' || header === '项目描述' || header === '匹配备注' || header === '源文件' || header === '项目/行项目说明' || header === '匹配说明') return 360;
    if (header === '合作类型/期限') return 220;
    if (header === '负责人/联系人' || header === '服务方签署人' || header === '客户签署人') return 160;
    return 160;
  }

  private defaultProjectSummaryColumnWidths(headers: string[]) {
    return headers.map((header) => this.projectSummaryDefaultColumnWidth(header));
  }

  private projectSummaryColumnIndex(headerName: string) {
    return this.projectSummaryHeaders().findIndex((header) => header === headerName);
  }

  private projectSummaryFirstColumnIndex(headerNames: string[]) {
    for (const headerName of headerNames) {
      const index = this.projectSummaryColumnIndex(headerName);
      if (index >= 0) {
        return index;
      }
    }
    return -1;
  }

  private projectSummaryStatusColumnIndex() {
    return this.projectSummaryColumnIndex('状态');
  }

  private clearAllStoredProjectDataOnce() {
    if (localStorage.getItem(this.resetMarkerKey) === 'done') {
      return;
    }

    localStorage.setItem(this.resetMarkerKey, 'done');
  }

  private applyProjectSummaryResponse(response: Pick<ProjectSummaryResponse, 'headers' | 'rowIds' | 'rows'>) {
    const headers = response.headers?.length ? response.headers : this.defaultDetailHeaders();
    const rowIds = response.rowIds || [];
    this.projectSummaryHeaders.set(headers);
    this.projectSummaryColumnWidths.set(this.readProjectSummaryColumnWidths(this.currentDetailSheetName(), headers));
    this.projectSummaryRowHeights.set(this.readProjectSummaryRowHeights(this.currentDetailSheetName(), rowIds));
    this.projectSummaryRowIds.set(rowIds);
    this.projectSummaryRowsData.set(response.rows || []);
    this.currentSummaryPage.set(1);
  }

  private projectSummaryCacheEntryKey(companyId: string, sheetName: string) {
    return `${companyId}::${sheetName}`;
  }

  private readProjectSummaryCache(companyId: string, sheetName: string) {
    const raw = localStorage.getItem(this.projectSummaryCacheKey);
    if (!raw) {
      return null;
    }

    try {
      const cache = JSON.parse(raw) as Record<string, CachedProjectSummary>;
      const entry = cache[this.projectSummaryCacheEntryKey(companyId, sheetName)];
      if (!entry) {
        return null;
      }

      return {
        headers: Array.isArray(entry.headers) ? entry.headers : [],
        rowIds: Array.isArray(entry.rowIds) ? entry.rowIds : [],
        rows: Array.isArray(entry.rows) ? entry.rows : []
      } satisfies ProjectSummaryResponse;
    } catch {
      localStorage.removeItem(this.projectSummaryCacheKey);
      return null;
    }
  }

  private writeProjectSummaryCache(companyId: string, sheetName: string, response: Pick<ProjectSummaryResponse, 'headers' | 'rowIds' | 'rows'>) {
    let cache: Record<string, CachedProjectSummary> = {};
    const raw = localStorage.getItem(this.projectSummaryCacheKey);

    if (raw) {
      try {
        cache = JSON.parse(raw) as Record<string, CachedProjectSummary>;
      } catch {
        cache = {};
      }
    }

    cache[this.projectSummaryCacheEntryKey(companyId, sheetName)] = {
      headers: response.headers?.length ? response.headers : this.defaultDetailHeaders(),
      rowIds: response.rowIds || [],
      rows: response.rows || [],
      cachedAt: new Date().toISOString()
    };

    localStorage.setItem(this.projectSummaryCacheKey, JSON.stringify(cache));
  }

  private projectSummaryColumnWidthCacheEntryKey(companyId: string, sheetName: string) {
    return `${companyId}::${sheetName}`;
  }

  private readProjectSummaryColumnWidths(sheetName: string, headers: string[]) {
    const currentSession = this.session();
    if (!currentSession) {
      return this.defaultProjectSummaryColumnWidths(headers);
    }

    const raw = localStorage.getItem(this.projectSummaryColumnWidthCacheKey);
    if (!raw) {
      return this.defaultProjectSummaryColumnWidths(headers);
    }

    try {
      const cache = JSON.parse(raw) as Record<string, number[]>;
      const entry = cache[this.projectSummaryColumnWidthCacheEntryKey(currentSession.company.id, sheetName)];
      if (!Array.isArray(entry) || entry.length !== headers.length) {
        return this.defaultProjectSummaryColumnWidths(headers);
      }
      return entry.map((value, index) => Math.max(80, Number(value) || this.projectSummaryDefaultColumnWidth(headers[index] || '')));
    } catch {
      localStorage.removeItem(this.projectSummaryColumnWidthCacheKey);
      return this.defaultProjectSummaryColumnWidths(headers);
    }
  }

  private persistProjectSummaryColumnWidths() {
    const currentSession = this.session();
    if (!currentSession || !this.projectSummaryHeaders().length) {
      return;
    }

    let cache: Record<string, number[]> = {};
    const raw = localStorage.getItem(this.projectSummaryColumnWidthCacheKey);
    if (raw) {
      try {
        cache = JSON.parse(raw) as Record<string, number[]>;
      } catch {
        cache = {};
      }
    }

    cache[this.projectSummaryColumnWidthCacheEntryKey(currentSession.company.id, this.currentDetailSheetName())] = this.projectSummaryColumnWidths();
    localStorage.setItem(this.projectSummaryColumnWidthCacheKey, JSON.stringify(cache));
  }

  private projectSummaryRowHeightCacheEntryKey(companyId: string, sheetName: string) {
    return `${companyId}::${sheetName}`;
  }

  private readProjectSummaryRowHeights(sheetName: string, rowIds: string[]) {
    const currentSession = this.session();
    if (!currentSession || !rowIds.length) {
      return {};
    }

    const raw = localStorage.getItem(this.projectSummaryRowHeightCacheKey);
    if (!raw) {
      return {};
    }

    try {
      const cache = JSON.parse(raw) as Record<string, Record<string, number>>;
      const entry = cache[this.projectSummaryRowHeightCacheEntryKey(currentSession.company.id, sheetName)];
      if (!entry || typeof entry !== 'object') {
        return {};
      }

      const next: Record<string, number> = {};
      for (const rowId of rowIds) {
        const height = Number(entry[rowId]);
        if (!Number.isNaN(height) && height >= 36) {
          next[rowId] = height;
        }
      }
      return next;
    } catch {
      localStorage.removeItem(this.projectSummaryRowHeightCacheKey);
      return {};
    }
  }

  private persistProjectSummaryRowHeights() {
    const currentSession = this.session();
    if (!currentSession || !this.projectSummaryRowIds().length) {
      return;
    }

    let cache: Record<string, Record<string, number>> = {};
    const raw = localStorage.getItem(this.projectSummaryRowHeightCacheKey);
    if (raw) {
      try {
        cache = JSON.parse(raw) as Record<string, Record<string, number>>;
      } catch {
        cache = {};
      }
    }

    cache[this.projectSummaryRowHeightCacheEntryKey(currentSession.company.id, this.currentDetailSheetName())] = this.projectSummaryRowHeights();
    localStorage.setItem(this.projectSummaryRowHeightCacheKey, JSON.stringify(cache));
  }

  private readDashboardCache(companyId: string) {
    const raw = localStorage.getItem(this.dashboardCacheKey);
    if (!raw) {
      return null;
    }

    try {
      const cache = JSON.parse(raw) as Record<string, CachedDashboardData>;
      return cache[companyId] || null;
    } catch {
      localStorage.removeItem(this.dashboardCacheKey);
      return null;
    }
  }

  private writeDashboardCache(
    companyId: string,
    payload: Omit<CachedDashboardData, 'cachedAt'>
  ) {
    let cache: Record<string, CachedDashboardData> = {};
    const raw = localStorage.getItem(this.dashboardCacheKey);
    if (raw) {
      try {
        cache = JSON.parse(raw) as Record<string, CachedDashboardData>;
      } catch {
        cache = {};
      }
    }

    cache[companyId] = {
      ...payload,
      cachedAt: new Date().toISOString()
    };
    localStorage.setItem(this.dashboardCacheKey, JSON.stringify(cache));
  }

  private applyDashboardCache(company: Company, cached: CachedDashboardData) {
    this.dashboardSummaryHeaders.set(cached.summaryHeaders || []);
    this.dashboardSummaryRows.set(cached.summaryRows || []);
    this.dashboardInvoiceHeaders.set(cached.invoiceHeaders || []);
    this.dashboardInvoiceRows.set(cached.invoiceRows || []);
    this.dashboardRows.set(this.buildDashboardRowsFromSheets({
      headers: cached.summaryHeaders || [],
      rowIds: [],
      rows: cached.summaryRows || []
    }, {
      headers: cached.invoiceHeaders || [],
      rowIds: [],
      rows: cached.invoiceRows || []
    }, company));
  }

  private persistCurrentProjectSummaryCache() {
    const currentSession = this.session();
    if (!currentSession) {
      return;
    }

    this.writeProjectSummaryCache(currentSession.company.id, this.currentDetailSheetName(), {
      headers: this.projectSummaryHeaders(),
      rowIds: this.projectSummaryRowIds(),
      rows: this.projectSummaryRowsData()
    });
  }

  private restoreSession() {
    this.http.get<SessionResponse>(`${this.apiBaseUrl}/api/auth/me`, this.authOptions()).subscribe({
      next: (response) => {
        this.setAuthenticatedSession(response);
        this.restoringSession.set(false);
        this.loadDashboardData();
        this.loadProjects();
        this.loadProjectSummary();
        this.loadDriveFiles();
      },
      error: () => {
        this.restoringSession.set(false);
        this.clearAuthState();
      }
    });
  }

  private setAuthenticatedSession(session: SessionResponse) {
    this.session.set(session);
    this.selectedCompanyId.set(session.company.id);
    this.currentProjectPage.set(1);
    this.currentDrivePage.set(1);
    this.error.set('');
  }

  private clearAuthState() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.projectSummaryCacheKey);
    localStorage.removeItem(this.projectSummaryColumnWidthCacheKey);
    localStorage.removeItem(this.projectSummaryRowHeightCacheKey);
    localStorage.removeItem(this.dashboardCacheKey);
    this.authToken.set('');
    this.restoringSession.set(false);
    this.session.set(null);
    this.selectedCompanyId.set('');
    this.dashboardRows.set([]);
    this.dashboardSummaryHeaders.set([]);
    this.dashboardSummaryRows.set([]);
    this.dashboardInvoiceHeaders.set([]);
    this.dashboardInvoiceRows.set([]);
    this.dashboardError.set('');
    this.projects.set([]);
    this.projectSummaryHeaders.set([]);
    this.projectSummaryRowsData.set([]);
    this.projectSummaryError.set('');
    this.driveFiles.set([]);
    this.driveError.set('');
    this.error.set('');
  }

  private authOptions() {
    const token = this.authToken();
    return token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};
  }

}
