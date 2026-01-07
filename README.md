# ESC/POS Printify

A lightweight Docker container for converting HTML to images and printing to network receipt printers via ESC/POS protocol.

## Quick Start

```bash
# Clone and run with Docker Compose
docker compose up -d

# Or pull and run directly
docker run -d \
  --name escpos-printify \
  -p 3000:3000 \
  -e PRINTER_HOST=192.168.1.100 \
  akvrohitvarma/escpos-printify:latest
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PRINTER_HOST` | 192.168.1.100 | Printer IP address |
| `PRINTER_PORT` | 9100 | Printer port |
| `PORT` | 3000 | Server port |
| `IMAGE_WIDTH` | 512 | Receipt width in pixels |
| `PRINTER_TIMEOUT` | 10000 | Connection timeout (ms) |
| `RATE_LIMIT_MAX` | 30 | Max requests per minute |

## API

**Print HTML:**
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Receipt</h1>", "copies": 1}'
```

**Health Check:**
```bash
curl http://localhost:3000/health
```

## Build Locally

```bash
docker build -t escpos-printify .
docker run -p 3000:3000 -e PRINTER_HOST=192.168.1.100 escpos-printify
```
