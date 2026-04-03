import { useState, useRef, useMemo, useEffect } from 'react'
import { getSudoku } from 'sudoku-gen'
import QRCode from 'qrcode'
import dayjs from 'dayjs'
import './index.css'

// Common border style for all templates
const borderStyle = 'width: 512px; box-sizing: border-box; border: 2px solid #000; border-radius: 20px; background: #fff; color: #000; font-family: Arial, sans-serif; margin: 0; padding: 20px;'

// Template components - all black and white for thermal receipt realism
const templates = {
  postit: {
    name: 'Post-it Note',
    icon: '📝',
    fields: [
      { name: 'title', label: 'Title', type: 'text', default: 'Note' },
      { name: 'message', label: 'Message', type: 'textarea', default: 'Remember to...' }
    ],
    render: (data) => `
      <div style="${borderStyle} padding: 30px;">
        <h2 style="margin: 0 0 20px; font-size: 48px; font-weight: bold; border-bottom: 3px dashed #000; padding-bottom: 20px;">${data.title}</h2>
        <p style="margin: 0; font-size: 32px; line-height: 1.5;">${data.message}</p>
      </div>
    `
  },
  grocery: {
    name: 'Grocery List',
    icon: '🛒',
    fields: [
      { name: 'title', label: 'List Title', type: 'text', default: 'Grocery List' },
      { name: 'items', label: 'Items (one per line)', type: 'textarea', default: 'Milk\nBread\nEggs\nButter' }
    ],
    render: (data) => `
      <div style="${borderStyle} padding: 30px;">
        <h2 style="margin: 0 0 20px; font-size: 48px; font-weight: bold; text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px;">${data.title}</h2>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${data.items.split('\n').filter(i => i.trim()).map(item =>
      `<li style="padding: 15px 0; border-bottom: 2px dashed #000; font-size: 28px;">☐ ${item}</li>`
    ).join('')}
        </ul>
      </div>
    `
  },
  reminder: {
    name: 'Reminder',
    icon: '⏰',
    fields: [
      { name: 'flagType', label: 'Flag Type', type: 'select', options: ['urgent', 'important', 'emergency', 'custom', 'none'], default: 'important' },
      { name: 'customFlag', label: 'Custom Flag Text', type: 'text', default: 'REMINDER', showWhen: 'custom' },
      { name: 'title', label: 'Title', type: 'text', default: 'Don\'t forget!' },
      { name: 'description', label: 'Description', type: 'textarea', default: 'Complete the project documentation by end of day.' },
      { name: 'showFinishBy', label: 'Show Finish By Date', type: 'checkbox', default: false },
      { name: 'finishByDate', label: 'Finish By Date', type: 'date', default: dayjs().format('YYYY-MM-DD'), showWhenChecked: 'showFinishBy' },
      { name: 'finishByTime', label: 'Finish By Time', type: 'time', default: '17:00', showWhenChecked: 'showFinishBy' },
      { name: 'showPrintedAt', label: 'Show Printed At', type: 'checkbox', default: true },
      { name: 'showQrCode', label: 'Include QR Code Link', type: 'checkbox', default: false },
      { name: 'qrUrl', label: 'QR Code URL', type: 'text', default: 'https://example.com', showWhenChecked: 'showQrCode' }
    ],
    render: (data, extra) => {
      const flagLabels = { urgent: 'URGENT', important: 'IMPORTANT', emergency: 'EMERGENCY', custom: data.customFlag || 'REMINDER', none: '' }
      const flagText = flagLabels[data.flagType] || ''
      const showFlag = data.flagType !== 'none' && flagText
      const qrDataUrl = extra?.reminderQrDataUrl || ''
      const printedAt = dayjs().format('DD-MMM-YYYY • h:mm A')
      const formattedFinishDate = data.finishByDate ? dayjs(data.finishByDate).format('DD-MMM-YYYY') : ''
      const formattedFinishTime = data.finishByTime ? dayjs(`2000-01-01 ${data.finishByTime}`).format('h:mm A') : ''

      return `
        <div style="${borderStyle} padding: 0; overflow: hidden;">
          ${showFlag ? `
            <div style="background: #000; color: #fff; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 4px; font-family: Impact, 'Arial Black', sans-serif;">${flagText}</p>
            </div>
          ` : ''}
          <div style="padding: 25px;">
            <h2 style="margin: 0 0 15px; font-size: 36px; font-weight: bold; text-align: center;">${data.title}</h2>
            <p style="font-size: 24px; text-align: center; margin: 0; opacity: 0.7; line-height: 1.4;">${data.description}</p>
          </div>
          ${data.showQrCode && qrDataUrl ? `
            <div style="text-align: center; padding: 20px; border-top: 2px dashed #000;">
              <img src="${qrDataUrl}" style="width: 200px; height: 200px; margin: 0 auto; display: block;" />
              <p style="margin: 10px 0 0; font-size: 14px; color: #666;">Scan for more info</p>
            </div>
          ` : ''}
          ${(data.showPrintedAt || data.showFinishBy) ? `
            <div style="display: flex; justify-content: space-between; padding: 20px 25px; border-top: 2px dashed #000; font-size: 16px;">
              ${data.showPrintedAt ? `<div style="text-align: left;"><strong>Printed on:</strong><br/>${printedAt}</div>` : '<div></div>'}
              ${data.showFinishBy ? `<div style="text-align: right;"><strong>Finish By:</strong><br/>${formattedFinishDate} • ${formattedFinishTime}</div>` : '<div></div>'}
            </div>
          ` : ''}
        </div>
      `
    }
  },
  tictactoe: {
    name: 'Tic Tac Toe',
    icon: '⭕',
    fields: [],
    render: () => `
      <div style="${borderStyle} text-align: center; padding: 30px;">
        <h2 style="margin: 0 0 25px; font-size: 48px; font-weight: bold;">Tic Tac Toe</h2>
        <table style="margin: 0 auto; border-collapse: collapse;">
          ${[0, 1, 2].map(() => `
            <tr>
              ${[0, 1, 2].map(() => `<td style="width: 120px; height: 120px; border: 4px solid #000; font-size: 60px;"></td>`).join('')}
            </tr>
          `).join('')}
        </table>
      </div>
    `
  },
  sudoku: {
    name: 'Sudoku Grid',
    icon: '🔢',
    fields: [
      { name: 'difficulty', label: 'Difficulty', type: 'select', options: ['easy', 'medium', 'hard', 'expert'], default: 'medium' }
    ],
    render: (data, sudokuData) => {
      const puzzle = sudokuData?.puzzle || '-'.repeat(81)
      const solution = sudokuData?.solution || '-'.repeat(81)

      const renderGrid = (values, cellSize, fontSize) => `
        <table style="margin: 0 auto; border-collapse: collapse; border: 3px solid #000;">
          ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(row => `
            <tr>
              ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(col => {
        const val = values[row * 9 + col]
        return `<td style="width: ${cellSize}px; height: ${cellSize}px; border: 1px solid #000; font-size: ${fontSize}px; text-align: center; font-weight: bold;
                  ${col % 3 === 2 && col < 8 ? 'border-right: 2px solid #000;' : ''}
                  ${row % 3 === 2 && row < 8 ? 'border-bottom: 2px solid #000;' : ''}
                ">${val === '-' ? '' : val}</td>`
      }).join('')}
            </tr>
          `).join('')}
        </table>
      `

      return `
        <div style="${borderStyle} text-align: center; padding: 25px;">
          <h2 style="margin: 0 0 15px; font-size: 36px; font-weight: bold;">Sudoku Puzzle</h2>
          <p style="margin: 0 0 20px; font-size: 20px;">Difficulty: ${data.difficulty.toUpperCase()}</p>
          ${renderGrid(puzzle, 45, 28)}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px dashed #000;">
            <p style="margin: 0 0 15px; font-size: 20px; font-weight: bold;">✂️ Solution</p>
            ${renderGrid(solution, 35, 20)}
          </div>
        </div>
      `
    }
  },
  qrcode: {
    name: 'QR Code',
    icon: '📱',
    fields: [
      { name: 'qrType', label: 'QR Type', type: 'select', options: ['url', 'text', 'email', 'sms', 'wifi', 'vcard'], default: 'url' },
      { name: 'url', label: 'URL', type: 'text', default: 'https://example.com', showWhen: 'url' },
      { name: 'text', label: 'Text Message', type: 'textarea', default: 'Hello World!', showWhen: 'text' },
      { name: 'emailTo', label: 'Email Address', type: 'text', default: 'example@email.com', showWhen: 'email' },
      { name: 'emailSubject', label: 'Subject', type: 'text', default: 'Hello', showWhen: 'email' },
      { name: 'emailBody', label: 'Body', type: 'textarea', default: 'Message content...', showWhen: 'email' },
      { name: 'smsPhone', label: 'Phone Number', type: 'text', default: '+1234567890', showWhen: 'sms' },
      { name: 'smsMessage', label: 'Message', type: 'textarea', default: 'Hello!', showWhen: 'sms' },
      { name: 'wifiSSID', label: 'Network Name (SSID)', type: 'text', default: 'MyNetwork', showWhen: 'wifi' },
      { name: 'wifiPassword', label: 'Password', type: 'text', default: '', showWhen: 'wifi' },
      { name: 'wifiSecurity', label: 'Security', type: 'select', options: ['WPA', 'WEP', 'nopass'], default: 'WPA', showWhen: 'wifi' },
      { name: 'vcardName', label: 'Full Name', type: 'text', default: 'John Doe', showWhen: 'vcard' },
      { name: 'vcardPhone', label: 'Phone', type: 'text', default: '+1234567890', showWhen: 'vcard' },
      { name: 'vcardEmail', label: 'Email', type: 'text', default: 'john@example.com', showWhen: 'vcard' },
      { name: 'vcardOrg', label: 'Organization', type: 'text', default: '', showWhen: 'vcard' },
      { name: 'label', label: 'Label (optional)', type: 'text', default: '' }
    ],
    render: (data, extra) => {
      const qrDataUrl = extra?.qrDataUrl || ''
      const typeLabels = { url: 'URL', text: 'Text', email: 'Email', sms: 'SMS', wifi: 'WiFi', vcard: 'Contact' }
      return `
        <div style="${borderStyle} text-align: center; padding: 30px;">
          <h2 style="margin: 0 0 10px; font-size: 36px; font-weight: bold;">QR Code</h2>
          <p style="margin: 0 0 20px; font-size: 20px; color: #666;">${typeLabels[data.qrType] || 'QR Code'}</p>
          ${qrDataUrl ? `<img src="${qrDataUrl}" style="width: 350px; height: 350px; margin: 0 auto; display: block;" />` : '<p style="font-size: 20px;">Generating QR...</p>'}
          ${data.label ? `<p style="margin: 25px 0 0; font-size: 28px; font-weight: bold;">${data.label}</p>` : ''}
        </div>
      `
    }
  },
  image: {
    name: 'Image',
    icon: '🖼️',
    fields: [
      { name: 'caption', label: 'Caption (optional)', type: 'text', default: '' }
    ],
    render: (data, extra) => {
      const imageDataUrl = extra?.imageDataUrl || ''
      return `
        <div style="${borderStyle} text-align: center; padding: 20px;">
          ${imageDataUrl ? `<img src="${imageDataUrl}" style="width: 100%; max-width: 472px; display: block; margin: 0 auto;" />` : '<p style="font-size: 18px; padding: 50px 0; background: #f0f0f0; border-radius: 10px;">No image selected</p>'}
          ${data.caption ? `<p style="margin: 20px 0 0; font-size: 24px;">${data.caption}</p>` : ''}
        </div>
      `
    }
  },
  banner: {
    name: 'Banner',
    icon: '📜',
    fields: [
      { name: 'text', label: 'Banner Text', type: 'text', default: 'HELLO!' },
      { name: 'fontSize', label: 'Font Size (px)', type: 'select', options: ['200', '300', '400', '500'], default: '400' }
    ],
    render: (data) => {
      const fontSize = data.fontSize || '400'
      return `
        <div style="width: 512px; background: #fff; color: #000; font-family: Impact, 'Arial Black', sans-serif; margin: 0; padding: 0; display: flex; justify-content: center;">
          <p style="margin: 0; padding: 0 0 90px 0; font-size: ${fontSize}px; font-weight: 900; line-height: 0.5; writing-mode: vertical-rl; text-orientation: mixed; white-space: nowrap;">
            ${data.text}
          </p>
        </div>
      `
    }
  }
}

