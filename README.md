# ESC/POS Printify

Turn any thermal receipt printer into a smart notification printer. Send structured data via API, get beautiful printed receipts -- reminders, lists, QR codes, images, and more.

Think of it as **ntfy.sh, but for paper**. Automate reminders, shopping lists, daily agendas, or anything else you want printed on a receipt.

---

## What It Does

You send a JSON payload to the server. The server renders it into a black-and-white dithered image optimized for thermal printers, then prints it.

```
Your App / Automation / cURL
        |
        v  POST /print  (JSON payload)
   +--------------+
   |  server.js   |  Express server
   |              |
   |  templates   |  Generates Satori-compatible HTML
   |  renderer    |  HTML -> SVG -> PNG -> Dithered B&W
   |  printer     |  Sends ESC/POS commands over network/USB
   +------+-------+
          |
          v  Port 9100 (RAW)
   +--------------+
   |   Printer    |  Any ESC/POS thermal printer
   +--------------+
```

It also has a **web UI** at `http://localhost:3000` where you can pick templates, customize fields, preview, and print -- no terminal needed.

---

## Quick Start

### Option 1: Docker (recommended)

```bash
docker run -d \
  --name escpos-printify \
  -p 3000:3000 \
  -e PRINTER_HOST=192.168.1.100 \
  akvrohitvarma/escpos-printify:latest
```

Replace `192.168.1.100` with your printer's IP address.

Open `http://localhost:3000` in your browser.

### Option 2: Docker Compose

```bash
git clone https://github.com/AKVorrat/escpos-printify.git
cd escpos-printify
```

Edit `docker-compose.yml` and set `PRINTER_HOST` to your printer's IP, then:

```bash
docker compose up -d
```

### Option 3: Run Locally (no Docker)

**Requirements:** Node.js 20+, a thermal printer on your network.

```bash
git clone https://github.com/AKVorrat/escpos-printify.git
cd escpos-printify

# Install backend dependencies
npm install

# Install and build the web frontend
cd web && npm install && npm run build && cd ..

# Configure your printer IP
cp .env.example .env
# Edit .env and set PRINTER_HOST to your printer's IP

# Start the server
npm start
```

Open `http://localhost:3000`.

---

## Configuration

All settings are configured via environment variables (or the `.env` file):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `PRINTER_HOST` | `192.168.1.100` | Your printer's IP address |
| `PRINTER_PORT` | `9100` | Printer RAW port (almost always 9100) |
| `IMAGE_WIDTH` | `512` | Print width in pixels. `384` for 58mm paper, `512` for 80mm paper |
| `PRINTER_TIMEOUT` | `10000` | Connection timeout in milliseconds |
| `RATE_LIMIT_MAX` | `30` | Max print requests per window |
| `RATE_LIMIT_WINDOW` | `60000` | Rate limit window in ms (default: 1 minute) |
| `MAX_CONCURRENT_RENDERS` | `3` | Max simultaneous renders (prevents memory exhaustion) |
| `API_KEY` | *(empty)* | If set, all print/preview requests require this key |
| `CORS_ORIGINS` | *(empty)* | Comma-separated allowed origins. Empty = localhost only |

---

## Using the Web UI

1. Open `http://localhost:3000` in your browser
2. Pick a template from the grid (Post-it, Reminder, QR Code, etc.)
3. Fill in the fields on the left
4. See the live preview on the right
5. Click **Print Receipt**

The **Settings** panel (gear icon, top-right) lets you:
- Enter an **API Key** if the server requires one
- Switch between **Network** and **USB** printer connections

---

## API Reference

The server exposes a REST API so you can print from any language, script, or automation tool. All print requests are `POST` with a JSON body.

### Base URL

```
http://localhost:3000
```

### Authentication

If `API_KEY` is set on the server, include it as a header in every request:

```
x-api-key: your-secret-key-here
```

If `API_KEY` is not set, no authentication is needed.

---

### `POST /print` -- Print a receipt

Renders the template and sends it to the printer.

**Headers:**
```
Content-Type: application/json
x-api-key: your-key          (only if API_KEY is configured)
```

**Body fields (common to all templates):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `template` | string | Yes | Template name (see below) |
| `copies` | number | No | Number of copies, 1-10. Default: `1` |

**Success response:**
```json
{ "success": true, "template": "postit", "copies": 1 }
```

**Error response:**
```json
{ "success": false, "error": "Description of what went wrong" }
```

---

### `POST /preview` -- Get a PNG preview (no printing)

Same body as `/print`. Returns a PNG image instead of printing.

```bash
curl -X POST http://localhost:3000/preview \
  -H "Content-Type: application/json" \
  -d '{"template":"postit","title":"Hello","body":"World"}' \
  --output preview.png
```

Open `preview.png` to see exactly what would be printed.

---

