const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import logger
const logger = require('./middleware/logger');

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8000', 'http://127.0.0.1:3000', 'http://127.0.0.1:8000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(logger.logRequest.bind(logger));
app.use(express.static('public'));

// Import route handlers
const healthRoutes = require('./routes/health');
const providerRoutes = require('./routes/providers');
const chatRoutes = require('./routes/chat');
const chatsRoutes = require('./routes/chats');

// Routes
app.use('/api', healthRoutes);
app.use('/api', providerRoutes);
app.use('/api', chatRoutes);
app.use('/api', chatsRoutes);

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    reason: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 LLM Playground server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 Providers: http://localhost:${PORT}/api/providers`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
});

module.exports = app;