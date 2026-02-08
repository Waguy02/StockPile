import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { seedDatabase } from "./seed.ts";

// Create a main app that handles routes without the function name prefix
const mainApp = new Hono();

// Enable logger
mainApp.use('*', logger(console.log));

// Enable CORS
mainApp.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check
mainApp.get(`/health`, (c) => c.json({ status: "ok" }));

// Seed endpoint
mainApp.post(`/seed`, async (c) => {
  const force = c.req.query('force') === 'true';
  const isSeeded = await kv.get('system:seeded');
  if (isSeeded && !force) {
    return c.json({ message: "Already seeded" });
  }
  const result = await seedDatabase();
  return c.json(result);
});

// Generic getter for prefixes
const getByPrefix = async (prefix: string) => {
  return await kv.getByPrefix(prefix);
};

/** Generate an 8-character hexadecimal ID for display (e.g. commande #A1B2C3D4). */
const generateShortId = () => {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
};

/** Normalize date to full ISO string (precision to the second) for correct sorting. */
const toISOSecond = (value: string | undefined): string => {
  if (!value || typeof value !== "string") return new Date().toISOString();
  const s = value.trim();
  if (s.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s + "T00:00:00.000Z";
  if (s.length >= 19) {
    const base = s.slice(0, 19);
    return s.includes("Z") ? s.slice(0, 24) : base + ".000Z";
  }
  return new Date(s).toISOString();
};

/** Create a transaction line (payment) when amount paid is set or increased. */
const createPaymentLine = async (
  referenceId: string,
  referenceType: "sale" | "purchase_order",
  amount: number,
  managerId: string
) => {
  if (amount <= 0) return;
  const id = crypto.randomUUID();
  const date = new Date().toISOString();
  const payment = {
    id,
    referenceId,
    referenceType,
    date,
    amount,
    managerId: managerId || "",
    status: "completed" as const,
  };
  await kv.set(`payment:${id}`, payment);
};

/** Decrement stock for sale items (FIFO). Throws if insufficient stock. */
const decrementStockForSaleItems = async (items: { productId: string; quantity: number }[]) => {
  if (!items?.length) return;
  const byProduct = new Map<string, number>();
  for (const it of items) {
    if (!it.productId || it.quantity <= 0) continue;
    byProduct.set(it.productId, (byProduct.get(it.productId) ?? 0) + it.quantity);
  }
  const batches = await getByPrefix("batch:");
  for (const [productId, need] of byProduct) {
    const productBatches = batches
      .filter((b: any) => b.productId === productId)
      .sort((a: any, b: any) => (a.entryDate || "").localeCompare(b.entryDate || ""));
    let remaining = need;
    for (const batch of productBatches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantity, remaining);
      batch.quantity -= take;
      remaining -= take;
      if (batch.quantity <= 0) await kv.del(`batch:${batch.id}`);
      else await kv.set(`batch:${batch.id}`, batch);
    }
    if (remaining > 0) throw new Error(`Insufficient stock for product ${productId}`);
  }
};

const looksLikeUuid = (value: string) => value.includes('-') && value.length >= 32;

const resolveUserId = async (supabase: any, id: string, email?: string | null) => {
  if (looksLikeUuid(id)) {
    return id;
  }
  if (!email) {
    return null;
  }
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Failed to resolve user by email:", error);
    return null;
  }
  const match = users.find((user: any) => user.email?.toLowerCase() === email.toLowerCase());
  return match?.id || null;
};

// Require a valid manager JWT; returns the user or null (caller should return 403).
const getManagerFromRequest = async (c: any) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const jwt = authHeader.slice(7).trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return null;
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) return null;
  const role = user.user_metadata?.role;
  if (role !== "manager") return null;
  return user;
};

// Get current authenticated user from JWT (manager or staff). Used to set managerId on sales when client omits it.
const getCurrentUserFromRequest = async (c: any) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const jwt = authHeader.slice(7).trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) return null;
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) return null;
  return user;
};

// Inventory Routes
mainApp.get(`/inventory`, async (c) => {
  const [categories, products, batches] = await Promise.all([
    getByPrefix('category:'),
    getByPrefix('product:'),
    getByPrefix('batch:')
  ]);
  return c.json({ categories, products, batches });
});

mainApp.post(`/inventory/product`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const product = { ...body, id };
  await kv.set(`product:${id}`, product);
  return c.json(product);
});

