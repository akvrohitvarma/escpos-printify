import QRCode from 'qrcode';

const FONT = 'Inter, sans-serif';
const WIDTH = 512;

// Base wrapper style — all templates use this (Satori needs explicit flex-direction: column)
const borderStyle = `width: ${WIDTH}px; display: flex; flex-direction: column; box-sizing: border-box; border: 2px solid #000; border-radius: 20px; background: #fff; color: #000; font-family: ${FONT}; margin: 0; padding: 20px;`;

// ── Helpers ───────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export function buildQrContent(payload) {
  const { qrType = 'url', qrData = {} } = payload;
  switch (qrType) {
    case 'url':   return qrData.url || 'https://example.com';
    case 'text':  return qrData.text || '';
    case 'email': return `mailto:${qrData.to || ''}?subject=${encodeURIComponent(qrData.subject || '')}&body=${encodeURIComponent(qrData.body || '')}`;
    case 'sms':   return `sms:${qrData.phone || ''}?body=${encodeURIComponent(qrData.message || '')}`;
    case 'wifi':  return `WIFI:T:${qrData.security || 'WPA'};S:${qrData.ssid || ''};P:${qrData.password || ''};;`;
    case 'vcard': return `BEGIN:VCARD\nVERSION:3.0\nN:${qrData.name || ''}\nFN:${qrData.name || ''}\nTEL:${qrData.phone || ''}\nEMAIL:${qrData.email || ''}\nORG:${qrData.org || ''}\nEND:VCARD`;
    default:      return qrData.url || qrData.text || 'https://example.com';
  }
}

async function qrDataUrl(content, size = 350) {
  try { return await QRCode.toDataURL(content, { width: size, margin: 1 }); }
  catch { return null; }
}

// ── Templates ─────────────────────────────────────────────

async function renderReminder(payload) {
  const {
    title = '', body = '', flag = 'none', customFlag = '',
    showPrintedAt = true, showFinishBy = false,
    finishByDate, finishByTime,
    showQrCode = false, qrType, qrData,
  } = payload;

  const flagLabels = { urgent: 'URGENT', important: 'IMPORTANT', emergency: 'EMERGENCY', custom: customFlag || 'REMINDER', none: '' };
  const flagText = flagLabels[flag] || '';
  const showFlag = flag !== 'none' && flagText;

  let qrImg = null;
  if (showQrCode && qrData) {
    const content = buildQrContent({ qrType, qrData });
    qrImg = await qrDataUrl(content, 200);
  }

  const now = new Date();
  const printedAt = `${formatDate(now.toISOString().split('T')[0])} • ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;

  // Build sections array — Satori needs explicit flex on all multi-child containers
  const sections = [];

  if (showFlag) {
    sections.push(`<div style="display: flex; justify-content: center; align-items: center; background: #000; color: #fff; padding: 20px;"><p style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 4px;">${flagText}</p></div>`);
  }

  sections.push(`<div style="display: flex; flex-direction: column; align-items: center; padding: 25px;"><h2 style="margin: 0 0 15px; font-size: 36px; font-weight: bold; text-align: center;">${title}</h2><p style="font-size: 24px; text-align: center; margin: 0; opacity: 0.7; line-height: 1.4;">${body}</p></div>`);

  if (showQrCode && qrImg) {
    sections.push(`<div style="display: flex; flex-direction: column; align-items: center; padding: 20px; border-top: 2px dashed #000;"><img src="${qrImg}" width="200" height="200" /><p style="margin: 10px 0 0; font-size: 14px; color: #666;">Scan for more info</p></div>`);
  }

  if (showPrintedAt || showFinishBy) {
    sections.push(`<div style="display: flex; flex-direction: row; justify-content: space-between; padding: 20px 25px; border-top: 2px dashed #000; font-size: 16px;">${showPrintedAt ? `<div style="display: flex; flex-direction: column;"><span style="font-weight: bold;">Printed:</span><span>${printedAt}</span></div>` : '<div style="display:flex;"></div>'}${showFinishBy ? `<div style="display: flex; flex-direction: column; align-items: flex-end;"><span style="font-weight: bold;">Finish By:</span><span>${formatDate(finishByDate)} • ${formatTime(finishByTime)}</span></div>` : '<div style="display:flex;"></div>'}</div>`);
  }

  return `<div style="${borderStyle} padding: 0; overflow: hidden;">${sections.join('')}</div>`;
}

function renderPostit(payload) {
  const { title = 'Note', body = '' } = payload;
  return `
    <div style="${borderStyle} text-align: center; padding: 35px;">
      <h2 style="margin: 0 0 20px; font-size: 48px; font-weight: bold;">${title}</h2>
      <p style="margin: 0; font-size: 32px; line-height: 1.4;">${body}</p>
    </div>
  `;
}

function renderGrocery(payload) {
  const { title = 'Shopping List', items = [] } = payload;
  const itemsHtml = items.map(item => `
    <div style="display: flex; flex-direction: row; align-items: center; margin: 12px 0; font-size: 28px;">
      <div style="display: flex; width: 28px; height: 28px; border: 3px solid #000; border-radius: 6px; margin-right: 15px; flex-shrink: 0;"></div>
      <span style="display: flex;">${item}</span>
    </div>
  `).join('');

  return `
    <div style="${borderStyle} display: flex; flex-direction: column; padding: 30px;">
      <h2 style="margin: 0 0 20px; font-size: 40px; font-weight: bold; text-align: center;">${title}</h2>
      <div style="display: flex; flex-direction: column;">${itemsHtml}</div>
    </div>
  `;
}

