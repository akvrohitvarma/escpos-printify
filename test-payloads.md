# Test JSON Payloads for ESC/POS Print Server

Use these with: `curl -X POST http://localhost:3000/print -H "Content-Type: application/json" -d '<json>'`

---

## 1. Reminder (with dates)
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"reminder","title":"Submit Report","body":"Complete quarterly report","flag":"urgent","showPrintedAt":true,"showFinishBy":true,"finishByDate":"2026-01-25","finishByTime":"17:00"}'
```

## 2. Reminder with QR Code (URL)
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"reminder","title":"Team Meeting","body":"Join via the link","flag":"important","showPrintedAt":true,"showQrCode":true,"qrType":"url","qrData":{"url":"https://meet.google.com/abc-defg-hij"}}'
```

## 3. Post-it Note
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"postit","title":"Remember!","body":"Pick up groceries"}'
```

## 4. Grocery List
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"grocery","title":"Weekend Shopping","items":["Milk","Bread","Eggs","Butter","Cheese"]}'
```

## 5. Banner
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"banner","title":"SALE TODAY","fontSize":"400"}'
```

## 6. QR Code - URL
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"qrcode","qrType":"url","qrLabel":"Visit Website","qrData":{"url":"https://example.com"}}'
```

## 7. QR Code - WiFi
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"qrcode","qrType":"wifi","qrLabel":"Guest WiFi","qrData":{"ssid":"MyNetwork","password":"secret123","security":"WPA"}}'
```

## 8. QR Code - vCard
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"qrcode","qrType":"vcard","qrLabel":"My Contact","qrData":{"name":"John Doe","phone":"+1234567890","email":"john@example.com","org":"Acme Inc"}}'
```

## 9. QR Code - Email
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"qrcode","qrType":"email","qrLabel":"Email Us","qrData":{"to":"support@example.com","subject":"Hello","body":"I have a question"}}'
```

## 10. QR Code - SMS
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"qrcode","qrType":"sms","qrLabel":"Text Us","qrData":{"phone":"+1234567890","message":"Hello!"}}'
```

## 11. Tic Tac Toe
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"tictactoe"}'
```

## 12. Multiple Copies
```bash
curl -X POST http://localhost:3000/print \
  -H "Content-Type: application/json" \
  -d '{"template":"postit","title":"Batch Print","body":"3 copies!","copies":3}'
```

## 13. Health Check
```bash
curl http://localhost:3000/health
```

---

## JSON Schema Reference

### QR Data Fields by Type

| Type | qrData Fields |
|------|---------------|
| `url` | `{ url: "https://..." }` |
| `text` | `{ text: "Hello World" }` |
| `email` | `{ to, subject, body }` |
| `sms` | `{ phone, message }` |
| `wifi` | `{ ssid, password, security }` |
| `vcard` | `{ name, phone, email, org }` |