mainApp.put(`/inventory/product/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const product = { ...body, id };
  await kv.set(`product:${id}`, product);
  return c.json(product);
});

mainApp.delete(`/inventory/product/:id`, async (c) => {
  const manager = await getManagerFromRequest(c);
  if (!manager) return c.json({ error: "Forbidden: manager role required" }, 403);
  const id = c.req.param("id");
  await kv.del(`product:${id}`);
  return c.json({ success: true });
});

mainApp.post(`/inventory/batch`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const batch = { ...body, id };
  if (batch.entryDate) batch.entryDate = toISOSecond(batch.entryDate);
  await kv.set(`batch:${id}`, batch);
  return c.json(batch);
});

mainApp.put(`/inventory/batch/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const batch = { ...body, id };
  if (batch.entryDate) batch.entryDate = toISOSecond(batch.entryDate);
  await kv.set(`batch:${id}`, batch);
  return c.json(batch);
});

mainApp.delete(`/inventory/batch/:id`, async (c) => {
  const manager = await getManagerFromRequest(c);
  if (!manager) return c.json({ error: "Forbidden: manager role required" }, 403);
  const id = c.req.param("id");
  await kv.del(`batch:${id}`);
  return c.json({ success: true });
});

mainApp.post(`/inventory/category`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const category = { ...body, id };
  await kv.set(`category:${id}`, category);
  return c.json(category);
});

// Partners Routes
mainApp.get(`/partners`, async (c) => {
  const [providers, customers] = await Promise.all([
    getByPrefix('provider:'),
    getByPrefix('customer:')
  ]);
  return c.json({ providers, customers });
});

mainApp.post(`/partners/provider`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const provider = { ...body, id };
  await kv.set(`provider:${id}`, provider);
  return c.json(provider);
});

mainApp.put(`/partners/provider/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const provider = { ...body, id };
  await kv.set(`provider:${id}`, provider);
  return c.json(provider);
});

mainApp.delete(`/partners/provider/:id`, async (c) => {
  const manager = await getManagerFromRequest(c);
  if (!manager) return c.json({ error: "Forbidden: manager role required" }, 403);
  const id = c.req.param("id");
  await kv.del(`provider:${id}`);
  return c.json({ success: true });
});

mainApp.post(`/partners/customer`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const customer = { ...body, id };
  await kv.set(`customer:${id}`, customer);
  return c.json(customer);
});

mainApp.put(`/partners/customer/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const customer = { ...body, id };
  await kv.set(`customer:${id}`, customer);
  return c.json(customer);
});

mainApp.delete(`/partners/customer/:id`, async (c) => {
  const manager = await getManagerFromRequest(c);
  if (!manager) return c.json({ error: "Forbidden: manager role required" }, 403);
  const id = c.req.param("id");
  await kv.del(`customer:${id}`);
  return c.json({ success: true });
});

// Sales Routes — staff only receive sales where they are the responsible
mainApp.get(`/sales`, async (c) => {
  const sales = await getByPrefix('sale:');
  const user = await getCurrentUserFromRequest(c);
  if (user?.user_metadata?.role === 'staff') {
    const filtered = sales.filter((s: any) => s.managerId === user.id);
    return c.json(filtered);
  }
  return c.json(sales);
});

mainApp.post(`/sales`, async (c) => {
  const body = await c.req.json();
  const id = body.id || generateShortId();
  const sale = { ...body, id };
  sale.initiationDate = toISOSecond(sale.initiationDate);
  if (!sale.managerId) {
    const user = await getCurrentUserFromRequest(c);
    if (user) sale.managerId = user.id;
  }
  if (sale.status === "completed") {
    const items = sale.items || [];
    try {
      await decrementStockForSaleItems(items);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Insufficient stock" }, 400);
    }
  }
  const initialPaid = Number(sale.amountPaid) || 0;
  if (initialPaid > 0) {
    await createPaymentLine(sale.id, "sale", initialPaid, sale.managerId || "");
  }
  await kv.set(`sale:${id}`, sale);
  return c.json(sale);
});

