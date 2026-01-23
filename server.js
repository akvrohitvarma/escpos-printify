require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const escpos = require('escpos');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
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

// Common border style for templates
const borderStyle = 'width: 512px; box-sizing: border-box; border: 2px solid #000; border-radius: 20px; background: #fff; color: #000; font-family: Arial, sans-serif; margin: 0; padding: 20px;';

/**
 * Build QR code content string from structured data
 */
function buildQrContent(payload) {
    const { qrType = 'url', qrData = {} } = payload;

    switch (qrType) {
        case 'url':
            return qrData.url || 'https://example.com';
        case 'text':
            return qrData.text || '';
        case 'email':
            return `mailto:${qrData.to || ''}?subject=${encodeURIComponent(qrData.subject || '')}&body=${encodeURIComponent(qrData.body || '')}`;
        case 'sms':
            return `sms:${qrData.phone || ''}?body=${encodeURIComponent(qrData.message || '')}`;
        case 'wifi':
            return `WIFI:T:${qrData.security || 'WPA'};S:${qrData.ssid || ''};P:${qrData.password || ''};;`;
        case 'vcard':
            return `BEGIN:VCARD\nVERSION:3.0\nN:${qrData.name || ''}\nFN:${qrData.name || ''}\nTEL:${qrData.phone || ''}\nEMAIL:${qrData.email || ''}\nORG:${qrData.org || ''}\nEND:VCARD`;
        default:
            return qrData.url || qrData.text || 'https://example.com';
    }
}

/**
 * Generate QR code as data URL
 */
async function generateQrDataUrl(content, size = 350) {
    try {
        return await QRCode.toDataURL(content, { width: size, margin: 1 });
    } catch (err) {
        log(`QR generation error: ${err.message}`);
        return null;
    }
}

/**
 * Generate HTML from structured JSON payload
 */
