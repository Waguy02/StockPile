import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";

export const categories = [
  { id: 'c1', name: 'Electronics', description: 'Gadgets and devices', status: 'active' },
  { id: 'c2', name: 'Furniture', description: 'Office and home furniture', status: 'active' },
  { id: 'c3', name: 'Stationery', description: 'Office supplies', status: 'active' },
];

export const products = [
  { id: 'p1', categoryId: 'c1', name: 'Laptop Pro X', description: 'High performance laptop', baseUnitPrice: 1200, status: 'active' },
  { id: 'p2', categoryId: 'c1', name: 'Wireless Mouse', description: 'Ergonomic mouse', baseUnitPrice: 25, status: 'active' },
  { id: 'p3', categoryId: 'c2', name: 'Office Chair', description: 'Mesh back support', baseUnitPrice: 150, status: 'active' },
  { id: 'p4', categoryId: 'c3', name: 'Premium Notebook', description: 'Hardcover 200 pages', baseUnitPrice: 12, status: 'active' },
];

export const stockBatches = [
  { id: 'sb1', productId: 'p1', batchLabel: 'BATCH-2023-001', unitPriceCost: 900, quantity: 15, entryDate: '2023-10-15' },
  { id: 'sb2', productId: 'p1', batchLabel: 'BATCH-2024-001', unitPriceCost: 950, quantity: 20, entryDate: '2024-01-10' },
  { id: 'sb3', productId: 'p2', batchLabel: 'BATCH-ACC-001', unitPriceCost: 10, quantity: 100, entryDate: '2023-11-20' },
  { id: 'sb4', productId: 'p3', batchLabel: 'BATCH-FURN-002', unitPriceCost: 80, quantity: 5, entryDate: '2023-12-05' },
];

export const providers = [
  { id: 'pr1', name: 'TechGlobal Supply', status: 'active' },
  { id: 'pr2', name: 'Office Depot Inc', status: 'active' },
  { id: 'pr3', name: 'Stationery World', status: 'active' },
];

export const customers = [
  { id: 'cust1', name: 'Acme Corp', email: 'contact@acme.com', status: 'active' },
  { id: 'cust2', name: 'Globex Industries', email: 'procurement@globex.com', status: 'active' },
  { id: 'cust3', name: 'John Doe', email: 'john@example.com', status: 'active' },
];

export const purchaseOrders = [
  { id: 'po1', providerId: 'pr1', managerId: 'm1', initiationDate: '2024-01-15', finalizationDate: '2024-01-20', totalAmount: 19000, paymentStatus: true, status: 'completed' },
  { id: 'po2', providerId: 'pr2', managerId: 'm1', initiationDate: '2024-02-01', totalAmount: 4000, paymentStatus: false, status: 'pending' },
];

export const sales = [
  { id: 's1', customerId: 'cust1', managerId: 'm1', initiationDate: '2024-02-10', totalAmount: 2400, amountPaid: 2400, status: 'completed' },
  { id: 's2', customerId: 'cust2', managerId: 'm1', initiationDate: '2024-02-12', totalAmount: 6000, amountPaid: 3000, status: 'pending' },
  { id: 's3', customerId: 'cust3', managerId: 'm2', initiationDate: '2024-02-14', totalAmount: 50, amountPaid: 0, status: 'draft' },
];

export const payments = [
  { id: 'pay1', referenceId: 'po1', referenceType: 'purchase_order', date: '2024-01-20', amount: 19000, managerId: 'm1', status: 'completed' },
  { id: 'pay2', referenceId: 's1', referenceType: 'sale', date: '2024-02-10', amount: 2400, managerId: 'm1', status: 'completed' },
  { id: 'pay3', referenceId: 's2', referenceType: 'sale', date: '2024-02-12', amount: 3000, managerId: 'm1', status: 'completed' },
];

const DEFAULT_PASSWORD = '12345678';

export const seedUsers = [
  { seedId: 'm1', name: 'Manager', email: 'manager@example.com', role: 'manager' as const },
  { seedId: 'm2', name: 'Staff', email: 'staff@example.com', role: 'staff' as const },
];

export async function seedDatabase() {
  // Clear existing data. User list is only in Supabase Auth — clear any legacy manager:* keys from kv_store.
  const prefixes = ['category:', 'product:', 'batch:', 'provider:', 'customer:', 'po:', 'sale:', 'payment:', 'manager:'];
  for (const prefix of prefixes) {
    await kv.deleteByPrefix(prefix);
  }

  // Seed Auth Users
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const managerIdMap = new Map<string, string>();

  if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      console.log("Seeding Auth Users...");
      
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const usersByEmail = new Map(
        (users || []).filter(u => u.email).map(u => [u.email as string, u])
      );

      for (const user of seedUsers) {
          const existing = usersByEmail.get(user.email);
          if (existing?.id) {
              managerIdMap.set(user.seedId, existing.id);
              const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
                  user_metadata: { name: user.name, role: user.role }
              });
              if (updateError) {
                  console.error(`Failed to update user ${user.email}:`, updateError.message);
              } else {
                  console.log(`Updated user ${user.email}`);
              }
              continue;
          }

          const { data: { user: createdUser }, error } = await supabase.auth.admin.createUser({
              email: user.email,
              password: DEFAULT_PASSWORD,
              email_confirm: true,
              user_metadata: { name: user.name, role: user.role }
          });
          if (error) {
              console.error(`Failed to create user ${user.email}:`, error.message);
              continue;
          }
          if (createdUser?.id) {
              managerIdMap.set(user.seedId, createdUser.id);
              console.log(`Created user ${user.email}`);
          }
      }
  }

  const data: Record<string, any> = {};
  const resolveManagerId = (seedId: string) => managerIdMap.get(seedId) || seedId;

  categories.forEach(c => data[`category:${c.id}`] = c);
  products.forEach(p => data[`product:${p.id}`] = p);
  stockBatches.forEach(b => data[`batch:${b.id}`] = b);
  providers.forEach(p => data[`provider:${p.id}`] = p);
  customers.forEach(c => data[`customer:${c.id}`] = c);
  purchaseOrders.forEach(po => data[`po:${po.id}`] = { ...po, managerId: resolveManagerId(po.managerId) });
  sales.forEach(s => data[`sale:${s.id}`] = { ...s, managerId: resolveManagerId(s.managerId) });
  payments.forEach(p => data[`payment:${p.id}`] = { ...p, managerId: resolveManagerId(p.managerId) });
  // User list is only in Supabase Auth — nothing is written to kv_store for users.

  // Set a flag to indicate seeding is done
  data['system:seeded'] = true;

  const keys = Object.keys(data);
  const values = Object.values(data);
  await kv.mset(keys, values);
  return { success: true, count: keys.length };
}