mainApp.put(`/sales/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = await kv.get(`sale:${id}`);
  const sale = { ...(existing || {}), ...body, id };
  // Le responsable d'une vente ne change jamais : conserver celui qui a créé la vente
  if (existing?.managerId) {
    sale.managerId = existing.managerId;
  } else if (!sale.managerId) {
    const user = await getCurrentUserFromRequest(c);
    sale.managerId = user?.id || "";
  }
  if (sale.status === "completed" && existing?.status !== "completed") {
    const items = sale.items || [];
    try {
      await decrementStockForSaleItems(items);
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Insufficient stock" }, 400);
    }
  }
  const oldPaid = Number(existing?.amountPaid) || 0;
  const newPaid = Number(sale.amountPaid) || 0;
  if (newPaid > oldPaid) {
    await createPaymentLine(sale.id, "sale", newPaid - oldPaid, sale.managerId || "");
  }
  sale.updatedAt = new Date().toISOString();
  if (sale.initiationDate && sale.initiationDate.length === 10) sale.initiationDate = toISOSecond(sale.initiationDate);
  await kv.set(`sale:${id}`, sale);
  return c.json(sale);
});

mainApp.delete(`/sales/:id`, async (c) => {
  const manager = await getManagerFromRequest(c);
  if (!manager) return c.json({ error: "Forbidden: manager role required" }, 403);
  const id = c.req.param("id");
  await kv.del(`sale:${id}`);
  return c.json({ success: true });
});

// Procurement Routes
mainApp.get(`/procurement`, async (c) => {
  const pos = await getByPrefix('po:');
  return c.json(pos);
});

mainApp.post(`/procurement`, async (c) => {
  const body = await c.req.json();
  const existing = body.id ? await kv.get(`po:${body.id}`) : null;
  const id = existing ? body.id : (body.id || generateShortId());
  const po = { ...body, id };
  if (po.initiationDate) po.initiationDate = toISOSecond(po.initiationDate);
  if (po.finalizationDate) po.finalizationDate = toISOSecond(po.finalizationDate);
  const oldPaid = Number(existing?.amountPaid) || 0;
  const newPaid = Number(po.amountPaid) || 0;
  const delta = newPaid - oldPaid;
  if (delta > 0) {
    await createPaymentLine(po.id, "purchase_order", delta, po.managerId || "");
  }
  await kv.set(`po:${id}`, po);
  return c.json(po);
});

mainApp.put(`/procurement/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const existing = await kv.get(`po:${id}`);
  const po = { ...(existing || {}), ...body, id };
  if (po.initiationDate) po.initiationDate = toISOSecond(po.initiationDate);
  if (po.finalizationDate) po.finalizationDate = toISOSecond(po.finalizationDate);
  const oldPaid = Number(existing?.amountPaid) || 0;
  const newPaid = Number(po.amountPaid) || 0;
  if (newPaid > oldPaid) {
    await createPaymentLine(po.id, "purchase_order", newPaid - oldPaid, po.managerId || "");
  }
  await kv.set(`po:${id}`, po);
  return c.json(po);
});

mainApp.delete(`/procurement/:id`, async (c) => {
  const manager = await getManagerFromRequest(c);
  if (!manager) return c.json({ error: "Forbidden: manager role required" }, 403);
  const id = c.req.param("id");
  await kv.del(`po:${id}`);
  return c.json({ success: true });
});

// Finance Routes
mainApp.get(`/finance`, async (c) => {
  const payments = await getByPrefix('payment:');
  return c.json(payments);
});

mainApp.post(`/finance`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const payment = { ...body, id };
  if (payment.date) payment.date = toISOSecond(payment.date);
  await kv.set(`payment:${id}`, payment);
  return c.json(payment);
});

