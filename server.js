require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const escpos = require('escpos');
const rateLimit = require('express-rate-limit');
escpos.Network = require('escpos-network');

const app = express();

// Configuration from .env
const CONFIG = {
    port: parseInt(process.env.PORT) || 3000,
    imageWidth: parseInt(process.env.IMAGE_WIDTH) || 512,
    printerTimeout: parseInt(process.env.PRINTER_TIMEOUT) || 10000,
    rateLimit: {
        max: parseInt(process.env.RATE_LIMIT_MAX) || 30,
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000
    },
    printer: {
        host: process.env.PRINTER_HOST || '192.168.192.168',
        port: parseInt(process.env.PRINTER_PORT) || 9100
    }
};

// Rate limiting
const printLimiter = rateLimit({
    windowMs: CONFIG.rateLimit.windowMs,
    max: CONFIG.rateLimit.max,
    message: { success: false, error: `Rate limit exceeded. Max ${CONFIG.rateLimit.max} prints/minute.` }
});

app.use(express.json({ limit: '500kb' }));

// Reusable browser instance with crash recovery
let browser = null;

async function getBrowser() {
    if (!browser || !browser.isConnected()) {
        if (browser) {
            try { await browser.close(); } catch (e) { }
        }
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        // Auto-recover on disconnect
        browser.on('disconnected', () => {
            console.log('[Browser] Disconnected, will restart on next request');
            browser = null;
        });
        console.log('[Browser] Launched');
    }
    return browser;
}

// Logging helper
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

/**
 * Convert HTML to PNG image buffer (512px width)
 */
async function htmlToImage(html) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        // Set viewport to fixed printer width
        await page.setViewport({ width: CONFIG.imageWidth, height: 100 });

        // Wrap HTML with minimal styles (width + white background)
        const wrappedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { width: ${CONFIG.imageWidth}px; background: white; margin: 0; }
        </style>
      </head>
      <body>${html}</body>
      </html>
    `;

        await page.setContent(wrappedHtml, { waitUntil: 'networkidle0' });

        // Get actual content height
        const bodyHandle = await page.$('body');
        const { height } = await bodyHandle.boundingBox();
        await bodyHandle.dispose();

        // Resize viewport to content height
        await page.setViewport({ width: CONFIG.imageWidth, height: Math.ceil(height) });

        // Capture as PNG
        const imageBuffer = await page.screenshot({
            type: 'png',
            fullPage: true,
            omitBackground: false
        });

        return imageBuffer;
    } finally {
        await page.close();
    }
}

/**
 * Print image buffer to receipt printer via network
 * Opens connection, prints, then closes
 * @param {Buffer} imageBuffer - PNG image buffer
 * @param {number} copies - Number of copies (default: 1)
 */
async function printImage(imageBuffer, copies = 1) {
    // Convert buffer to data URL (escpos.Image.load accepts this)
    const dataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    // Load image from data URL (in memory, no disk I/O)
    const image = await new Promise((resolve, reject) => {
        escpos.Image.load(dataUrl, (loadedImage) => {
            if (!loadedImage) {
                reject(new Error('Failed to load image'));
            } else {
                resolve(loadedImage);
            }
        });
    });

    return new Promise((resolve, reject) => {
        const device = new escpos.Network(CONFIG.printer.host, CONFIG.printer.port);
        const printer = new escpos.Printer(device);

        // Connection timeout
        const timeout = setTimeout(() => {
            try { device.close(); } catch (e) { }
            reject(new Error('Printer connection timeout'));
        }, CONFIG.printerTimeout);

        device.open((err) => {
            clearTimeout(timeout);
            if (err) {
                return reject(new Error(`Printer connection failed: ${err.message}`));
            }

            try {
                // Print all copies in single connection
                for (let i = 0; i < copies; i++) {
                    printer.align('CT');
                    printer.raster(image);
                    printer.feed(1);
                    printer.cut();
                }

                printer.close(() => {
                    resolve();
                });
            } catch (printErr) {
                device.close();
                reject(new Error(`Print failed: ${printErr.message}`));
            }
        });
    });
}

// Simple mutex for print queue
let printLock = Promise.resolve();

/**
 * POST /print
 * Body: {
 *   html: "<html content>",  // Required: HTML to print
 *   copies: 1                 // Optional: Number of copies (default: 1, max: 10)
 * }
 */
app.post('/print', printLimiter, async (req, res) => {
    const { html, copies = 1 } = req.body;

    // Validation
    if (!html || typeof html !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid "html" field' });
    }
    if (!Number.isInteger(copies) || copies < 1 || copies > 10) {
        return res.status(400).json({ success: false, error: '"copies" must be 1-10' });
    }

    // Queue print jobs to prevent conflicts
    printLock = printLock.then(async () => {
        try {
            log(`Converting HTML to image (${copies} copies)...`);
            const imageBuffer = await htmlToImage(html);
            log(`Image generated: ${imageBuffer.length} bytes`);

            log(`Printing ${copies} copies...`);
            await printImage(imageBuffer, copies);
            log('Complete, connection closed');

            res.json({ success: true, copies });
        } catch (err) {
            log(`Error: ${err.message}`);
            res.status(500).json({ success: false, error: err.message });
        }
    }).catch(() => { });
});

/**
 * GET /health - Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        printerHost: CONFIG.printer.host,
        browserConnected: browser?.isConnected() ?? false
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    log('Shutting down...');
    if (browser) await browser.close();
    process.exit(0);
});

// Start server
app.listen(CONFIG.port, async () => {
    // Pre-launch browser for faster first request
    await getBrowser();
    log(`ESC/POS Print Server running on http://localhost:${CONFIG.port}`);
    log(`Printer: ${CONFIG.printer.host}:${CONFIG.printer.port}`);
});