async function generateHtml(payload) {
    const { template } = payload;

    // Format date helper
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
    };

    // Format time helper (24h to 12h)
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
    };

    const now = new Date();
    const printedAt = `${formatDate(now.toISOString().split('T')[0])} • ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

    switch (template) {
        case 'reminder': {
            const { title = '', body = '', flag = 'none', customFlag = '', showPrintedAt = true, showFinishBy = false, finishByDate, finishByTime, showQrCode = false, qrType, qrData } = payload;
            const flagLabels = { urgent: 'URGENT', important: 'IMPORTANT', emergency: 'EMERGENCY', custom: customFlag || 'REMINDER', none: '' };
            const flagText = flagLabels[flag] || '';
            const showFlag = flag !== 'none' && flagText;

            // Generate QR code server-side if enabled
            let qrCode = null;
            if (showQrCode && qrData) {
                const qrContent = buildQrContent({ qrType, qrData });
                qrCode = await generateQrDataUrl(qrContent, 200);
            }

            return `
                <div style="${borderStyle} padding: 0; overflow: hidden;">
                    ${showFlag ? `<div style="background: #000; color: #fff; padding: 20px; text-align: center;"><p style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 4px; font-family: Impact, 'Arial Black', sans-serif;">${flagText}</p></div>` : ''}
                    <div style="padding: 25px;">
                        <h2 style="margin: 0 0 15px; font-size: 36px; font-weight: bold; text-align: center;">${title}</h2>
                        <p style="font-size: 24px; text-align: center; margin: 0; opacity: 0.7; line-height: 1.4;">${body}</p>
                    </div>
                    ${showQrCode && qrCode ? `<div style="text-align: center; padding: 20px; border-top: 2px dashed #000;"><img src="${qrCode}" style="width: 200px; height: 200px; margin: 0 auto; display: block;" /><p style="margin: 10px 0 0; font-size: 14px; color: #666;">Scan for more info</p></div>` : ''}
                    ${(showPrintedAt || showFinishBy) ? `<div style="display: flex; justify-content: space-between; padding: 20px 25px; border-top: 2px dashed #000; font-size: 16px;">${showPrintedAt ? `<div style="text-align: left;"><strong>Printed:</strong><br/>${printedAt}</div>` : '<div></div>'}${showFinishBy ? `<div style="text-align: right;"><strong>Finish By:</strong><br/>${formatDate(finishByDate)} • ${formatTime(finishByTime)}</div>` : '<div></div>'}</div>` : ''}
                </div>
            `;
        }

        case 'postit': {
            const { title = 'Note', body = '' } = payload;
            return `<div style="${borderStyle} text-align: center; padding: 35px;"><h2 style="margin: 0 0 20px; font-size: 48px; font-weight: bold;">${title}</h2><p style="margin: 0; font-size: 32px; line-height: 1.4;">${body}</p></div>`;
        }

        case 'grocery': {
            const { title = 'Shopping List', items = [] } = payload;
            const itemsHtml = items.map(item => `<li style="margin: 12px 0; font-size: 28px;"><span style="display: inline-block; width: 28px; height: 28px; border: 3px solid #000; border-radius: 6px; margin-right: 15px; vertical-align: middle;"></span>${item}</li>`).join('');
            return `<div style="${borderStyle} padding: 30px;"><h2 style="margin: 0 0 20px; font-size: 40px; font-weight: bold; text-align: center;">${title}</h2><ul style="list-style: none; padding: 0; margin: 0;">${itemsHtml}</ul></div>`;
        }

        case 'banner': {
            const { title = 'HELLO', fontSize = '400' } = payload;
            const words = title.trim().split(/\s+/).filter(w => w);
            return `<div style="width: 512px; background: #fff; color: #000; font-family: Impact, 'Arial Black', sans-serif; margin: 0; padding: 0;">${words.map(word => `<div style="display: flex; justify-content: center; border-bottom: 2px dashed #ccc;"><p style="margin: 0; padding: 20px 0 90px 0; font-size: ${fontSize}px; font-weight: 900; line-height: 0.5; writing-mode: vertical-rl; text-orientation: mixed; white-space: nowrap;">${word}</p></div>`).join('')}</div>`;
        }

        case 'qrcode': {
            const { qrLabel = '', qrType = 'url', qrData = {} } = payload;
            const typeLabels = { url: 'URL', text: 'Text', email: 'Email', sms: 'SMS', wifi: 'WiFi', vcard: 'Contact' };

            // Generate QR code server-side
            const qrContent = buildQrContent({ qrType, qrData });
            const qrCode = await generateQrDataUrl(qrContent, 350);

            return `<div style="${borderStyle} text-align: center; padding: 30px;"><h2 style="margin: 0 0 10px; font-size: 36px; font-weight: bold;">QR Code</h2><p style="margin: 0 0 20px; font-size: 20px; color: #666;">${typeLabels[qrType] || 'QR Code'}</p>${qrCode ? `<img src="${qrCode}" style="width: 350px; height: 350px; margin: 0 auto; display: block;" />` : '<p>No QR code</p>'}${qrLabel ? `<p style="margin: 25px 0 0; font-size: 28px; font-weight: bold;">${qrLabel}</p>` : ''}</div>`;
        }

        case 'image': {
            const { image, caption = '' } = payload;
            return `<div style="${borderStyle} text-align: center; padding: 20px;">${image ? `<img src="${image}" style="width: 100%; max-width: 472px; display: block; margin: 0 auto;" />` : '<p style="font-size: 18px; padding: 50px 0; background: #f0f0f0; border-radius: 10px;">No image</p>'}${caption ? `<p style="margin: 20px 0 0; font-size: 24px;">${caption}</p>` : ''}</div>`;
        }

        // Internal templates (used by frontend, not documented in API)
        case 'tictactoe': {
            return `<div style="${borderStyle} text-align: center; padding: 30px;"><h2 style="margin: 0 0 25px; font-size: 48px; font-weight: bold;">Tic Tac Toe</h2><table style="margin: 0 auto; border-collapse: collapse;">${[0, 1, 2].map(() => `<tr>${[0, 1, 2].map(() => `<td style="width: 120px; height: 120px; border: 4px solid #000; font-size: 60px;"></td>`).join('')}</tr>`).join('')}</table></div>`;
        }

        case 'sudoku': {
            const { puzzle, solution, difficulty = 'medium' } = payload;
            const renderGrid = (grid, cellSize, fontSize) => {
                if (!grid) return '<p>No puzzle data</p>';
                return `<table style="margin: 0 auto; border-collapse: collapse; border: 3px solid #000;">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(row => `<tr>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(col => {
                    const val = grid[row * 9 + col];
                    const borderRight = (col + 1) % 3 === 0 && col < 8 ? '3px solid #000' : '1px solid #999';
                    const borderBottom = (row + 1) % 3 === 0 && row < 8 ? '3px solid #000' : '1px solid #999';
                    return `<td style="width: ${cellSize}px; height: ${cellSize}px; text-align: center; font-size: ${fontSize}px; font-weight: bold; border-right: ${borderRight}; border-bottom: ${borderBottom};">${val === '-' ? '' : val}</td>`;
                }).join('')}</tr>`).join('')}</table>`;
            };
            return `<div style="${borderStyle} text-align: center; padding: 25px;"><h2 style="margin: 0 0 15px; font-size: 36px; font-weight: bold;">Sudoku Puzzle</h2><p style="margin: 0 0 20px; font-size: 20px;">Difficulty: ${difficulty.toUpperCase()}</p>${renderGrid(puzzle, 45, 28)}<div style="margin-top: 30px; padding-top: 20px; border-top: 2px dashed #000;"><p style="margin: 0 0 15px; font-size: 20px; font-weight: bold;">Solution</p>${renderGrid(solution, 35, 20)}</div></div>`;
        }

        default:
            throw new Error(`Unknown template: ${template}`);
    }
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

        // Wrap HTML with minimal styles (width + white background, no margin/padding)
        const wrappedHtml = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{width:${CONFIG.imageWidth}px;background:white}</style></head><body>${html}</body></html>`;

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
                    printer.feed(2);
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
 * Body (new structured format):
 * {
 *   template: "reminder|postit|grocery|banner|qrcode|image|sudoku|tictactoe",
 *   title: "string",
 *   body: "string",
 *   ... (template-specific fields)
 *   copies: 1  // Optional: 1-10
 * }
 * 
 * Body (legacy format - still supported):
 * {
 *   html: "<html content>",
 *   copies: 1
 * }
 */
