class ParameterMapper {
  constructor() {
    // Default parameter mappings for each provider
    this.mappings = {
      openai: {
        temperature: 'temperature',
        max_output_tokens: 'max_tokens',
        frequency_penalty: 'frequency_penalty',
        presence_penalty: 'presence_penalty',
        system_prompt: 'system',
        seed: 'seed',
        stop_sequences: 'stop'
      },
      gemini: {
        temperature: 'temperature',
        max_output_tokens: 'maxOutputTokens',
        frequency_penalty: 'frequencyPenalty',
        presence_penalty: 'presencePenalty',
        system_prompt: 'systemInstruction',
        seed: 'seed',
        stop_sequences: 'stopSequences'
      },
      groq: {
        temperature: 'temperature',
        max_output_tokens: 'max_tokens',
        frequency_penalty: 'frequency_penalty',
        presence_penalty: 'presence_penalty',
        system_prompt: 'system',
        seed: 'seed',
        stop_sequences: 'stop'
      }
    };
  }

  mapToOpenAI(unifiedParams) {
    const { provider, model, messages, ...settings } = unifiedParams;
    
    const mapped = {
      model: model,
      messages: this.formatMessagesForOpenAI(messages, settings.system_prompt),
      temperature: settings.temperature || 0.7,
      max_tokens: settings.max_output_tokens || 1000,
      frequency_penalty: settings.frequency_penalty || 0,
      presence_penalty: settings.presence_penalty || 0
    };

    if (settings.seed) mapped.seed = settings.seed;
    if (settings.stop_sequences && settings.stop_sequences.length > 0) {
      mapped.stop = settings.stop_sequences;
    }

    return mapped;
  }

  mapToGemini(unifiedParams) {
    const { provider, model, messages, ...settings } = unifiedParams;
    
    const mapped = {
      model: `models/${model}`,
      contents: this.formatMessagesForGemini(messages),
      generationConfig: {
        temperature: settings.temperature || 0.7,
        maxOutputTokens: settings.max_output_tokens || 1000,
        candidateCount: 1
      }
    };

    if (settings.system_prompt) {
      mapped.systemInstruction = {
        parts: [{ text: settings.system_prompt }]
      };
    }

    if (settings.stop_sequences && settings.stop_sequences.length > 0) {
      mapped.generationConfig.stopSequences = settings.stop_sequences;
    }

    return mapped;
  }

  mapToGroq(unifiedParams) {
    const { provider, model, messages, ...settings } = unifiedParams;
    
    const mapped = {
      model: model,
      messages: this.formatMessagesForGroq(messages, settings.system_prompt),
      temperature: settings.temperature || 0.7,
      max_tokens: settings.max_output_tokens || 1000,
      frequency_penalty: settings.frequency_penalty || 0,
      presence_penalty: settings.presence_penalty || 0
    };

    if (settings.seed) mapped.seed = settings.seed;
    if (settings.stop_sequences && settings.stop_sequences.length > 0) {
      mapped.stop = settings.stop_sequences;
    }

    return mapped;
  }

  formatMessagesForOpenAI(messages, systemPrompt) {
    const formatted = [];
    
    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }

    messages.forEach(msg => {
      formatted.push({
        role: msg.role,
        content: msg.content
      });
    });

    return formatted;
  }

  formatMessagesForGemini(messages) {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }

  formatMessagesForGroq(messages, systemPrompt) {
    const formatted = [];
    
    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }

    messages.forEach(msg => {
      formatted.push({
        role: msg.role,
        content: msg.content
      });
    });

    return formatted;
  }

  mapParameters(provider, unifiedParams) {
    switch (provider) {
      case 'openai':
        return this.mapToOpenAI(unifiedParams);
      case 'gemini':
        return this.mapToGemini(unifiedParams);
      case 'groq':
        return this.mapToGroq(unifiedParams);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

module.exports = new ParameterMapper();