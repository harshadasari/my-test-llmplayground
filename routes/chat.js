const express = require('express');
const router = express.Router();

const SafetyGuardrails = require('../middleware/safety');
const logger = require('../middleware/logger');
const parameterMapper = require('../middleware/parameterMapping');
const providerClients = require('../services/providerClients');

// Unified chat endpoint
router.post('/chat', async (req, res) => {
  const requestId = req.requestId || Math.random().toString(36).substr(2, 9);
  
  try {
    // Validate request body
    const { provider, model, messages, ...settings } = req.body;
    
    if (!provider || !model || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request format',
        reason: 'Missing required fields: provider, model, messages'
      });
    }

    // Extract user prompt for safety check
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid message format',
        reason: 'Last message must be from user'
      });
    }

    const userPrompt = userMessage.content;

    // Step 1: Pre-check - Prompt Safety Guardrails (TEMPORARILY DISABLED)
    console.log(`[${requestId}] Skipping prompt safety check (temporarily disabled)...`);
    // const safetyGuardrails = new SafetyGuardrails();
    // const promptSafetyResult = await safetyGuardrails.checkPromptSafety(userPrompt);
    
    // Create mock safety result for logging
    const promptSafetyResult = { safe: true, reason: 'Safety check disabled' };
    logger.logSafetyCheck('prompt', userPrompt, promptSafetyResult, requestId);

    // if (!promptSafetyResult.safe) {
    //   return res.status(400).json({
    //     status: 'blocked',
    //     message: 'Request blocked by safety guardrails',
    //     reason: promptSafetyResult.reason,
    //     confidence: promptSafetyResult.confidence
    //   });
    // }

    // Step 2: Log prompt
    logger.logPrompt(userPrompt, provider, model, requestId);

    // Step 3: Map parameters to provider format
    console.log(`[${requestId}] Mapping parameters for ${provider}...`);
    const mappedParams = parameterMapper.mapParameters(provider, req.body);

    // Step 4: Call provider
    console.log(`[${requestId}] Calling ${provider} with model ${model}...`);
    const providerResponse = await providerClients.callProvider(provider, mappedParams);

    // Step 5: Post-check - Response Safety Guardrails (TEMPORARILY DISABLED)
    console.log(`[${requestId}] Skipping response safety check (temporarily disabled)...`);
    // const responseSafetyResult = await safetyGuardrails.checkResponseSafety(providerResponse.content);
    
    // Create mock safety result for logging
    const responseSafetyResult = { safe: true, reason: 'Safety check disabled' };
    logger.logSafetyCheck('response', providerResponse.content, responseSafetyResult, requestId);

    // if (!responseSafetyResult.safe) {
    //   return res.status(400).json({
    //     status: 'blocked',
    //     message: 'Response blocked by safety guardrails',
    //     reason: responseSafetyResult.reason,
    //     confidence: responseSafetyResult.confidence
    //   });
    // }

    // Step 6: Return successful response
    console.log(`[${requestId}] Request completed successfully`);
    res.json({
      status: 'success',
      response: {
        content: providerResponse.content,
        model: providerResponse.model,
        provider: provider,
        finish_reason: providerResponse.finish_reason
      },
      usage: providerResponse.usage,
      safety_checks: {
        prompt: {
          safe: promptSafetyResult.safe,
          reason: promptSafetyResult.reason
        },
        response: {
          safe: responseSafetyResult.safe,
          reason: responseSafetyResult.reason
        }
      },
      request_id: requestId
    });

  } catch (error) {
    console.error(`[${requestId}] Chat request failed:`, error.message);
    logger.logError(error, { requestId, provider: req.body?.provider, model: req.body?.model });

    res.status(500).json({
      status: 'error',
      message: 'Chat request failed',
      reason: error.message,
      request_id: requestId
    });
  }
});

module.exports = router;