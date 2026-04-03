import 'dotenv/config';
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';

import { generateHtml } from './lib/templates.js';
import { renderHtmlToImage, ditherImage, preshrinkImage, warmup } from './lib/renderer.js';
import { printImage, isUsbSupported, listUsbPrinters } from './lib/printer.js';
import {
  configureHelmet, configureCors, apiKeyAuth,
  validatePrintRequest, sanitizePayload,
} from './lib/security.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ────────────────────────────────────────

const CONFIG = {
  port: parseInt(process.env.PORT) || 3000,
  imageWidth: parseInt(process.env.IMAGE_WIDTH) || 512,
  printerTimeout: parseInt(process.env.PRINTER_TIMEOUT) || 10000,
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX) || 30,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
  },
  printer: {
    type: 'network',
    host: process.env.PRINTER_HOST || '192.168.1.100',
    port: parseInt(process.env.PRINTER_PORT) || 9100,
  },
  apiKey: process.env.API_KEY || '',
  corsOrigins: process.env.CORS_ORIGINS || '',
};

// ── Express App ──────────────────────────────────────────

const app = express();

// Security middleware
app.use(configureHelmet());
app.use(configureCors(CONFIG.corsOrigins));

// Serve static frontend (built Vite app)
app.use(express.static(join(__dirname, 'web', 'dist')));

// Body parsing — 5MB to accommodate base64 images
app.use(express.json({ limit: '5mb' }));

// Rate limiting on print and preview endpoints
const printLimiter = rateLimit({
  windowMs: CONFIG.rateLimit.windowMs,
  max: CONFIG.rateLimit.max,
  message: { success: false, error: `Rate limit exceeded. Max ${CONFIG.rateLimit.max} requests per minute.` },
});

const previewLimiter = rateLimit({
  windowMs: CONFIG.rateLimit.windowMs,
  max: CONFIG.rateLimit.max * 2,
  message: { success: false, error: 'Preview rate limit exceeded.' },
});

// API key auth (skipped if API_KEY not set)
const auth = apiKeyAuth(CONFIG.apiKey);

// ── Logging helper ───────────────────────────────────────

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// ── Render concurrency limiter ──────────────────────────

const MAX_CONCURRENT_RENDERS = parseInt(process.env.MAX_CONCURRENT_RENDERS) || 3;
let activeRenders = 0;
const renderQueue = [];

function acquireRenderSlot() {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders++;
    return Promise.resolve();
  }
  return new Promise((resolve) => renderQueue.push(resolve));
}

function releaseRenderSlot() {
  if (renderQueue.length > 0) {
    renderQueue.shift()();
  } else {
    activeRenders--;
  }
}

// ── Render helper ───────────────────────────────────────

// Estimate canvas height per template — Resvg time scales linearly with pixel count
function estimateHeight(template, payload) {
  switch (template) {
    case 'postit':    return 400;
    case 'grocery':   return 250 + (payload.items?.length || 0) * 55;
    case 'reminder':  return 600;
    case 'qrcode':    return 700;
    case 'tictactoe': return 600;
    case 'sudoku':    return 1400;
    case 'image':     return 800;
    case 'banner': {
      const words = (payload.title || '').trim().split(/\s+/).filter(w => w);
      const chars = words.reduce((sum, w) => sum + w.length, 0);
      const fs = parseInt(payload.fontSize) || 400;
      return chars * fs * 0.85 + words.length * 60 + 100;
    }
    default:          return 800;
  }
}

async function renderPayload(payload) {
  await acquireRenderSlot();
  try {
    // Image uploads: preshrink to small JPEG so Satori doesn't choke on multi-MB base64,
    // then flow through normal pipeline to preserve template border/caption
    if (payload.template === 'image' && payload.image) {
      payload = { ...payload, image: await preshrinkImage(payload.image) };
    }

    const html = await generateHtml(payload);
    const maxHeight = estimateHeight(payload.template, payload);
    const rawImage = await renderHtmlToImage(html, CONFIG.imageWidth, maxHeight);
    const ditherOpts = payload.template === 'image'
      ? { brightnessBoost: 1.3, brightnessOffset: 20 }
      : {};
    return ditherImage(rawImage, ditherOpts);
  } finally {
    releaseRenderSlot();
  }
}

// ── Routes ───────────────────────────────────────────────

/**
 * POST /print — Print a template to the receipt printer
 */
app.post('/print', printLimiter, auth, async (req, res) => {
  // Validate
  const validation = validatePrintRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const { copies = 1, printer: printerOverride } = req.body;

  // Sanitize text fields (skip image data)
  const payload = sanitizePayload(req.body);

  // Determine printer connection
  const printerConfig = printerOverride && printerOverride.type === 'usb'
    ? { type: 'usb', vendorId: printerOverride.vendorId, productId: printerOverride.productId }
    : CONFIG.printer;

  try {
    log(`Generating template: ${payload.template} (${copies} copies)`);
    const ditheredImage = await renderPayload(payload);
    log(`Image rendered: ${ditheredImage.length} bytes, printing...`);

    await printImage(ditheredImage, printerConfig, copies, CONFIG.printerTimeout);

    log('Print complete');
    res.json({ success: true, template: payload.template, copies });
  } catch (err) {
    log(`Error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /preview — Render a template and return the PNG image (no printing)
 */
app.post('/preview', previewLimiter, auth, async (req, res) => {
  const validation = validatePrintRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const payload = sanitizePayload(req.body);

  try {
    const ditheredImage = await renderPayload(payload);
    res.set('Content-Type', 'image/png');
    res.send(ditheredImage);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /health — Server health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    printerHost: CONFIG.printer.host,
    printerType: CONFIG.printer.type,
    usbSupported: isUsbSupported(),
  });
});

/**
 * GET /printers/usb — List connected USB printers
 */
app.get('/printers/usb', auth, (req, res) => {
  if (!isUsbSupported()) {
    return res.json({ supported: false, printers: [], message: 'USB printing not available. Install escpos-usb.' });
  }
  const printers = listUsbPrinters();
  res.json({ supported: true, printers });
});

/**
 * GET /config — Return non-sensitive server configuration
 */
app.get('/config', (req, res) => {
  res.json({
    imageWidth: CONFIG.imageWidth,
    printerHost: CONFIG.printer.host,
    printerPort: CONFIG.printer.port,
    usbSupported: isUsbSupported(),
    authRequired: !!CONFIG.apiKey,
  });
});

// SPA fallback — serve index.html for all other routes
app.get('{*path}', (req, res) => {
  res.sendFile(join(__dirname, 'web', 'dist', 'index.html'));
});

// ── Start Server ─────────────────────────────────────────

const server = app.listen(CONFIG.port, async () => {
  log(`ESC/POS Printify running on http://localhost:${CONFIG.port}`);
  log(`Printer: ${CONFIG.printer.host}:${CONFIG.printer.port}`);
  if (CONFIG.apiKey) log('API key authentication enabled');
  if (isUsbSupported()) log('USB printer support available');

  // Pre-warm renderer to avoid cold-start latency on first print
  await warmup();
  log('Renderer warmed up');
});

// Graceful shutdown — drain in-flight requests before exiting
function shutdown(signal) {
  log(`${signal} received, closing server...`);
  server.close(() => {
    log('All connections closed. Exiting.');
    process.exit(0);
  });
  // Force exit if connections aren't closed within 10s
  setTimeout(() => {
    log('Force shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`);
});

process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`);
  process.exit(1);
});
