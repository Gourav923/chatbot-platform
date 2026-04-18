# 🤖 AI Customer Support Chatbot Platform

A fully runnable AI-powered chatbot with a chat UI, NLP engine, and admin panel — built with plain HTML/CSS/JS + Node.js.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
node server.js
```

### 3. Open in browser
- **Chat UI**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin  (password: `admin123`)

---

## 📁 Project Structure

```
chatbot-platform/
├── server.js              # Express server + NLP engine + REST API
├── package.json
├── data/
│   └── intents.json       # Training data (editable from admin panel)
└── public/
    ├── index.html         # Chat UI
    └── admin.html         # Admin panel
```

---

## ✨ Features

### Chat UI (`/`)
- Real-time AI responses with typing indicator
- Intent recognition + entity extraction (email, order ID, phone)
- Quick reply chips after each response
- Live agent handover request
- Smart welcome screen with topic shortcuts
- Conversation history per session

### Admin Panel (`/admin`)
- 📊 **Analytics** — total chats, resolution rate, daily bar chart
- 💬 **Conversations** — view all sessions and message history
- 🧠 **Train Intents** — add/edit/delete intents with patterns & responses
- 👤 **Agent Queue** — see users waiting for live support

### NLP Engine
- Tokenization + cosine similarity matching
- Entity extraction: emails, order IDs, phone numbers
- Confidence scoring
- Fallback with handover suggestion

---

## 🧠 Built-in Intents (12)

| Intent | Triggers |
|--------|---------|
| greeting | hello, hi, hey |
| goodbye | bye, exit, done |
| order_status | track order, where is my order |
| refund | refund, return, money back |
| product_info | tell me about, features |
| payment | billing, credit card, pay |
| technical_support | not working, bug, error |
| account | login, password, forgot |
| shipping | delivery, how long, express |
| escalate | live agent, speak to human |
| hours | working hours, support hours |
| thank_you | thanks, helpful, awesome |

---

## 🔧 Add Custom Intents

**Via Admin Panel** (recommended):
1. Go to http://localhost:3000/admin
2. Click **Train Intents** → **+ Add Intent**
3. Fill name, training patterns (one per line), responses

**Via JSON** (direct edit):
Edit `data/intents.json` and restart the server.

---

## 🌐 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Send a message, get bot reply |
| POST | `/api/handover` | Request live agent |
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/analytics` | Dashboard stats |
| GET | `/api/admin/conversations` | All conversations |
| GET/POST | `/api/admin/intents` | List or create intents |
| PUT/DELETE | `/api/admin/intents/:id` | Update or delete intent |
| GET | `/api/admin/queue` | Live agent queue |

---

## 🔒 Security Notes

- Change admin password in `server.js` → `const ADMIN_PASSWORD = 'your-password'`
- For production: add HTTPS, use a real database (MongoDB/PostgreSQL), add JWT auth

---

## 📦 Tech Stack

- **Backend**: Node.js + Express
- **NLP**: Custom cosine similarity engine (no external API needed)
- **Frontend**: Vanilla HTML/CSS/JS (dark theme)
- **Storage**: In-memory (intents persist to JSON file)

---

## 🛠 Extend This Project

- Replace NLP engine with Dialogflow or OpenAI API
- Add MongoDB for persistent conversations
- Add WebSocket for real-time live agent chat
- Add email notifications for agent queue
- Deploy to Railway, Render, or Heroku