### `GET /health` -- Health check

```bash
curl http://localhost:3000/health
```

Returns:
```json
{
  "status": "ok",
  "printerHost": "192.168.0.5",
  "printerType": "network",
  "usbSupported": false
}
```

---

### `GET /config` -- Server configuration

```bash
curl http://localhost:3000/config
```

Returns:
```json
{
  "imageWidth": 512,
  "printerHost": "192.168.0.5",
  "printerPort": 9100,
  "usbSupported": false,
  "authRequired": false
}
```

---

### `GET /printers/usb` -- List USB printers

```bash
curl http://localhost:3000/printers/usb
```

Returns a list of detected USB printers with vendor/product IDs.

---

## Templates

Below is every template the server supports, with all fields and copy-paste examples.

### 1. Post-it Note (`postit`)

A simple note with a title and message.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | Heading. Default: `"Note"` |
| `body` | string | No | Message text |

```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "postit",
    "title": "Remember!",
    "body": "Pick up groceries after work"
  }'
```

---

### 2. Reminder (`reminder`)

A task reminder with optional priority flag, finish-by date, and QR code.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | Reminder title |
| `body` | string | No | Description text |
| `flag` | string | No | Priority: `"urgent"`, `"important"`, `"emergency"`, `"custom"`, `"none"` |
| `customFlag` | string | No | Custom flag text (only when `flag` is `"custom"`) |
| `showPrintedAt` | boolean | No | Show print timestamp. Default: `true` |
| `showFinishBy` | boolean | No | Show deadline. Default: `false` |
| `finishByDate` | string | No | Deadline date in `YYYY-MM-DD` format |
| `finishByTime` | string | No | Deadline time in `HH:MM` format (24-hour) |
| `showQrCode` | boolean | No | Include a QR code. Default: `false` |
| `qrType` | string | No | QR content type (see QR Code template for types) |
| `qrData` | object | No | QR content fields (see QR Code template for fields) |

```bash
# Simple urgent reminder with a deadline
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "reminder",
    "title": "Submit Report",
    "body": "Complete quarterly report and send to manager",
    "flag": "urgent",
    "showPrintedAt": true,
    "showFinishBy": true,
    "finishByDate": "2026-04-05",
    "finishByTime": "17:00"
  }'
```

```bash
# Reminder with a QR code link
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "reminder",
    "title": "Team Meeting",
    "body": "Join via the link below",
    "flag": "important",
    "showQrCode": true,
    "qrType": "url",
    "qrData": {"url": "https://meet.google.com/abc-defg-hij"}
  }'
```

---

### 3. Grocery List (`grocery`)

A checklist with empty checkboxes -- great for shopping lists or to-do lists.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | List heading. Default: `"Shopping List"` |
| `items` | string[] | Yes | Array of item names |

```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "grocery",
    "title": "Weekend Shopping",
    "items": ["Milk", "Bread", "Eggs", "Butter", "Cheese", "Tomatoes"]
  }'
```

---

### 4. Banner (`banner`)

Giant vertical text -- each character printed huge, one per line. Great for signs or labels.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | Text to display. Default: `"HELLO"` |
| `fontSize` | string | No | Size in pixels: `"200"`, `"300"`, `"400"`, `"500"`. Default: `"400"` |

```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "banner",
    "title": "SALE",
    "fontSize": "500"
  }'
```

---

### 5. QR Code (`qrcode`)

Generate and print a QR code. Supports 6 content types.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `qrType` | string | Yes | One of: `"url"`, `"text"`, `"email"`, `"sms"`, `"wifi"`, `"vcard"` |
| `qrLabel` | string | No | Text printed below the QR code |
| `qrData` | object | Yes | Content fields (depends on `qrType`, see table below) |

**`qrData` fields by type:**

| qrType | Fields | Example |
|--------|--------|---------|
| `url` | `url` | `{"url": "https://example.com"}` |
| `text` | `text` | `{"text": "Hello World"}` |
| `email` | `to`, `subject`, `body` | `{"to": "a@b.com", "subject": "Hi", "body": "Hello"}` |
| `sms` | `phone`, `message` | `{"phone": "+1234567890", "message": "Hey!"}` |
| `wifi` | `ssid`, `password`, `security` | `{"ssid": "MyWiFi", "password": "pass123", "security": "WPA"}` |
| `vcard` | `name`, `phone`, `email`, `org` | `{"name": "John", "phone": "+123", "email": "j@b.com"}` |

```bash
# WiFi QR code -- guests scan to connect
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "qrcode",
    "qrType": "wifi",
    "qrLabel": "Guest WiFi",
    "qrData": {
      "ssid": "CoffeeShop",
      "password": "welcome123",
      "security": "WPA"
    }
  }'
```

