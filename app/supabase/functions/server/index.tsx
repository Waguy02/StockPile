import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { seedDatabase } from "./seed.ts";

const app = new Hono();
const BASE_PATH = "/make-server-7e8df46b";

// Enable logger
app.use('*', logger(console.log));

// Enable CORS
app.use(
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
app.get(`${BASE_PATH}/health`, (c) => c.json({ status: "ok" }));

// Seed endpoint
app.post(`${BASE_PATH}/seed`, async (c) => {
  const isSeeded = await kv.get('system:seeded');
  if (isSeeded) {
    return c.json({ message: "Already seeded" });
  }
  const result = await seedDatabase();
  return c.json(result);
});

// Generic getter for prefixes
const getByPrefix = async (prefix: string) => {
  return await kv.getByPrefix(prefix);
};

// Inventory Routes
app.get(`${BASE_PATH}/inventory`, async (c) => {
  const [categories, products, batches] = await Promise.all([
    getByPrefix('category:'),
    getByPrefix('product:'),
    getByPrefix('batch:')
  ]);
  return c.json({ categories, products, batches });
});

app.post(`${BASE_PATH}/inventory/product`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const product = { ...body, id };
  await kv.set(`product:${id}`, product);
  return c.json(product);
});

app.put(`${BASE_PATH}/inventory/product/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const product = { ...body, id };
  await kv.set(`product:${id}`, product);
  return c.json(product);
});

app.delete(`${BASE_PATH}/inventory/product/:id`, async (c) => {
  const id = c.req.param("id");
  await kv.del(`product:${id}`);
  return c.json({ success: true });
});

app.post(`${BASE_PATH}/inventory/batch`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const batch = { ...body, id };
  await kv.set(`batch:${id}`, batch);
  return c.json(batch);
});

app.put(`${BASE_PATH}/inventory/batch/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const batch = { ...body, id };
  await kv.set(`batch:${id}`, batch);
  return c.json(batch);
});

app.delete(`${BASE_PATH}/inventory/batch/:id`, async (c) => {
  const id = c.req.param("id");
  await kv.del(`batch:${id}`);
  return c.json({ success: true });
});

app.post(`${BASE_PATH}/inventory/category`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const category = { ...body, id };
  await kv.set(`category:${id}`, category);
  return c.json(category);
});

// Partners Routes
app.get(`${BASE_PATH}/partners`, async (c) => {
  const [providers, customers] = await Promise.all([
    getByPrefix('provider:'),
    getByPrefix('customer:')
  ]);
  return c.json({ providers, customers });
});

app.post(`${BASE_PATH}/partners/provider`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const provider = { ...body, id };
  await kv.set(`provider:${id}`, provider);
  return c.json(provider);
});

app.put(`${BASE_PATH}/partners/provider/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const provider = { ...body, id };
  await kv.set(`provider:${id}`, provider);
  return c.json(provider);
});

app.delete(`${BASE_PATH}/partners/provider/:id`, async (c) => {
  const id = c.req.param("id");
  await kv.del(`provider:${id}`);
  return c.json({ success: true });
});

app.post(`${BASE_PATH}/partners/customer`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const customer = { ...body, id };
  await kv.set(`customer:${id}`, customer);
  return c.json(customer);
});

app.put(`${BASE_PATH}/partners/customer/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const customer = { ...body, id };
  await kv.set(`customer:${id}`, customer);
  return c.json(customer);
});

app.delete(`${BASE_PATH}/partners/customer/:id`, async (c) => {
  const id = c.req.param("id");
  await kv.del(`customer:${id}`);
  return c.json({ success: true });
});

// Sales Routes
app.get(`${BASE_PATH}/sales`, async (c) => {
  const sales = await getByPrefix('sale:');
  return c.json(sales);
});

app.post(`${BASE_PATH}/sales`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const sale = { ...body, id };
  await kv.set(`sale:${id}`, sale);
  return c.json(sale);
});

app.put(`${BASE_PATH}/sales/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const sale = { ...body, id };
  await kv.set(`sale:${id}`, sale);
  return c.json(sale);
});

app.delete(`${BASE_PATH}/sales/:id`, async (c) => {
  const id = c.req.param("id");
  await kv.del(`sale:${id}`);
  return c.json({ success: true });
});

// Procurement Routes
app.get(`${BASE_PATH}/procurement`, async (c) => {
  const pos = await getByPrefix('po:');
  return c.json(pos);
});

app.post(`${BASE_PATH}/procurement`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const po = { ...body, id };
  await kv.set(`po:${id}`, po);
  return c.json(po);
});

app.put(`${BASE_PATH}/procurement/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const po = { ...body, id };
  await kv.set(`po:${id}`, po);
  return c.json(po);
});

app.delete(`${BASE_PATH}/procurement/:id`, async (c) => {
  const id = c.req.param("id");
  await kv.del(`po:${id}`);
  return c.json({ success: true });
});

// Finance Routes
app.get(`${BASE_PATH}/finance`, async (c) => {
  const payments = await getByPrefix('payment:');
  return c.json(payments);
});

app.post(`${BASE_PATH}/finance`, async (c) => {
  const body = await c.req.json();
  const id = body.id || crypto.randomUUID();
  const payment = { ...body, id };
  await kv.set(`payment:${id}`, payment);
  return c.json(payment);
});

app.put(`${BASE_PATH}/finance/:id`, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const payment = { ...body, id };
  await kv.set(`payment:${id}`, payment);
  return c.json(payment);
});

app.delete(`${BASE_PATH}/finance/:id`, async (c) => {
  const id = c.req.param("id");
  await kv.del(`payment:${id}`);
  return c.json({ success: true });
});

// Admin/Managers Routes
app.get(`${BASE_PATH}/admin`, async (c) => {
  const managers = await getByPrefix('manager:');
  return c.json(managers);
});

// Aggregate Dashboard Data
app.get(`${BASE_PATH}/dashboard`, async (c) => {
  const [products, batches, sales, pos, payments] = await Promise.all([
    getByPrefix('product:'),
    getByPrefix('batch:'),
    getByPrefix('sale:'),
    getByPrefix('po:'),
    getByPrefix('payment:')
  ]);
  return c.json({ products, batches, sales, pos, payments });
});

Deno.serve(app.fetch);
