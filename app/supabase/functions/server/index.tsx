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
  const id = c.req.param("id");
  await kv.del(`product:${id}`);
  return c.json({ success: true });
});

mainApp.post(`/inventory/batch`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const batch = { ...body, id };
  await kv.set(`batch:${id}`, batch);
  return c.json(batch);
});

mainApp.put(`/inventory/batch/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const batch = { ...body, id };
  await kv.set(`batch:${id}`, batch);
  return c.json(batch);
});

mainApp.delete(`/inventory/batch/:id`, async (c) => {
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
  const id = c.req.param("id");
  await kv.del(`customer:${id}`);
  return c.json({ success: true });
});

// Sales Routes
mainApp.get(`/sales`, async (c) => {
  const sales = await getByPrefix('sale:');
  return c.json(sales);
});

mainApp.post(`/sales`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const sale = { ...body, id };
  await kv.set(`sale:${id}`, sale);
  return c.json(sale);
});

mainApp.put(`/sales/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const sale = { ...body, id };
  await kv.set(`sale:${id}`, sale);
  return c.json(sale);
});

mainApp.delete(`/sales/:id`, async (c) => {
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
  const id = body.id || crypto.randomUUID();
  const po = { ...body, id };
  await kv.set(`po:${id}`, po);
  return c.json(po);
});

mainApp.put(`/procurement/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const po = { ...body, id };
  await kv.set(`po:${id}`, po);
  return c.json(po);
});

mainApp.delete(`/procurement/:id`, async (c) => {
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
  await kv.set(`payment:${id}`, payment);
  return c.json(payment);
});

mainApp.put(`/finance/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const payment = { ...body, id };
  await kv.set(`payment:${id}`, payment);
  return c.json(payment);
});

mainApp.delete(`/finance/:id`, async (c) => {
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
  
  return c.json({ products, batches, sales, pos, payments, managers }); // Include managers in dashboard data if needed by frontend
});

// Create a parent app to handle routing.
// Supabase may pass path as /functions/v1/server/admin or /server/admin; strip prefix so mainApp sees /admin.
const app = new Hono();
app.route("/functions/v1/server", mainApp);
app.route("/server", mainApp);
app.route("/", mainApp);

Deno.serve(app.fetch);
