import { 
  Package, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  BarChart3, 
  Settings, 
  Truck
} from 'lucide-react';

// --- Data Types based on Domain Entities ---

export type Category = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  baseUnitPrice: number;
  status: 'active' | 'inactive';
};

export type StockBatch = {
  id: string;
  productId: string;
  batchLabel: string;
  unitPriceCost: number;
  quantity: number;
  entryDate: string;
};

export type Provider = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
};

export type PurchaseOrder = {
  id: string;
  providerId: string;
  managerId: string;
  initiationDate: string;
  finalizationDate?: string;
  totalAmount: number;
  paymentStatus: boolean;
  status: 'draft' | 'pending' | 'completed' | 'cancelled';
};

export type Sale = {
  id: string;
  customerId: string;
  managerId: string;
  initiationDate: string;
  totalAmount: number;
  amountPaid: number;
  status: 'draft' | 'pending' | 'completed';
};

export type Payment = {
  id: string;
  referenceId: string; // Sale ID or PO ID
  referenceType: 'sale' | 'purchase_order';
  date: string;
  amount: number;
  managerId: string;
  status: 'completed' | 'pending';
};

// --- Navigation ---

export type ViewState = 'dashboard' | 'inventory' | 'partners' | 'procurement' | 'sales' | 'finance' | 'admin';

export const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'partners', label: 'Partners', icon: Users },
  { id: 'procurement', label: 'Procurement', icon: Truck },
  { id: 'sales', label: 'Sales', icon: ShoppingCart },
  { id: 'finance', label: 'Finance', icon: CreditCard },
  { id: 'admin', label: 'Admin', icon: Settings },
];
