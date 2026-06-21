import 'dotenv/config';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { proxyHandler } from './routes/proxy.js';
import { getAllItems, createItem, deleteItem, clearAllItems } from './routes/items.js';

const app = new Hono();

app.use('*', cors());

// DashScope transparent proxy
app.all('/api/proxy/dashscope/*', proxyHandler);

// Items CRUD
app.get('/api/items', getAllItems);
app.post('/api/items', createItem);
app.delete('/api/items', clearAllItems);
app.delete('/api/items/:id', deleteItem);

// Static file serving
app.use('/api/files/*', serveStatic({ root: './uploads' }));

const PORT = parseInt(process.env.PORT || '3001', 10);
console.log(`Server starting on http://localhost:${PORT}`);
serve({ fetch: app.fetch, port: PORT });
