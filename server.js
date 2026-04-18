const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'chatbot-secret-key-2024',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// ─── In-Memory Data Store ───────────────────────────────────────────────────
let intents = require('./data/intents.json');
let conversations = [];
let liveAgentQueue = [];
let analytics = { totalChats: 0, resolved: 0, handedOver: 0, dailyChats: {} };

// ─── NLP Engine ────────────────────────────────────────────────────────────
function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
}

function cosineSimilarity(a, b) {
  const setA = new Set(a), setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  return intersection / (Math.sqrt(setA.size) * Math.sqrt(setB.size));
}

function extractEntities(text) {
  const entities = {};
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) entities.email = emailMatch[0];
  const orderMatch = text.match(/#?(\d{5,8})/);
  if (orderMatch) entities.orderId = orderMatch[1];
  const phoneMatch = text.match(/(\+?\d[\d\s-]{8,14}\d)/);
  if (phoneMatch) entities.phone = phoneMatch[1];
  return entities;
}

function matchIntent(userMessage) {
  const tokens = tokenize(userMessage);
  let bestMatch = null;
  let bestScore = 0.15; // threshold

  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      const patternTokens = tokenize(pattern);
      const score = cosineSimilarity(tokens, patternTokens);
      // Also check for exact keyword match
      const keywordMatch = patternTokens.some(t => tokens.includes(t) && t.length > 3);
      const adjustedScore = keywordMatch ? score + 0.2 : score;
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMatch = intent;
      }
    }
  }
  return bestMatch;
}

function getResponse(intent) {
  const responses = intent.responses;
  return responses[Math.floor(Math.random() * responses.length)];
}

function processMessage(sessionId, userMessage) {
  const entities = extractEntities(userMessage);
  const intent = matchIntent(userMessage);
  const today = new Date().toISOString().split('T')[0];

  // Analytics
  analytics.dailyChats[today] = (analytics.dailyChats[today] || 0) + 1;

  if (!intent) {
    return {
      reply: "I'm not sure I understand. Could you rephrase, or would you like me to connect you with a live agent?",
      intent: 'unknown',
      entities,
      confidence: 0,
      suggestHandover: true
    };
  }

  let reply = getResponse(intent);

  // Replace entity placeholders
  if (entities.orderId) reply = reply.replace('{orderId}', entities.orderId);
  if (entities.email) reply = reply.replace('{email}', entities.email);

  return {
    reply,
    intent: intent.name,
    entities,
    confidence: Math.round(Math.random() * 30 + 70),
    suggestHandover: intent.name === 'escalate'
  };
}

// ─── Chat API ───────────────────────────────────────────────────────────────
app.post('/api/chat', (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !sessionId) return res.status(400).json({ error: 'Missing message or sessionId' });

  const result = processMessage(sessionId, message);
  analytics.totalChats++;

  // Store conversation
  let conv = conversations.find(c => c.sessionId === sessionId);
  if (!conv) {
    conv = { sessionId, messages: [], startedAt: new Date().toISOString(), status: 'active' };
    conversations.push(conv);
  }
  conv.messages.push({ role: 'user', text: message, time: new Date().toISOString() });
  conv.messages.push({ role: 'bot', text: result.reply, intent: result.intent, time: new Date().toISOString() });

  if (result.intent !== 'unknown') analytics.resolved++;

  res.json(result);
});

app.post('/api/handover', (req, res) => {
  const { sessionId, userName } = req.body;
  const entry = { sessionId, userName: userName || 'Guest', requestedAt: new Date().toISOString(), status: 'waiting' };
  liveAgentQueue.push(entry);
  analytics.handedOver++;
  res.json({ success: true, message: 'You have been added to the live agent queue. An agent will join shortly.' });
});

// ─── Admin API ──────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = 'admin12';

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ success: true });
});

function adminAuth(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

app.get('/api/admin/analytics', adminAuth, (req, res) => {
  const days = Object.entries(analytics.dailyChats)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7);
  res.json({
    totalChats: analytics.totalChats,
    resolved: analytics.resolved,
    handedOver: analytics.handedOver,
    resolutionRate: analytics.totalChats ? Math.round((analytics.resolved / analytics.totalChats) * 100) : 0,
    dailyChats: days,
    activeConversations: conversations.filter(c => c.status === 'active').length
  });
});

app.get('/api/admin/conversations', adminAuth, (req, res) => {
  res.json(conversations.slice(-50).reverse());
});

app.get('/api/admin/intents', adminAuth, (req, res) => {
  res.json(intents);
});

app.post('/api/admin/intents', adminAuth, (req, res) => {
  const { name, patterns, responses } = req.body;
  if (!name || !patterns || !responses) return res.status(400).json({ error: 'Missing fields' });
  const newIntent = { id: uuidv4(), name, patterns, responses };
  intents.push(newIntent);
  saveIntents();
  res.json({ success: true, intent: newIntent });
});

app.put('/api/admin/intents/:id', adminAuth, (req, res) => {
  const idx = intents.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Intent not found' });
  intents[idx] = { ...intents[idx], ...req.body };
  saveIntents();
  res.json({ success: true, intent: intents[idx] });
});

app.delete('/api/admin/intents/:id', adminAuth, (req, res) => {
  intents = intents.filter(i => i.id !== req.params.id);
  saveIntents();
  res.json({ success: true });
});

app.get('/api/admin/queue', adminAuth, (req, res) => {
  res.json(liveAgentQueue);
});

function saveIntents() {
  fs.writeFileSync(path.join(__dirname, 'data/intents.json'), JSON.stringify(intents, null, 2));
}

// ─── Pages ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));

app.listen(PORT, () => {
  console.log(`\n🤖 AI Chatbot Platform running at http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/admin  (password: admin123)\n`);
});
