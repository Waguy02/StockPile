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

export type OrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type PurchaseOrder = {
  id: string;
  providerId: string;
  managerId: string;
  initiationDate: string;
  finalizationDate?: string;
  totalAmount: number;
  paymentStatus: boolean;
  notes?: string;
  items?: OrderItem[];
  status: 'draft' | 'pending' | 'completed' | 'cancelled';
};

export type Sale = {
  id: string;
  customerId: string;
  managerId: string;
  initiationDate: string;
  totalAmount: number;
  amountPaid: number;
  notes?: string;
  items?: OrderItem[];
  status: 'draft' | 'pending' | 'completed' | 'cancelled'; // Consistency with PO for cancelled
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
  { id: 'dashboard', label: 'nav.dashboard', icon: BarChart3 },
  { id: 'inventory', label: 'nav.inventory', icon: Package },
  { id: 'partners', label: 'nav.partners', icon: Users },
  { id: 'procurement', label: 'nav.procurement', icon: Truck },
  { id: 'sales', label: 'nav.sales', icon: ShoppingCart },
  { id: 'finance', label: 'nav.finance', icon: CreditCard },
  { id: 'admin', label: 'nav.admin', icon: Settings },
];
