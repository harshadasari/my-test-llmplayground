const axios = require('axios');

class ProviderClients {
  constructor() {
    this.clients = {
      openai: this.createOpenAIClient(),
      gemini: this.createGeminiClient(),
      groq: this.createGroqClient()
    };
  }

  createOpenAIClient() {
    return {
      async chat(params) {
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OpenAI API key not configured');
        }

        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          params,
          {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          }
        );

        return {
          content: response.data.choices[0].message.content,
          usage: response.data.usage,
          model: response.data.model,
          finish_reason: response.data.choices[0].finish_reason
        };
      }
    };
  }

  createGeminiClient() {
    return {
      async chat(params) {
        if (!process.env.GEMINI_API_KEY) {
          throw new Error('Gemini API key not configured');
        }

        const modelName = params.model.replace('models/', '');
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const response = await axios.post(url, params, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000
        });

        const candidate = response.data.candidates[0];
        return {
          content: candidate.content.parts[0].text,
          usage: response.data.usageMetadata,
          model: modelName,
          finish_reason: candidate.finishReason
        };
      }
    };
  }

  createGroqClient() {
    return {
      async chat(params) {
        if (!process.env.GROQ_API_KEY) {
          throw new Error('Groq API key not configured');
        }

        const response = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          params,
          {
            headers: {
              'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          }
        );

        return {
          content: response.data.choices[0].message.content,
          usage: response.data.usage,
          model: response.data.model,
          finish_reason: response.data.choices[0].finish_reason
        };
      }
    };
  }

  async callProvider(provider, params) {
    const client = this.clients[provider];
    if (!client) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    try {
      return await client.chat(params);
    } catch (error) {
      if (error.response) {
        throw new Error(`${provider} API error: ${error.response.data.error?.message || error.response.statusText}`);
      }
      throw new Error(`${provider} request failed: ${error.message}`);
    }
  }
}

module.exports = new ProviderClients();