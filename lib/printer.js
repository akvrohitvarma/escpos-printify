import escpos from 'escpos';
import Network from 'escpos-network';

escpos.Network = Network;

// Try to load USB support (optional — requires native usb library)
let USBAdapter = null;
try {
  const mod = await import('escpos-usb');
  USBAdapter = mod.default || mod;
  escpos.USB = USBAdapter;
} catch {
  // USB support not available
}

/**
 * Check if USB printing is supported
 */
export function isUsbSupported() {
  return USBAdapter !== null;
}

/**
 * List connected USB printers
 */
export function listUsbPrinters() {
  if (!USBAdapter) return [];
  try {
    const devices = USBAdapter.findPrinter();
    return devices.map(d => ({
      vendorId: d.deviceDescriptor.idVendor,
      productId: d.deviceDescriptor.idProduct,
      manufacturer: d.deviceDescriptor.iManufacturer || 'Unknown',
      product: d.deviceDescriptor.iProduct || 'USB Printer',
    }));
  } catch {
    return [];
  }
}

/**
 * Create a printer device based on connection config
 */
function createDevice(config) {
  if (config.type === 'usb') {
    if (!USBAdapter) throw new Error('USB printing not available on this system');
    return new escpos.USB(config.vendorId, config.productId);
  }
  return new escpos.Network(config.host, config.port);
}

// Print queue mutex
let printLock = Promise.resolve();

/**
 * Print an image buffer to the receipt printer
 * @param {Buffer} imageBuffer - PNG image buffer
 * @param {Object} connectionConfig - { type: 'network'|'usb', host, port, vendorId, productId }
 * @param {number} copies - Number of copies (1-10)
 * @param {number} timeout - Connection timeout in ms
 * @returns {Promise<void>}
 */
export function printImage(imageBuffer, connectionConfig, copies = 1, timeout = 10000) {
  // Queue the job to prevent concurrent printer access
  const job = printLock.then(() => executePrint(imageBuffer, connectionConfig, copies, timeout));
  printLock = job.catch(() => {}); // Keep the chain going even on error
  return job;
}

async function executePrint(imageBuffer, connectionConfig, copies, timeout) {
  // Convert buffer to data URL for escpos.Image.load
  const dataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;

  const image = await new Promise((resolve, reject) => {
    escpos.Image.load(dataUrl, (loadedImage) => {
      if (!loadedImage) reject(new Error('Failed to load image for printing'));
      else resolve(loadedImage);
    });
  });

  const device = createDevice(connectionConfig);

  return new Promise((resolve, reject) => {
    const printer = new escpos.Printer(device);

    const timer = setTimeout(() => {
      try { device.close(); } catch {}
      reject(new Error('Printer connection timeout'));
    }, timeout);

    device.open((err) => {
      clearTimeout(timer);
      if (err) return reject(new Error(`Printer connection failed: ${err.message}`));

      try {
        for (let i = 0; i < copies; i++) {
          printer.align('CT');
          printer.raster(image);
          printer.feed(2);
          printer.cut();
        }
        printer.close(() => resolve());
      } catch (printErr) {
        try { device.close(); } catch {}
        reject(new Error(`Print failed: ${printErr.message}`));
      }
    });
  });
}
