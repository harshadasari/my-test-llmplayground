const express = require('express');
const router = express.Router();

// Static provider configuration (Part 2)
const PROVIDERS = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI\'s GPT models for conversational AI',
    models: [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385 },
      { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000 }
    ],
    supportedParameters: ['temperature', 'maxTokens', 'topP', 'frequencyPenalty', 'presencePenalty', 'seed', 'stop']
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google\'s multimodal AI model',
    models: [
      {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        contextWindow: 1048576,
        description: 'Most capable Gemini model with thinking capabilities',
        supportedParameters: ['temperature', 'maxTokens', 'topP']
      },
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        contextWindow: 1048576,
        description: 'Fast and efficient Gemini model',
        supportedParameters: ['temperature', 'maxTokens', 'topP']
      },
      {
        id: 'gemini-2.0-flash-001',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1048576,
        description: 'Latest Gemini 2.0 Flash model',
        supportedParameters: ['temperature', 'maxTokens', 'topP']
      }
    ],
    supportedParameters: ['temperature', 'maxTokens', 'topP', 'topK']
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Fast inference with Llama and Mixtral models',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', contextWindow: 131072 },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', contextWindow: 131072 },
      { id: 'llama3-groq-70b-8192-tool-use-preview', name: 'Llama 3 Groq 70B Tool Use', contextWindow: 8192 }
    ],
    supportedParameters: ['temperature', 'maxTokens', 'topP', 'frequencyPenalty', 'presencePenalty', 'seed', 'stop']
  }
};

// Get all providers and their models
router.get('/providers', (req, res) => {
  try {
    const providers = Object.values(PROVIDERS).map(provider => ({
      id: provider.id,
      name: provider.name,
      models: provider.models
    }));

    res.json({
      status: 'success',
      providers: providers,
      total: providers.length
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch providers',
      reason: error.message
    });
  }
});

// Get specific provider
router.get('/providers/:providerId', (req, res) => {
  try {
    const { providerId } = req.params;
    const provider = PROVIDERS[providerId];

    if (!provider) {
      return res.status(404).json({
        status: 'error',
        message: 'Provider not found',
        reason: `Provider '${providerId}' is not supported`
      });
    }

    res.json({
      status: 'success',
      provider: {
        id: provider.id,
        name: provider.name,
        models: provider.models
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch provider',
      reason: error.message
    });
  }
});

module.exports = router;