mainApp.put(`/finance/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const payment = { ...body, id };
  if (payment.date) payment.date = toISOSecond(payment.date);
  await kv.set(`payment:${id}`, payment);
  return c.json(payment);
});

mainApp.delete(`/finance/:id`, async (c) => {
  const manager = await getManagerFromRequest(c);
  if (!manager) return c.json({ error: "Forbidden: manager role required" }, 403);
  const id = c.req.param("id");
  await kv.del(`payment:${id}`);
  return c.json({ success: true });
});

// Admin/Managers Routes - RELYING ON SUPABASE AUTH (manager-only)
mainApp.get(`/admin`, async (c) => {
  const manager = await getManagerFromRequest(c);
  if (!manager) {
    return c.json({ error: "Forbidden: manager role required" }, 403);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return c.json([]);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    console.error("Failed to list users:", error);
    return c.json([]);
  }

  const list = (users || []).map((user: any) => ({
    id: user.id,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
    email: user.email || '',
    role: user.user_metadata?.role || 'staff',
    status: user.banned_until ? 'inactive' : 'active',
    lastActive: user.last_sign_in_at,
  }));

  return c.json(list);
});

mainApp.post(`/admin/user`, async (c) => {
  const manager = await getManagerFromRequest(c);
  if (!manager) {
    return c.json({ error: "Forbidden: manager role required" }, 403);
  }

  const body = await c.req.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const role = body.role || 'staff';
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  if (!name || !email) {
    return c.json({ error: "Name and email are required" }, 400);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error } = await supabase.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: { name, role }
  });

  if (error) {
    console.error("Failed to create auth user:", error);
    return c.json({ error: error.message }, 400);
  }

  // Return formatted manager object
  return c.json({
    id: user?.id,
    name,
    email,
    role,
    status: 'active',
    lastActive: null
  });
});

mainApp.put(`/admin/user/:id`, async (c) => {
  const manager = await getManagerFromRequest(c);
  if (!manager) {
    return c.json({ error: "Forbidden: manager role required" }, 403);
  }

  const id = c.req.param("id");
  const body = await c.req.json();
  const role = body.role || 'staff';
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const targetId = await resolveUserId(supabase, id, body.email);

  if (!targetId) {
    return c.json({ error: "User not found" }, 404);
  }
  
  const updates: any = { 
    user_metadata: { name: body.name, role } 
  };
  
  if (body.password) {
    updates.password = body.password;
  }
  
  if (body.status === 'inactive') {
    updates.ban_duration = "876000h"; // Ban for 100 years ~ inactive
  } else if (body.status === 'active') {
    updates.ban_duration = "none";
  }

  const { data: { user }, error } = await supabase.auth.admin.updateUserById(targetId, updates);

  if (error) {
    console.error("Failed to update auth user:", error);
    return c.json({ error: error.message }, 400);
  }

  return c.json({
    id: user?.id,
    name: body.name,
    email: body.email,
    role: body.role,
    status: body.status,
    lastActive: user?.last_sign_in_at
  });
});

mainApp.delete(`/admin/user/:id`, async (c) => {
  const manager = await getManagerFromRequest(c);
  if (!manager) {
    return c.json({ error: "Forbidden: manager role required" }, 403);
  }

  const id = c.req.param("id");
  const email = c.req.query('email');
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const targetId = await resolveUserId(supabase, id, email);

  if (!targetId) {
    return c.json({ error: "User not found" }, 404);
  }

  const { error } = await supabase.auth.admin.deleteUser(targetId);

  if (error) {
    console.error("Failed to delete auth user:", error);
    return c.json({ error: error.message }, 400);
  }

  return c.json({ success: true });
});

// Aggregate Dashboard Data
mainApp.get(`/dashboard`, async (c) => {
  let managers: any[] = [];
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { users } } = await supabase.auth.admin.listUsers();
    if (users) {
      managers = users.map(user => ({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown',
        email: user.email || '',
        role: user.user_metadata?.role || 'staff',
        status: user.banned_until ? 'inactive' : 'active',
        lastActive: user.last_sign_in_at,
      }));
    }
  }

  const [products, batches, sales, pos, payments] = await Promise.all([
    getByPrefix('product:'),
    getByPrefix('batch:'),
    getByPrefix('sale:'),
    getByPrefix('po:'),
    getByPrefix('payment:')
  ]);

  // Staff only receive sales (and payments) where they are the responsible
  const user = await getCurrentUserFromRequest(c);
  let finalSales = sales;
  let finalPayments = payments;
  if (user?.user_metadata?.role === 'staff') {
    finalSales = sales.filter((s: any) => s.managerId === user.id);
    finalPayments = payments.filter((p: any) => p.managerId === user.id);
  }

  return c.json({ products, batches, sales: finalSales, pos, payments: finalPayments, managers });
});

// Create a parent app to handle routing.
// Supabase may pass path as /functions/v1/server/admin or /server/admin; strip prefix so mainApp sees /admin.
const app = new Hono();
app.route("/functions/v1/server", mainApp);
app.route("/server", mainApp);
app.route("/", mainApp);

Deno.serve(app.fetch);
