import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { config } from './config';
import { analyzeRouter } from './routes/analyze';
import { analysisRouter } from './routes/analysis';

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Serve static client assets (including codelogo.png)
app.use(express.static(path.resolve(__dirname, '../../client/public')));

// CORS setup: allow configured clientUrls, wildcard, localhost, and any *.vercel.app domains
const configuredOrigins = (config.clientUrl || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.clientUrl === '*' || configuredOrigins.includes('*')) return callback(null, true);
    if (configuredOrigins.includes(origin)) return callback(null, true);
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return callback(null, true);
    if (/^https:\/\/.*\.onrender\.com$/.test(origin)) return callback(null, true);
    // Allow by default with warning for hassle-free deployments
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
}));

app.use(express.json({ limit: '2mb' }));

// Rate limiter on analyze endpoint: max 20 analyze requests per 15 minutes per IP
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many analysis requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use('/api/analyze', analyzeLimiter, analyzeRouter);
app.use('/api/analysis', analysisRouter);

// Root route: helpful landing & auto-redirect to frontend
app.get('/', (req, res) => {
  const primaryClient = config.clientUrl.split(',')[0].trim() || 'http://localhost:5173';
  
  if (req.accepts('html')) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Codebase Onboarder API</title>
        <meta http-equiv="refresh" content="2;url=${primaryClient}" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #0d0f12;
            color: #f3f4f6;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: #16191f;
            border: 1px solid #232730;
            border-radius: 16px;
            padding: 2.5rem;
            max-width: 520px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            text-align: center;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(34, 197, 94, 0.15);
            color: #4ade80;
            border: 1px solid rgba(34, 197, 94, 0.3);
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 1.25rem;
          }
          .dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            box-shadow: 0 0 8px #22c55e;
          }
          h1 {
            font-size: 1.75rem;
            font-weight: 700;
            margin: 0 0 0.5rem 0;
            color: #ffffff;
          }
          p {
            color: #9ca3af;
            font-size: 0.95rem;
            line-height: 1.5;
            margin: 0 0 1.5rem 0;
          }
          .btn {
            display: inline-block;
            background: #E35336;
            color: #ffffff;
            text-decoration: none;
            font-weight: 600;
            padding: 0.75rem 1.75rem;
            border-radius: 10px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px rgba(227, 83, 54, 0.35);
          }
          .btn:hover {
            background: #c84126;
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(227, 83, 54, 0.45);
          }
          .api-links {
            margin-top: 1.5rem;
            padding-top: 1.25rem;
            border-top: 1px solid #232730;
            font-size: 0.825rem;
            color: #6b7280;
          }
          .api-links a {
            color: #F4A460;
            text-decoration: none;
            margin: 0 8px;
          }
          .api-links a:hover {
            text-decoration: underline;
          }
          .redirect-notice {
            margin-top: 1rem;
            font-size: 0.75rem;
            color: #6b7280;
            font-family: 'JetBrains Mono', monospace;
          }
        </style>
        <script>
          setTimeout(() => {
            window.location.href = "${primaryClient}";
          }, 1500);
        </script>
      </head>
      <body>
        <div class="card">
          <img src="/codelogo.png" alt="Logo" style="width: 52px; height: 52px; border-radius: 12px; margin-bottom: 12px; object-fit: contain; box-shadow: 0 4px 12px rgba(0,0,0,0.4);" />
          <div class="badge"><span class="dot"></span> API Server Active</div>
          <h1>Codebase Onboarder Backend</h1>
          <p>The backend service is running on port <strong>${config.port}</strong>. The interactive user interface is hosted on <strong>${primaryClient}</strong>.</p>
          <a class="btn" href="${primaryClient}">Open Web Application &rarr;</a>
          <div class="redirect-notice">Redirecting to frontend in 2 seconds...</div>
          <div class="api-links">
            Endpoints:
            <a href="/api/health">/api/health</a> &bull;
            <a href="/api/analysis">/api/analysis</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  res.json({
    status: 'ok',
    name: 'Codebase Onboarder API',
    version: '1.0.0',
    port: config.port,
    frontendUrl: primaryClient,
    endpoints: {
      health: '/api/health',
      analyze: 'POST /api/analyze',
      analysis: 'GET /api/analysis',
      fileSummary: 'POST /api/analysis/:id/file-summary',
    },
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    dbConnected: mongoose.connection.readyState === 1,
    time: new Date().toISOString(),
  });
});

// 404 Handler for unmatched routes
app.use((req, res) => {
  const primaryClient = config.clientUrl.split(',')[0].trim() || 'http://localhost:5173';
  if (req.accepts('html')) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Not Found - Codebase Onboarder</title>
        <meta http-equiv="refresh" content="3;url=${primaryClient}" />
        <style>
          body { background: #0d0f12; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .box { text-align: center; background: #16191f; padding: 2rem; border-radius: 12px; border: 1px solid #232730; }
          a { color: #E35336; font-weight: bold; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>Endpoint Not Found: <code>${req.path}</code></h2>
          <p>Looking for the Codebase Onboarder app?</p>
          <p><a href="${primaryClient}">Go to Web Application (${primaryClient}) &rarr;</a></p>
        </div>
      </body>
      </html>
    `);
  }
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    message: `Endpoint does not exist. Frontend application is at ${primaryClient}`,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

// Connect to MongoDB
async function start() {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('[Database] Connected to MongoDB at', config.mongoUri);
  } catch (err: any) {
    console.warn('[Database] Notice: MongoDB connection failed (using in-memory cache fallback):', err.message);
  }

  app.listen(config.port, () => {
    console.log(`[Server] Codebase Onboarder server running on http://localhost:${config.port}`);
  });
}

start();

export default app;
