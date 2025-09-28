const axios = require('axios');

class SafetyGuardrails {
  constructor() {
    this.hfApiKey = process.env.HF_API_KEY;
    this.promptGuardModel = 'meta-llama/Llama-Prompt-Guard-2-86M';
    this.responseGuardModel = 'meta-llama/Llama-Guard-3-8B';
  }

  async checkPromptSafety(prompt) {
    if (!this.hfApiKey) {
      console.warn('HF_API_KEY not configured, skipping prompt safety check');
      return { safe: true, reason: 'Safety check skipped - no API key' };
    }

    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${this.promptGuardModel}`,
        {
          inputs: prompt,
          options: { wait_for_model: true }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.hfApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      // Parse Llama Prompt Guard response
      const result = response.data;
      
      // If the model returns a classification, check for unsafe content
      if (Array.isArray(result) && result.length > 0) {
        const classification = result[0];
        if (classification.label && classification.label.toLowerCase().includes('unsafe')) {
          return {
            safe: false,
            reason: 'Prompt blocked by Safety Guardrails',
            confidence: classification.score || 0
          };
        }
      }

      return { safe: true, reason: 'Prompt passed safety check' };
    } catch (error) {
      console.error('Prompt safety check failed:', error.message);
      // Fail safe - block on error
      return {
        safe: false,
        reason: 'Prompt blocked by Safety Guardrails',
        error: error.message
      };
    }
  }

  async checkResponseSafety(response) {
    if (!this.hfApiKey) {
      console.warn('HF_API_KEY not configured, skipping response safety check');
      return { safe: true, reason: 'Safety check skipped - no API key' };
    }

    try {
      const result = await axios.post(
        `https://api-inference.huggingface.co/models/${this.responseGuardModel}`,
        {
          inputs: response,
          options: { wait_for_model: true }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.hfApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      // Parse Llama Guard response
      const classification = result.data;
      
      if (Array.isArray(classification) && classification.length > 0) {
        const safety = classification[0];
        if (safety.label && safety.label.toLowerCase().includes('unsafe')) {
          return {
            safe: false,
            reason: 'Response blocked by Safety Guardrails',
            confidence: safety.score || 0
          };
        }
      }

      return { safe: true, reason: 'Response passed safety check' };
    } catch (error) {
      console.error('Response safety check failed:', error.message);
      // Fail safe - block on error
      return {
        safe: false,
        reason: 'Response blocked by Safety Guardrails',
        error: error.message
      };
    }
  }
}

module.exports = SafetyGuardrails;