// Helper to build fetch headers (includes API key if set)
function buildHeaders(apiKey) {
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers['x-api-key'] = apiKey
  return headers
}

function App() {
  const [selectedTemplate, setSelectedTemplate] = useState('postit')
  const [formData, setFormData] = useState({})
  const [printing, setPrinting] = useState(false)
  const [printAnimation, setPrintAnimation] = useState(false)
  const [message, setMessage] = useState(null)
  const [sudokuSeed, setSudokuSeed] = useState(0)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [reminderQrDataUrl, setReminderQrDataUrl] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const previewRef = useRef(null)
  const fileInputRef = useRef(null)

  // Settings
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('apiKey') || '')
  const [showSettings, setShowSettings] = useState(false)

  // USB printer state
  const [printerType, setPrinterType] = useState('network') // 'network' or 'usb'
  const [usbPrinters, setUsbPrinters] = useState([])
  const [selectedUsb, setSelectedUsb] = useState(null)
  const [usbSupported, setUsbSupported] = useState(false)

  const template = templates[selectedTemplate]

  // Fetch server config on mount
  useEffect(() => {
    fetch('/config')
      .then(r => r.json())
      .then(cfg => {
        setUsbSupported(cfg.usbSupported)
      })
      .catch(() => {})
  }, [])

  // Fetch USB printers when USB mode selected
  useEffect(() => {
    if (printerType === 'usb' && usbSupported) {
      const headers = buildHeaders(apiKey)
      fetch('/printers/usb', { headers })
        .then(r => r.json())
        .then(data => {
          setUsbPrinters(data.printers || [])
          if (data.printers?.length > 0 && !selectedUsb) {
            setSelectedUsb(data.printers[0])
          }
        })
        .catch(() => setUsbPrinters([]))
    }
  }, [printerType, usbSupported, apiKey])

  // Persist API key
  useEffect(() => {
    if (apiKey) localStorage.setItem('apiKey', apiKey)
    else localStorage.removeItem('apiKey')
  }, [apiKey])

  // Generate Sudoku puzzle
  const sudokuData = useMemo(() => {
    const difficulty = formData['sudoku_difficulty'] || 'medium'
    const validDifficulty = ['easy', 'medium', 'hard', 'expert'].includes(difficulty) ? difficulty : 'medium'
    return getSudoku(validDifficulty)
  }, [sudokuSeed, formData['sudoku_difficulty']])

  // Generate QR code content based on type
  const getQrContent = () => {
    const qrType = formData['qrcode_qrType'] || 'url'
    switch (qrType) {
      case 'url': return formData['qrcode_url'] || 'https://example.com'
      case 'text': return formData['qrcode_text'] || 'Hello World!'
      case 'email': {
        const to = formData['qrcode_emailTo'] || 'example@email.com'
        const subject = formData['qrcode_emailSubject'] || ''
        const body = formData['qrcode_emailBody'] || ''
        return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      }
      case 'sms': return `sms:${formData['qrcode_smsPhone'] || ''}?body=${encodeURIComponent(formData['qrcode_smsMessage'] || '')}`
      case 'wifi': return `WIFI:T:${formData['qrcode_wifiSecurity'] || 'WPA'};S:${formData['qrcode_wifiSSID'] || 'MyNetwork'};P:${formData['qrcode_wifiPassword'] || ''};;`
      case 'vcard': return `BEGIN:VCARD\nVERSION:3.0\nN:${formData['qrcode_vcardName'] || 'John Doe'}\nFN:${formData['qrcode_vcardName'] || 'John Doe'}\nTEL:${formData['qrcode_vcardPhone'] || ''}\nEMAIL:${formData['qrcode_vcardEmail'] || ''}\nORG:${formData['qrcode_vcardOrg'] || ''}\nEND:VCARD`
      default: return 'https://example.com'
    }
  }

  // Generate QR code when content changes
  useEffect(() => {
    const content = getQrContent()
    QRCode.toDataURL(content, { width: 400, margin: 1 })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation error:', err))
  }, [formData['qrcode_qrType'], formData['qrcode_url'], formData['qrcode_text'],
  formData['qrcode_emailTo'], formData['qrcode_emailSubject'], formData['qrcode_emailBody'],
  formData['qrcode_smsPhone'], formData['qrcode_smsMessage'],
  formData['qrcode_wifiSSID'], formData['qrcode_wifiPassword'], formData['qrcode_wifiSecurity'],
  formData['qrcode_vcardName'], formData['qrcode_vcardPhone'], formData['qrcode_vcardEmail'], formData['qrcode_vcardOrg']])

  // Generate reminder QR code when URL changes
  useEffect(() => {
    if (formData['reminder_showQrCode']) {
      const url = formData['reminder_qrUrl'] || 'https://example.com'
      QRCode.toDataURL(url, { width: 200, margin: 1 })
        .then(url => setReminderQrDataUrl(url))
        .catch(err => console.error('Reminder QR generation error:', err))
    }
  }, [formData['reminder_showQrCode'], formData['reminder_qrUrl']])

  // Handle image file upload with 512px resize
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const width = 512
        const height = Math.round((img.height / img.width) * 512)
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        setImageDataUrl(canvas.toDataURL('image/png'))
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  // Get current form values with defaults
  const getData = () => {
    const data = {}
    template.fields.forEach(field => {
      data[field.name] = formData[`${selectedTemplate}_${field.name}`] ?? field.default
    })
    return data
  }

  // Get rendered HTML (handles special templates)
  const getRenderedHtml = () => {
    const data = getData()
    if (selectedTemplate === 'sudoku') return template.render(data, sudokuData)
    if (selectedTemplate === 'qrcode') return template.render(data, { qrDataUrl })
    if (selectedTemplate === 'image') return template.render(data, { imageDataUrl })
    if (selectedTemplate === 'reminder') return template.render(data, { reminderQrDataUrl })
    return template.render(data)
  }

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [`${selectedTemplate}_${fieldName}`]: value }))
  }

  const regenerateSudoku = () => setSudokuSeed(prev => prev + 1)

  // Build structured JSON payload for printing
  const getPrintPayload = () => {
    const data = getData()
    const payload = { template: selectedTemplate }

    const buildQrData = (prefix = 'qrcode') => {
      const qrType = formData[`${prefix}_qrType`] || 'url'
      const qrData = {}
      switch (qrType) {
        case 'url': qrData.url = formData[`${prefix}_url`] || 'https://example.com'; break
        case 'text': qrData.text = formData[`${prefix}_text`] || ''; break
        case 'email':
          qrData.to = formData[`${prefix}_emailTo`] || ''
          qrData.subject = formData[`${prefix}_emailSubject`] || ''
          qrData.body = formData[`${prefix}_emailBody`] || ''
          break
        case 'sms':
          qrData.phone = formData[`${prefix}_smsPhone`] || ''
          qrData.message = formData[`${prefix}_smsMessage`] || ''
          break
        case 'wifi':
          qrData.ssid = formData[`${prefix}_wifiSSID`] || ''
          qrData.password = formData[`${prefix}_wifiPassword`] || ''
          qrData.security = formData[`${prefix}_wifiSecurity`] || 'WPA'
          break
        case 'vcard':
          qrData.name = formData[`${prefix}_vcardName`] || ''
          qrData.phone = formData[`${prefix}_vcardPhone`] || ''
          qrData.email = formData[`${prefix}_vcardEmail`] || ''
          qrData.org = formData[`${prefix}_vcardOrg`] || ''
          break
      }
      return { qrType, qrData }
    }

    // Add printer override if USB
    if (printerType === 'usb' && selectedUsb) {
      payload.printer = {
        type: 'usb',
        vendorId: selectedUsb.vendorId,
        productId: selectedUsb.productId,
      }
    }

    switch (selectedTemplate) {
      case 'postit':
        return { ...payload, title: data.title, body: data.message }
      case 'grocery':
        return { ...payload, title: data.title, items: data.items.split('\n').filter(i => i.trim()) }
      case 'reminder': {
        const reminderPayload = {
          ...payload, title: data.title, body: data.description,
          flag: data.flagType, customFlag: data.customFlag,
          showPrintedAt: data.showPrintedAt, showFinishBy: data.showFinishBy,
          finishByDate: data.finishByDate, finishByTime: data.finishByTime,
          showQrCode: data.showQrCode,
        }
        if (data.showQrCode) {
          reminderPayload.qrType = 'url'
          reminderPayload.qrData = { url: data.qrUrl || 'https://example.com' }
        }
        return reminderPayload
      }
      case 'tictactoe':
        return payload
      case 'sudoku':
        return { ...payload, difficulty: data.difficulty, puzzle: sudokuData.puzzle, solution: sudokuData.solution }
      case 'qrcode': {
        const { qrType, qrData } = buildQrData('qrcode')
        return { ...payload, qrLabel: data.label, qrType, qrData }
      }
      case 'image':
        return { ...payload, image: imageDataUrl, caption: data.caption }
      case 'banner':
        return { ...payload, title: data.text, fontSize: data.fontSize }
      default:
        return payload
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    setMessage(null)

    try {
      const payload = getPrintPayload()
      const response = await fetch('/print', {
        method: 'POST',
        headers: buildHeaders(apiKey),
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (result.success) {
        setPrintAnimation(true)
        setTimeout(() => {
          setPrintAnimation(false)
          setMessage({ type: 'success', text: 'Printed successfully!' })
        }, 1500)
      } else {
        setMessage({ type: 'error', text: result.error })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }

    setPrinting(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🖨️</span>
            ESC/POS Printify
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/50">Receipt Printer Made Easy</span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm"
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <div className="max-w-7xl mx-auto px-4 pt-3">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 space-y-3">
            <h2 className="text-sm font-semibold">Settings</h2>

            {/* API Key */}
            <div>
              <label className="block text-sm text-white/70 mb-1">API Key (optional)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Leave empty if not configured on server"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Printer Type */}
            <div>
              <label className="block text-sm text-white/70 mb-1">Printer Connection</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPrinterType('network')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${printerType === 'network' ? 'bg-purple-600 border-purple-500' : 'bg-white/10 border-white/20'} border`}
                >
                  🌐 Network (LAN)
                </button>
                <button
                  onClick={() => setPrinterType('usb')}
                  disabled={!usbSupported}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${printerType === 'usb' ? 'bg-purple-600 border-purple-500' : 'bg-white/10 border-white/20'} border disabled:opacity-30 disabled:cursor-not-allowed`}
                  title={usbSupported ? 'Use USB-connected printer' : 'USB not available on this server'}
                >
                  🔌 USB
                </button>
              </div>
            </div>

            {/* USB Printer Selector */}
            {printerType === 'usb' && usbSupported && (
              <div>
                <label className="block text-sm text-white/70 mb-1">USB Printer</label>
                {usbPrinters.length > 0 ? (
                  <select
                    value={selectedUsb ? `${selectedUsb.vendorId}:${selectedUsb.productId}` : ''}
                    onChange={(e) => {
                      const [vid, pid] = e.target.value.split(':').map(Number)
                      setSelectedUsb(usbPrinters.find(p => p.vendorId === vid && p.productId === pid))
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {usbPrinters.map(p => (
                      <option key={`${p.vendorId}:${p.productId}`} value={`${p.vendorId}:${p.productId}`} className="bg-slate-800">
                        {p.product || 'USB Printer'} ({p.vendorId.toString(16)}:{p.productId.toString(16)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-white/40">No USB printers detected. Connect a printer and refresh.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Template Selector & Form */}
        <div className="space-y-4">
          {/* Template Grid */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <h2 className="text-sm font-semibold mb-3">Choose Template</h2>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(templates).map(([key, tmpl]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTemplate(key)}
                  className={`p-2 rounded-lg border-2 transition-all ${selectedTemplate === key
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                >
                  <span className="text-lg block">{tmpl.icon}</span>
                  <span className="text-[10px]">{tmpl.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          {template.fields.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <h2 className="text-sm font-semibold mb-3">Customize</h2>
              <div className="space-y-3">
                {template.fields
                  .filter(field => {
                    if (field.showWhen) {
                      const currentQrType = formData[`${selectedTemplate}_qrType`] || 'url'
                      const currentFlagType = formData[`${selectedTemplate}_flagType`] || 'important'
                      return field.showWhen === currentQrType || field.showWhen === currentFlagType
                    }
                    if (field.showWhenChecked) {
                      return formData[`${selectedTemplate}_${field.showWhenChecked}`] === true
                    }
                    return true
                  })
                  .map(field => (
                    <div key={field.name}>
                      {field.type === 'checkbox' ? (
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData[`${selectedTemplate}_${field.name}`] ?? field.default}
                            onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                            className="w-5 h-5 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-sm text-white/70">{field.label}</span>
                        </label>
                      ) : (
                        <>
                          <label className="block text-sm text-white/70 mb-2">{field.label}</label>
                          {field.type === 'textarea' ? (
                            <textarea
                              value={formData[`${selectedTemplate}_${field.name}`] ?? field.default}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              rows={4}
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={formData[`${selectedTemplate}_${field.name}`] ?? field.default}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              {field.options.map(opt => (
                                <option key={opt} value={opt} className="bg-slate-800">{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                              ))}
                            </select>
                          ) : field.type === 'date' ? (
                            <input
                              type="date"
                              value={formData[`${selectedTemplate}_${field.name}`] ?? field.default}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          ) : field.type === 'time' ? (
                            <input
                              type="time"
                              value={formData[`${selectedTemplate}_${field.name}`] ?? field.default}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={formData[`${selectedTemplate}_${field.name}`] ?? field.default}
                              onChange={(e) => handleFieldChange(field.name, e.target.value)}
                              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          )}
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Image Upload Section */}
          {selectedTemplate === 'image' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <h2 className="text-sm font-semibold mb-3">Upload Image</h2>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span>📁</span>
                {imageDataUrl ? 'Change Image' : 'Browse Image...'}
              </button>
              {imageDataUrl && (
                <p className="text-xs text-green-400 mt-2 text-center">Image loaded (dithering applied server-side)</p>
              )}
            </div>
          )}

          {/* Sudoku Regenerate */}
          {selectedTemplate === 'sudoku' && (
            <button
              onClick={regenerateSudoku}
              className="w-full py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-all text-sm"
            >
              🔄 Generate New Puzzle
            </button>
          )}

          {/* Print Button */}
          <button
            onClick={handlePrint}
            disabled={printing}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {printing ? (
              <>
                <span className="animate-spin">⏳</span>
                Printing...
              </>
            ) : (
              <>
                <span>🖨️</span>
                Print Receipt
              </>
            )}
          </button>

          {/* Status Message */}
          {message && (
            <div className={`p-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
              {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex flex-col h-[calc(100vh-120px)]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Preview (512px width)</h2>
          </div>
          <div
            className="bg-gray-200 rounded-lg shadow-2xl mx-auto flex-1 overflow-hidden relative"
            style={{ width: '512px', maxWidth: '100%' }}
          >
            <div className="absolute inset-0 overflow-y-auto">
              <div
                ref={previewRef}
                dangerouslySetInnerHTML={{ __html: getRenderedHtml() }}
                className={`transition-opacity duration-500 ${printAnimation ? 'opacity-30' : 'opacity-100'}`}
              />
            </div>
          </div>
          <p className="text-center text-white/40 text-xs mt-2">Black & white thermal receipt preview</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-2 text-white/40 text-xs">
        Made with <span className="text-red-500">❤️</span> by Kumara Venkata
      </footer>
    </div>
  )
}

export default App
