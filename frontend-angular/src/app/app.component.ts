import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'venus-crm-angular-auth';
  private readonly resetMarkerKey = 'venus-crm-data-reset-v1';
  private readonly pageSize = 15;
  private readonly apiBaseUrl = this.resolveApiBaseUrl();

  email = signal('admin-crm@venuslondontechnology.co.uk');
  password = signal('testtest123');
  error = signal('');
  submitting = signal(false);
  session = signal<SessionResponse | null>(null);
  selectedCompanyId = signal('');
  currentSection = signal<'dashboard' | 'projects' | 'drive'>('dashboard');
  statusFilter = signal('筛选');
  searchTerm = signal('');
  sortDirection = signal<'asc' | 'desc'>('asc');
  projectViewMode = signal<'table' | 'grid'>('table');
  showProjectSearch = signal(false);
  showProjectFilter = signal(false);
  currentProjectPage = signal(1);
  currentDrivePage = signal(1);
  projects = signal<ProjectRow[]>([]);
  projectsLoading = signal(false);
  syncingProjects = signal(false);
  syncError = signal('');
  dashboardRows = signal<ProjectRow[]>([]);
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
  newProject: NewProjectForm = this.createEmptyProjectForm();
  selectedPhaseProject = signal<ProjectRow | null>(null);
  editingCell = signal<{ rowId: number; field: EditableProjectField } | null>(null);
  editingValue = signal('');
  selectedCell = signal<{ rowId: number; field: EditableProjectField } | null>(null);
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
          this.loadDashboardData();
          this.loadProjects();
          this.loadDriveFiles();
        },
        error: () => {
          this.submitting.set(false);
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

  dashboardCompletedCount() {
    return this.dashboardRows().filter((row) => {
      const status = this.normalizeStatus(row.completionStatus);
      return status.includes('completed') || status.includes('已完成');
    }).length;
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

  private loadDashboardData() {
    const currentSession = this.session();
    if (!currentSession) {
      this.dashboardRows.set([]);
      this.dashboardError.set('');
      return;
    }

    this.dashboardLoading.set(true);
    this.dashboardError.set('');

    this.http
      .get<ProjectRow[]>(
        `${this.apiBaseUrl}/api/project-rows?companyId=${encodeURIComponent(currentSession.company.id)}`,
        this.authOptions()
      )
      .subscribe({
        next: (rows) => {
          this.dashboardRows.set(
            (rows || []).map((row) => ({
              ...this.hydrateProjectRow(row),
              company: row.company || currentSession.company.name,
              companyId: row.companyId || currentSession.company.id
            }))
          );
          this.dashboardLoading.set(false);
        },
        error: () => {
          this.dashboardRows.set([]);
          this.dashboardLoading.set(false);
          this.dashboardError.set('Dashboard 数据读取失败，请确认数据库与 Java backend 正在运行。');
        }
      });
  }

  private parseAmount(value: string) {
    return Number.parseFloat((value || '').replace(/,/g, '').trim()) || 0;
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

  private clearAllStoredProjectDataOnce() {
    if (localStorage.getItem(this.resetMarkerKey) === 'done') {
      return;
    }

    localStorage.setItem(this.resetMarkerKey, 'done');
  }

  private restoreSession() {
    this.http.get<SessionResponse>(`${this.apiBaseUrl}/api/auth/me`, this.authOptions()).subscribe({
      next: (response) => {
        this.setAuthenticatedSession(response);
        this.loadDashboardData();
        this.loadProjects();
        this.loadDriveFiles();
      },
      error: () => {
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
    this.authToken.set('');
    this.session.set(null);
    this.selectedCompanyId.set('');
    this.dashboardRows.set([]);
    this.dashboardError.set('');
    this.projects.set([]);
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