function renderBanner(payload) {
  const { title = 'HELLO', fontSize = '400' } = payload;
  const words = title.trim().split(/\s+/).filter(w => w);
  const fs = parseInt(fontSize) || 400;

  return `
    <div style="width: ${WIDTH}px; display: flex; flex-direction: column; align-items: center; background: #fff; color: #000; font-family: ${FONT}; margin: 0; padding: 0;">
      ${words.map((word, wi) => `
        <div style="display: flex; flex-direction: column; align-items: center; padding: 20px 0;${wi < words.length - 1 ? ' border-bottom: 2px dashed #ccc;' : ''}">
          ${word.split('').map(ch => `
            <span style="font-size: ${fs}px; font-weight: 900; line-height: 0.85;">${ch}</span>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

async function renderQrCode(payload) {
  const { qrLabel = '', qrType = 'url', qrData = {} } = payload;
  const typeLabels = { url: 'URL', text: 'Text', email: 'Email', sms: 'SMS', wifi: 'WiFi', vcard: 'Contact' };

  const content = buildQrContent({ qrType, qrData });
  const qrImg = await qrDataUrl(content, 350);

  return `
    <div style="${borderStyle} text-align: center; padding: 30px; align-items: center;">
      <h2 style="margin: 0 0 10px; font-size: 36px; font-weight: bold;">QR Code</h2>
      <p style="margin: 0 0 20px; font-size: 20px; color: #666;">${typeLabels[qrType] || 'QR Code'}</p>
      ${qrImg ? `<img src="${qrImg}" width="350" height="350" />` : '<p>No QR code</p>'}
      ${qrLabel ? `<p style="margin: 25px 0 0; font-size: 28px; font-weight: bold;">${qrLabel}</p>` : ''}
    </div>
  `;
}

function renderImage(payload) {
  const { image, caption = '' } = payload;
  return `
    <div style="${borderStyle} text-align: center; padding: 20px; align-items: center;">
      ${image ? `<img src="${image}" width="472" />` : '<p style="font-size: 18px; padding: 50px 0; background: #f0f0f0; border-radius: 10px;">No image</p>'}
      ${caption ? `<p style="margin: 20px 0 0; font-size: 24px;">${caption}</p>` : ''}
    </div>
  `;
}

function renderTicTacToe() {
  const cellStyle = (row, col) => {
    const borderRight = col < 2 ? 'border-right: 4px solid #000;' : '';
    const borderBottom = row < 2 ? 'border-bottom: 4px solid #000;' : '';
    return `display: flex; width: 120px; height: 120px; ${borderRight} ${borderBottom}`;
  };

  return `<div style="${borderStyle} align-items: center;"><h2 style="margin: 0 0 25px; font-size: 48px; font-weight: bold;">Tic Tac Toe</h2><div style="display: flex; flex-direction: column;">${[0, 1, 2].map(row => `<div style="display: flex; flex-direction: row;">${[0, 1, 2].map(col => `<div style="${cellStyle(row, col)}"></div>`).join('')}</div>`).join('')}</div></div>`;
}

function renderSudoku(payload) {
  const { puzzle, solution, difficulty = 'medium' } = payload;

  const renderGrid = (grid, cellSize, fontSize) => {
    if (!grid) return '<p>No puzzle data</p>';
    return `
      <div style="display: flex; flex-direction: column; border-top: 3px solid #000; border-left: 3px solid #000;">
        ${[0,1,2,3,4,5,6,7,8].map(row => `
          <div style="display: flex; flex-direction: row;">
            ${[0,1,2,3,4,5,6,7,8].map(col => {
              const val = grid[row * 9 + col];
              const bRight = (col + 1) % 3 === 0 ? '3px solid #000' : '1px solid #999';
              const bBottom = (row + 1) % 3 === 0 ? '3px solid #000' : '1px solid #999';
              return `<div style="width: ${cellSize}px; height: ${cellSize}px; display: flex; align-items: center; justify-content: center; font-size: ${fontSize}px; font-weight: bold; border-right: ${bRight}; border-bottom: ${bBottom};">${val === '-' ? '' : val}</div>`;
            }).join('')}
          </div>
        `).join('')}
      </div>
    `;
  };

  return `
    <div style="${borderStyle} text-align: center; padding: 25px; align-items: center;">
      <h2 style="margin: 0 0 15px; font-size: 36px; font-weight: bold;">Sudoku Puzzle</h2>
      <p style="margin: 0 0 20px; font-size: 20px;">Difficulty: ${difficulty.toUpperCase()}</p>
      ${renderGrid(puzzle, 45, 28)}
      <div style="display: flex; flex-direction: column; align-items: center; margin-top: 30px; padding-top: 20px; border-top: 2px dashed #000; width: 100%;">
        <p style="margin: 0 0 15px; font-size: 20px; font-weight: bold;">Solution</p>
        ${renderGrid(solution, 35, 20)}
      </div>
    </div>
  `;
}

// ── Main entry point ──────────────────────────────────────

/**
 * Generate Satori-compatible HTML from a structured JSON payload.
 * @param {Object} payload - Must include a `template` field.
 * @returns {Promise<string>} HTML string
 */
export async function generateHtml(payload) {
  const { template } = payload;

  switch (template) {
    case 'reminder':   return renderReminder(payload);
    case 'postit':     return renderPostit(payload);
    case 'grocery':    return renderGrocery(payload);
    case 'banner':     return renderBanner(payload);
    case 'qrcode':     return renderQrCode(payload);
    case 'image':      return renderImage(payload);
    case 'tictactoe':  return renderTicTacToe();
    case 'sudoku':     return renderSudoku(payload);
    default:
      throw new Error(`Unknown template: ${template}`);
  }
}
