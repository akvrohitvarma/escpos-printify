import helmet from 'helmet';
import cors from 'cors';

/**
 * Escape HTML special characters to prevent injection
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitize all string fields in a payload object (shallow)
 */
export function sanitizePayload(payload) {
  const sanitized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === 'string' && key !== 'image') {
      // Don't sanitize base64 image data
      sanitized[key] = escapeHtml(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? escapeHtml(item) : item
      );
    } else if (value && typeof value === 'object' && key === 'qrData') {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Validate image data URL format and size
 */
export function validateImageDataUrl(dataUrl, maxSizeBytes = 5 * 1024 * 1024) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return { valid: false, error: 'Image data is required' };
  }
  if (!/^data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,/.test(dataUrl)) {
    return { valid: false, error: 'Invalid image format. Accepted: png, jpeg, gif, webp, bmp' };
  }
  // Estimate decoded size (base64 is ~4/3 of original)
  const base64Part = dataUrl.split(',')[1] || '';
  const estimatedSize = (base64Part.length * 3) / 4;
  if (estimatedSize > maxSizeBytes) {
    return { valid: false, error: `Image too large. Max ${Math.round(maxSizeBytes / 1024 / 1024)}MB` };
  }
  return { valid: true };
}

const VALID_TEMPLATES = ['reminder', 'postit', 'grocery', 'banner', 'qrcode', 'image', 'tictactoe', 'sudoku'];

/**
 * Validate the print request body
 */
export function validatePrintRequest(body) {
  const { template, copies = 1 } = body;

  if (!template || typeof template !== 'string') {
    return { valid: false, error: 'Missing "template" field' };
  }
  if (!VALID_TEMPLATES.includes(template)) {
    return { valid: false, error: `Invalid template "${template}". Valid: ${VALID_TEMPLATES.join(', ')}` };
  }
  if (!Number.isInteger(copies) || copies < 1 || copies > 10) {
    return { valid: false, error: '"copies" must be 1-10' };
  }
  if (template === 'image') {
    const imgValidation = validateImageDataUrl(body.image);
    if (!imgValidation.valid) return imgValidation;
  }
  return { valid: true };
}

/**
 * Configure Helmet security headers
 */
export function configureHelmet() {
  // Permissive config so the app works over both plain HTTP (LAN) and HTTPS (reverse proxy).
  // When behind Nginx Proxy Manager / Traefik / Caddy, the proxy adds stricter headers for HTTPS.
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    originAgentCluster: false,
    strictTransportSecurity: false,
  });
}

/**
 * Configure CORS
 */
export function configureCors(originsEnv) {
  const origins = originsEnv
    ? originsEnv.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];

  return cors({
    origin: origins.includes('*') ? '*' : origins,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
  });
}

/**
 * Optional API key authentication middleware
 */
export function apiKeyAuth(apiKey) {
  return (req, res, next) => {
    if (!apiKey) return next(); // No auth configured
    const provided = req.headers['x-api-key'] || req.query.apiKey;
    if (provided !== apiKey) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Provide x-api-key header.' });
    }
    next();
  };
}
