import { projectId, publicAnonKey } from '../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-7e8df46b`;

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  seed: () => fetchWithAuth('/seed', { method: 'POST' }),
  
  getInventory: () => fetchWithAuth('/inventory'),
  getPartners: () => fetchWithAuth('/partners'),
  getSales: () => fetchWithAuth('/sales'),
  getProcurement: () => fetchWithAuth('/procurement'),
  getFinance: () => fetchWithAuth('/finance'),
  getAdmin: () => fetchWithAuth('/admin'),
  getAllData: () => fetchWithAuth('/dashboard'), // Returns aggregate of everything

  createProduct: (data: any) => fetchWithAuth('/inventory/product', { method: 'POST', body: JSON.stringify(data) }),
  createCategory: (data: any) => fetchWithAuth('/inventory/category', { method: 'POST', body: JSON.stringify(data) }),
  createBatch: (data: any) => fetchWithAuth('/inventory/batch', { method: 'POST', body: JSON.stringify(data) }),
  createSale: (data: any) => fetchWithAuth('/sales', { method: 'POST', body: JSON.stringify(data) }),
  createPO: (data: any) => fetchWithAuth('/procurement', { method: 'POST', body: JSON.stringify(data) }),
};
