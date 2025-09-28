const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      node_version: process.version,
      platform: process.platform,
      memory_usage: process.memoryUsage()
    },
    api_keys_configured: {
      openai: !!process.env.OPENAI_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      huggingface: !!process.env.HF_API_KEY
    }
  });
});

module.exports = router;