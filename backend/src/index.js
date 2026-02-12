import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dataRoutes } from './routes/dataRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true
});

const prisma = new PrismaClient();

// Register plugins
await fastify.register(cors, {
  origin: true,
  credentials: true
});

await fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Root page - Service Status
fastify.get('/', async (request, reply) => {
  reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GeoMetrics - Service Status</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 500px;
    }
    h1 { color: #333; margin-bottom: 0.5rem; font-size: 2rem; }
    .subtitle { color: #666; margin-bottom: 2rem; font-size: 1.1rem; }
    .status-card {
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
    }
    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #d4edda;
      color: #155724;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      background: #28a745;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    .info { color: #888; font-size: 0.9rem; margin-top: 1.5rem; }
    .timestamp { color: #666; font-size: 0.85rem; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏔️ GeoMetrics</h1>
    <p class="subtitle">Geospatial Metrics Platform</p>
    
    <div class="status-card">
      <div class="status-indicator">
        <span class="status-dot"></span>
        Service Online
      </div>
    </div>
    
    <p class="timestamp">Server time: ${new Date().toISOString()}</p>
    <p class="info">API available at /api endpoint</p>
  </div>
</body>
</html>
  `);
});

// API Routes placeholder
fastify.get('/api', async () => {
  return { message: 'GeoMetrics API', version: '1.0.0' };
});

// Register data routes
await fastify.register(dataRoutes);

// Start server
const start = async () => {
  try {
    await fastify.listen({ 
      port: process.env.PORT || 3001, 
      host: process.env.HOST || '0.0.0.0' 
    });
    console.log(`🚀 Server running at http://${process.env.HOST || '0.0.0.0'}:${process.env.PORT || 3001}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
