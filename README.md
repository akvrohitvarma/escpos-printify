# 🖨️ ESC/POS Printify

A complete receipt printing solution with a beautiful web interface. Print notes, QR codes, grocery lists, reminders, banners, and more to any network thermal receipt printer.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

---

## 📋 Table of Contents

- [Features](#-features)
- [Requirements](#-requirements)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
  - [Option 1: Docker (Recommended)](#option-1-docker-recommended)
  - [Option 2: Manual Installation](#option-2-manual-installation)
- [Configuration](#-configuration)
- [Using the Web Interface](#-using-the-web-interface)
- [API Documentation](#-api-documentation)
  - [Print Endpoint](#print-endpoint)
  - [Health Check](#health-check)
  - [Template Reference](#template-reference)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎨 **Beautiful Web UI** | Modern, responsive interface for creating prints |
| 📝 **6 Templates** | Post-it, Reminder, Grocery, QR Code, Banner, Image |
| 📱 **6 QR Code Types** | URL, Text, Email, SMS, WiFi, vCard |
| 🖼️ **Image Printing** | Upload and print images with dithering |
| 🔗 **REST API** | Simple JSON API for automation |
| 🐳 **Docker Ready** | One-command deployment |
| ⚡ **Fast** | Server-side rendering for efficiency |

---

## 📦 Requirements

### Hardware
- **Thermal Receipt Printer** with network connectivity (Ethernet/WiFi)
  - Common brands: Epson TM-T20, Star TSP, Xprinter, etc.
  - Must support ESC/POS protocol (most do)
  - Must be connected to your network (not USB)

### Software
- **Node.js 18+** (for manual installation)
- **Docker** (for containerized deployment)

### Network
- Printer and server must be on the same network
- Know your printer's IP address (usually found in printer settings or network config)

---

## 🚀 Quick Start

### Using Docker (Fastest)

```bash
docker run -d \
  --name escpos-printify \
  -p 3000:3000 \
  -e PRINTER_HOST=192.168.1.100 \
  akvrohitvarma/escpos-printify:latest
```

Replace `192.168.1.100` with your printer's IP address.

Open `http://localhost:3000` in your browser.

---

## 📥 Installation

### Option 1: Docker (Recommended)

#### Step 1: Install Docker

**Windows:**
1. Download [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Run the installer
3. Restart your computer
4. Open Docker Desktop

**Mac:**
1. Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. Drag to Applications folder
3. Open Docker Desktop

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://get.docker.com | sh
```

#### Step 2: Find Your Printer's IP Address

Your printer needs to be connected to your network. To find its IP:

1. **Print a network config page** from your printer (usually hold feed button while powering on)
2. **Check your router's** connected devices list
3. **Use a network scanner** app like "Fing" on your phone

Example: `192.168.1.100`

#### Step 3: Run the Container

```bash
docker run -d \
  --name escpos-printify \
  -p 3000:3000 \
  -e PRINTER_HOST=192.168.1.100 \
  -e PRINTER_PORT=9100 \
  akvrohitvarma/escpos-printify:latest
```

#### Step 4: Open the Web Interface

Open your browser and go to:
```
http://localhost:3000
```

You should see the ESC/POS Printify web interface!

---

### Option 2: Manual Installation

#### Step 1: Install Node.js

**Windows:**
1. Download [Node.js](https://nodejs.org/) (LTS version)
2. Run the installer
3. Open Command Prompt and verify: `node --version`

**Mac:**
```bash
brew install node
```

**Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs
```

#### Step 2: Clone the Repository

```bash
git clone https://github.com/akvrohitvarma/escpos-printify.git
cd escpos-printify
```

#### Step 3: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd web
npm install
cd ..
```

#### Step 4: Configure the Printer

Create a `.env` file in the project root:

```bash
# Copy the example
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Your printer's IP address (REQUIRED)
PRINTER_HOST=192.168.1.100

# Printer port (usually 9100)
PRINTER_PORT=9100

# Server port
PORT=3000
```

#### Step 5: Start the Server

**Development mode (with hot reload):**
```bash
# Terminal 1: Start backend
node server.js

# Terminal 2: Start frontend
cd web
npm run dev
```

**Production mode:**
```bash
# Build frontend
cd web
npm run build
cd ..

# Add static serving to server (or use nginx)
node server.js
```

---

## ⚙️ Configuration

All configuration is done via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PRINTER_HOST` | `192.168.1.100` | **Your printer's IP address** |
| `PRINTER_PORT` | `9100` | Printer port (rarely needs changing) |
| `PORT` | `3000` | Web server port |
| `IMAGE_WIDTH` | `512` | Print width in pixels (58mm ≈ 384px, 80mm ≈ 512px) |
| `PRINTER_TIMEOUT` | `10000` | Connection timeout in milliseconds |
| `RATE_LIMIT_MAX` | `30` | Maximum prints per minute |
| `RATE_LIMIT_WINDOW` | `60000` | Rate limit window in milliseconds |

### Setting Environment Variables

**Docker:**
```bash
docker run -e PRINTER_HOST=192.168.1.100 -e PORT=3000 ...
```

**Manual (.env file):**
```env
PRINTER_HOST=192.168.1.100
PORT=3000
```

---

## 🖥️ Using the Web Interface

### 1. Choose a Template

Click on any template icon in the grid:

| Icon | Template | Description |
|------|----------|-------------|
| 📝 | Post-it | Simple notes with title and message |
| ⏰ | Reminder | Tasks with flags, dates, and optional QR |
| 🛒 | Grocery | Shopping list with checkboxes |
| 📲 | QR Code | 6 types: URL, Text, Email, SMS, WiFi, vCard |
| 🖼️ | Image | Upload and print any image |
| 📜 | Banner | Large text printed vertically |

### 2. Customize Your Print

Fill in the form fields that appear. Each template has different options.

### 3. Preview

The right panel shows a live preview of exactly what will print.

### 4. Print!

Click the **Print Receipt** button. The printer will produce your output!

---

## 📡 API Documentation

The server provides a REST API for automation and integration.

### Print Endpoint

**URL:** `POST /print`

**Headers:**
```
Content-Type: application/json
```

**Base Request Body:**
```json
{
  "template": "postit",
  "copies": 1
}
```

---

### Template Reference

#### 📝 Post-it Note

Simple note with title and message.

```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "postit",
    "title": "Remember!",
    "body": "Pick up groceries on the way home"
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Note title |
| `body` | string | Yes | Note content |

---

#### ⏰ Reminder

Task reminder with priority flags and optional deadline.

```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "reminder",
    "title": "Submit Report",
    "body": "Complete the quarterly financial report",
    "flag": "urgent",
    "showPrintedAt": true,
    "showFinishBy": true,
    "finishByDate": "2026-01-25",
    "finishByTime": "17:00"
  }'
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | string | Yes | - | Reminder title |
| `body` | string | Yes | - | Reminder description |
| `flag` | string | No | `none` | Priority: `urgent`, `important`, `emergency`, `custom`, `none` |
| `customFlag` | string | No | - | Custom flag text (when flag=custom) |
| `showPrintedAt` | boolean | No | `true` | Show print timestamp |
| `showFinishBy` | boolean | No | `false` | Show deadline |
| `finishByDate` | string | No | - | Deadline date (YYYY-MM-DD) |
| `finishByTime` | string | No | - | Deadline time (HH:MM) |
| `showQrCode` | boolean | No | `false` | Include QR code |
| `qrType` | string | No | `url` | QR type (see QR Code section) |
| `qrData` | object | No | - | QR data (see QR Code section) |

---

#### 🛒 Grocery List

Shopping list with checkboxes.

```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "grocery",
    "title": "Weekend Shopping",
    "items": ["Milk", "Bread", "Eggs", "Butter", "Cheese", "Apples"]
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | List title (default: "Shopping List") |
| `items` | array | Yes | Array of item strings |

---

#### 📲 QR Code

Generate and print QR codes. Supports 6 types.

**URL QR Code:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "qrcode",
    "qrType": "url",
    "qrLabel": "Visit Our Website",
    "qrData": {
      "url": "https://example.com"
    }
  }'
```

**WiFi QR Code:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "qrcode",
    "qrType": "wifi",
    "qrLabel": "Guest WiFi",
    "qrData": {
      "ssid": "MyNetwork",
      "password": "secret123",
      "security": "WPA"
    }
  }'
```

**vCard (Contact) QR Code:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "qrcode",
    "qrType": "vcard",
    "qrLabel": "My Contact",
    "qrData": {
      "name": "John Doe",
      "phone": "+1234567890",
      "email": "john@example.com",
      "org": "Acme Inc"
    }
  }'
```

**QR Data Fields by Type:**

| qrType | qrData Fields |
|--------|---------------|
| `url` | `{ url: "https://..." }` |
| `text` | `{ text: "Hello World" }` |
| `email` | `{ to: "email@...", subject: "...", body: "..." }` |
| `sms` | `{ phone: "+123...", message: "..." }` |
| `wifi` | `{ ssid: "NetworkName", password: "...", security: "WPA/WEP/nopass" }` |
| `vcard` | `{ name: "...", phone: "...", email: "...", org: "..." }` |

---

#### 🖼️ Image

Print an uploaded image.

```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "image",
    "image": "data:image/png;base64,iVBORw0KGgo...",
    "caption": "Company Logo"
  }'
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | string | Yes | Base64 data URL of image |
| `caption` | string | No | Caption below image |

---

#### 📜 Banner

Large text printed vertically for banners.

```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "banner",
    "title": "SALE TODAY",
    "fontSize": "400"
  }'
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | string | Yes | - | Banner text (spaces create word breaks) |
| `fontSize` | string | No | `400` | Font size: `200`, `300`, `400`, `500` |
---

### Health Check

Check if the server is running and printer is configured.

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "printerHost": "192.168.1.100",
  "browserConnected": true
}
```

---

### Response Format

**Success:**
```json
{
  "success": true,
  "template": "postit",
  "copies": 1
}
```

**Error:**
```json
{
  "success": false,
  "error": "Printer connection failed: ETIMEDOUT"
}
```

---

## 🔧 Troubleshooting

### "Printer connection failed"

1. **Check printer IP:** Make sure `PRINTER_HOST` matches your printer
2. **Check network:** Printer and server must be on same network
3. **Check port:** Most printers use 9100, some use 515 or 631
4. **Ping test:** `ping 192.168.1.100` (use your printer's IP)

### "Rate limit exceeded"

You're printing too fast. Wait a minute or increase `RATE_LIMIT_MAX`.

### Blurry or small prints

Adjust `IMAGE_WIDTH`:
- 58mm paper: `IMAGE_WIDTH=384`
- 80mm paper: `IMAGE_WIDTH=512`

### Docker container won't start

1. Make sure Docker is running
2. Check logs: `docker logs escpos-printify`
3. Verify port 3000 is free: `lsof -i :3000`

### Web interface shows error

1. Check if server is running
2. Open browser console (F12) for error details
3. Check server logs for errors

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

Made with ❤️ by Kumara Venkata
