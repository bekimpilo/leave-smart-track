// Travel & Expense API service layer
import { apiConfig, makeApiRequest } from '@/config/apiConfig';

const API = apiConfig.baseURL;

// ============= Types =============
export type TravelRole = 'employee' | 'manager' | 'office_coordinator' | 'finance_admin' | 'admin';
export type TravelStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'in_progress' | 'booked' | 'per_diem_paid' | 'completed';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'paid';

export interface PerDiemRate {
  id: number;
  region: string;
  meal_type: 'Full Day' | 'Half Day';
  amount: number;
  currency: string;
  is_active: boolean;
}

export interface ProjectId {
  id: number;
  project_code: string;
  description?: string;
  is_active: boolean;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface TravelRequestRow {
  id: number;
  requester_email: string;
  requester_name: string;
  status: TravelStatus;
  place_to_be_visited: string;
  purpose_of_travel: string;
  total_zar: number;
  manager_email?: string;
  created_at: string;
  date_amount_required?: string;
}

export interface ExpenseClaimRow {
  id: number;
  requester_email: string;
  requester_name: string;
  purpose: 'reimbursement' | 'advance_acquittal';
  status: ExpenseStatus;
  total_amount: number;
  manager_email?: string;
  created_at: string;
}

// ============= Helpers =============
const getJSON = async (path: string) => {
  const r = await makeApiRequest(`${API}${path}`);
  return r.json();
};
const postJSON = async (path: string, body?: any) => {
  const r = await makeApiRequest(`${API}${path}`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
};
const putJSON = async (path: string, body?: any) => {
  const r = await makeApiRequest(`${API}${path}`, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
};
const del = async (path: string) => {
  const r = await makeApiRequest(`${API}${path}`, { method: 'DELETE' });
  return r.json();
};

const uploadCsv = async (path: string, file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  const r = await makeApiRequest(`${API}${path}`, { method: 'POST', body: fd });
  return r.json();
};

// ============= Travel Role =============
export const travelService = {
  // role
  getMyTravelRole: () => getJSON('/api/travel-config/me'),
  getUsersTravelRoles: () => getJSON('/api/travel-config/users-travel-roles'),
  setUserTravelRole: (id: number, travel_role: TravelRole) =>
    putJSON(`/api/travel-config/users-travel-roles/${id}`, { travel_role }),

  // per diem
  listPerDiem: () => getJSON('/api/travel-config/per-diem-rates'),
  upsertPerDiem: (r: Partial<PerDiemRate>) => postJSON('/api/travel-config/per-diem-rates', r),
  deletePerDiem: (id: number) => del(`/api/travel-config/per-diem-rates/${id}`),
  uploadPerDiemCsv: (f: File) => uploadCsv('/api/travel-config/per-diem-rates/upload', f),

  // project ids
  listProjectIds: () => getJSON('/api/travel-config/project-ids'),
  upsertProjectId: (p: Partial<ProjectId>) => postJSON('/api/travel-config/project-ids', p),
  deleteProjectId: (id: number) => del(`/api/travel-config/project-ids/${id}`),
  uploadProjectIdsCsv: (f: File) => uploadCsv('/api/travel-config/project-ids/upload', f),

  // expense categories
  listCategories: () => getJSON('/api/travel-config/expense-categories'),
  upsertCategory: (c: Partial<ExpenseCategory>) => postJSON('/api/travel-config/expense-categories', c),
  deleteCategory: (id: number) => del(`/api/travel-config/expense-categories/${id}`),
  uploadCategoriesCsv: (f: File) => uploadCsv('/api/travel-config/expense-categories/upload', f),

  // travel requests
  listTravelRequests: () => getJSON('/api/travel'),
  getTravelRequest: (id: number) => getJSON(`/api/travel/${id}`),
  createTravelRequest: (body: any) => postJSON('/api/travel', body),
  decideTravelRequest: (id: number, decision: 'approve' | 'reject', comment?: string) =>
    postJSON(`/api/travel/${id}/decision`, { decision, comment }),
  cancelTravelRequest: (id: number) => postJSON(`/api/travel/${id}/cancel`),
  setCoordinatorStatus: (id: number, status: 'in_progress' | 'booked') =>
    postJSON(`/api/travel/${id}/coordinator-status`, { status }),
  setFinanceStatus: (id: number, status: 'per_diem_paid' | 'completed') =>
    postJSON(`/api/travel/${id}/finance-status`, { status }),

  // expense claims
  listExpenseClaims: () => getJSON('/api/expense-claims'),
  getExpenseClaim: (id: number) => getJSON(`/api/expense-claims/${id}`),
  createExpenseClaim: (body: any) => postJSON('/api/expense-claims', body),
  decideExpenseClaim: (id: number, decision: 'approve' | 'reject', comment?: string) =>
    postJSON(`/api/expense-claims/${id}/decision`, { decision, comment }),
  markExpensePaid: (id: number) => postJSON(`/api/expense-claims/${id}/mark-paid`),
  cancelExpenseClaim: (id: number) => postJSON(`/api/expense-claims/${id}/cancel`),
};