```bash
# Contact card QR code
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "qrcode",
    "qrType": "vcard",
    "qrLabel": "Scan to Save Contact",
    "qrData": {
      "name": "Jane Smith",
      "phone": "+1234567890",
      "email": "jane@example.com",
      "org": "Acme Corp"
    }
  }'
```

---

### 6. Image (`image`)

Print any image (photo, screenshot, diagram). The server resizes, dithers, and optimizes it for thermal paper automatically.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | string | Yes | Base64 data URL (e.g. `data:image/png;base64,...`) |
| `caption` | string | No | Text printed below the image |

```bash
# Convert a local file to base64 and print it
IMAGE_B64=$(base64 -i photo.jpg)
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d "{
    \"template\": \"image\",
    \"image\": \"data:image/jpeg;base64,${IMAGE_B64}\",
    \"caption\": \"Vacation photo\"
  }"
```

**Size limit:** 5MB max image size (after base64 encoding).

---

### 7. Tic Tac Toe (`tictactoe`)

Prints a blank 3x3 grid. No fields needed.

```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template": "tictactoe"}'
```

---

### 8. Sudoku (`sudoku`)

Prints a puzzle grid with the solution printed below it.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `difficulty` | string | No | `"easy"`, `"medium"`, `"hard"`, `"expert"`. Default: `"medium"` |
| `puzzle` | string | Yes | 81-character string. Digits for filled cells, `-` for blanks |
| `solution` | string | Yes | 81-character string. All digits |

The web UI generates puzzles automatically. For API use, generate the puzzle and solution strings yourself or use a library like `sudoku-gen`.

```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "sudoku",
    "difficulty": "easy",
    "puzzle":    "53--7----6--195----98----6-8---6---34--8-3--17---2---6-6----28----419--5----8--79",
    "solution":  "534678912672195348198342567859761423426853791713924856961537284287419635345286179"
  }'
```

---

### Printing Multiple Copies

Add `"copies": N` to any template (max 10):

```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{
    "template": "postit",
    "title": "Batch Print",
    "body": "This prints 3 copies",
    "copies": 3
  }'
```

---

## Automation Examples

### Print a daily reminder with cron

```bash
# Add to crontab (run: crontab -e)
# This prints every weekday at 9:00 AM
0 9 * * 1-5 curl -s -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"reminder","title":"Daily Standup","body":"Join the team call at 9:15","flag":"important"}'
```

### Print from Python

```python
import requests

requests.post("http://localhost:3000/print", json={
    "template": "reminder",
    "title": "Server Alert",
    "body": "CPU usage above 90% on prod-web-01",
    "flag": "emergency"
})
```

### Print from JavaScript (Node.js)

```javascript
await fetch("http://localhost:3000/print", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    template: "grocery",
    title: "Today's Tasks",
    items: ["Review PRs", "Deploy staging", "Update docs"]
  })
});
```

### Integrate with Home Assistant, n8n, or any webhook

Point any webhook or automation tool at `http://<your-server-ip>:3000/print` with a JSON body. That's all it takes.

---

## Project Structure

```
escpos-printify/
|-- server.js              # Express server -- routes, middleware, entry point
|-- lib/
|   |-- templates.js       # HTML generators for each template type
|   |-- renderer.js        # HTML -> SVG -> PNG -> dithered image pipeline
|   |-- printer.js         # ESC/POS protocol -- sends images to printer
|   +-- security.js        # Input validation, sanitization, auth, CORS
|-- web/                   # React + Vite frontend
|   |-- src/App.jsx        # Main UI component
|   +-- dist/              # Built production bundle (served by Express)
|-- .env.example           # Configuration template
|-- Dockerfile             # Multi-stage Docker build
|-- docker-compose.yml     # One-command deployment
+-- test-payloads.md       # Copy-paste curl examples for every template
```

---

## Printer Compatibility

Works with any thermal receipt printer that supports the ESC/POS protocol over:

- **Network (LAN):** Most common. Printer connects to your router, server sends data to port 9100.
- **USB:** Requires the `escpos-usb` package and native USB libraries. Docker USB passthrough is Linux-only.

Tested with 80mm and 58mm paper widths. Set `IMAGE_WIDTH=384` for 58mm paper.

---

## Troubleshooting

### "Printer connection failed: connect EHOSTUNREACH"
- Verify the printer IP: can you open `http://<printer-ip>` in your browser?
- Check that port 9100 is open: `nc -zv <printer-ip> 9100`
- On macOS, you may need to run `sudo npm start` for raw socket access

### "Rate limit exceeded"
- Default is 30 prints per minute. Increase `RATE_LIMIT_MAX` in `.env` if needed

### Images print without the curved border
- Update to the latest version -- older versions had a bug where image prints skipped the template border

### Printed text shows `&#x27;` instead of apostrophes
- Fixed in v2.0. Update to the latest version

---

## License

MIT
