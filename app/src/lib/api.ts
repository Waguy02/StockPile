import { projectId, publicAnonKey } from '../utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-7e8df46b`;

// Helper to handle IDs that may contain special characters like '#' which usually get stripped 
// by proxies/gateways if only single-encoded.
const encodeId = (id: string) => encodeURIComponent(encodeURIComponent(id));

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
    let errorMsg = response.statusText;
    try {
        const errorBody = await response.text();
        // Try to parse JSON if possible for cleaner message
        try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.message) errorMsg = errorJson.message;
            else if (errorJson.error) errorMsg = errorJson.error;
            else errorMsg = `${errorMsg} - ${errorBody.slice(0, 100)}`;
        } catch {
             errorMsg = `${errorMsg} - ${errorBody.slice(0, 100)}`;
        }
    } catch (e) {
        // failed to read body
    }
    throw new Error(`API Error: ${response.status} ${errorMsg}`);
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
  updateProduct: (id: string, data: any) => fetchWithAuth(`/inventory/product/${encodeId(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => fetchWithAuth(`/inventory/product/${encodeId(id)}`, { method: 'DELETE' }),
  createCategory: (data: any) => fetchWithAuth('/inventory/category', { method: 'POST', body: JSON.stringify(data) }),
  createBatch: (data: any) => fetchWithAuth('/inventory/batch', { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id: string, data: any) => fetchWithAuth(`/inventory/batch/${encodeId(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBatch: (id: string) => fetchWithAuth(`/inventory/batch/${encodeId(id)}`, { method: 'DELETE' }),
  createSale: (data: any) => fetchWithAuth('/sales', { method: 'POST', body: JSON.stringify(data) }),
  updateSale: (id: string, data: any) => fetchWithAuth(`/sales/${encodeId(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSale: (id: string) => fetchWithAuth(`/sales/${encodeId(id)}`, { method: 'DELETE' }),
  createProvider: (data: any) => fetchWithAuth('/partners/provider', { method: 'POST', body: JSON.stringify(data) }),
  updateProvider: (id: string, data: any) => fetchWithAuth(`/partners/provider/${encodeId(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProvider: (id: string) => fetchWithAuth(`/partners/provider/${encodeId(id)}`, { method: 'DELETE' }),
  createCustomer: (data: any) => fetchWithAuth('/partners/customer', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) => fetchWithAuth(`/partners/customer/${encodeId(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => fetchWithAuth(`/partners/customer/${encodeId(id)}`, { method: 'DELETE' }),
  createPO: (data: any) => fetchWithAuth('/procurement', { method: 'POST', body: JSON.stringify(data) }),
  updatePO: (id: string, data: any) => fetchWithAuth(`/procurement`, { method: 'POST', body: JSON.stringify({ ...data, id }) }),
  deletePO: (id: string) => fetchWithAuth(`/procurement/${encodeId(id)}`, { method: 'DELETE' }),
  createPayment: (data: any) => fetchWithAuth('/finance', { method: 'POST', body: JSON.stringify(data) }),
  updatePayment: (id: string, data: any) => fetchWithAuth(`/finance/${encodeId(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePayment: (id: string) => fetchWithAuth(`/finance/${encodeId(id)}`, { method: 'DELETE' }),
};