app.post('/print', printLimiter, async (req, res) => {
    const { template, html, copies = 1 } = req.body;

    // Validate copies
    if (!Number.isInteger(copies) || copies < 1 || copies > 10) {
        return res.status(400).json({ success: false, error: '"copies" must be 1-10' });
    }

    let htmlContent;

    // New structured JSON format
    if (template) {
        try {
            htmlContent = await generateHtml(req.body);
            log(`Generated HTML for template: ${template}`);
        } catch (err) {
            return res.status(400).json({ success: false, error: err.message });
        }
    }
    // Legacy HTML format (backward compatible)
    else if (html && typeof html === 'string') {
        htmlContent = html;
        log('Using legacy HTML format');
    }
    // Neither provided
    else {
        return res.status(400).json({ success: false, error: 'Missing "template" or "html" field' });
    }

    // Queue print jobs to prevent conflicts
    printLock = printLock.then(async () => {
        try {
            log(`Converting to image (${copies} copies)...`);
            const imageBuffer = await htmlToImage(htmlContent);
            log(`Image generated: ${imageBuffer.length} bytes`);

            log(`Printing ${copies} copies...`);
            await printImage(imageBuffer, copies);
            log('Complete, connection closed');

            res.json({ success: true, template: template || 'html', copies });
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
