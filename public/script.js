class LLMPlayground {
    constructor() {
        this.apiBase = '/api';
        this.providers = [];
        this.currentProvider = null;
        this.currentModel = null;
        this.messages = [];
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkServerStatus();
        this.loadProviders();
    }

    initializeElements() {
        // Status elements
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusDot = this.statusIndicator.querySelector('.status-dot');
        this.statusText = this.statusIndicator.querySelector('.status-text');

        // Settings elements
        this.providerSelect = document.getElementById('providerSelect');
        this.modelSelect = document.getElementById('modelSelect');
        this.temperatureSlider = document.getElementById('temperature');
        this.tempValue = document.getElementById('tempValue');
        this.maxTokensSlider = document.getElementById('maxTokens');
        this.tokensValue = document.getElementById('tokensValue');
        this.systemPromptTextarea = document.getElementById('systemPrompt');
        this.frequencyPenaltySlider = document.getElementById('frequencyPenalty');
        this.freqValue = document.getElementById('freqValue');
        this.presencePenaltySlider = document.getElementById('presencePenalty');
        this.presValue = document.getElementById('presValue');
        this.seedInput = document.getElementById('seed');
        this.stopSequencesInput = document.getElementById('stopSequences');

        // Safety elements
        this.promptGuardStatus = document.getElementById('promptGuardStatus');
        this.responseGuardStatus = document.getElementById('responseGuardStatus');

        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.clearButton = document.getElementById('clearButton');
        this.charCount = document.getElementById('charCount');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    attachEventListeners() {
        // Provider and model selection
        this.providerSelect.addEventListener('change', () => this.onProviderChange());
        this.modelSelect.addEventListener('change', () => this.onModelChange());

        // Slider updates
        this.temperatureSlider.addEventListener('input', (e) => {
            this.tempValue.textContent = e.target.value;
        });

        this.maxTokensSlider.addEventListener('input', (e) => {
            this.tokensValue.textContent = e.target.value;
        });

        this.frequencyPenaltySlider.addEventListener('input', (e) => {
            this.freqValue.textContent = e.target.value;
        });

        this.presencePenaltySlider.addEventListener('input', (e) => {
            this.presValue.textContent = e.target.value;
        });

        // Chat functionality
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.clearButton.addEventListener('click', () => this.clearChat());
        
        this.messageInput.addEventListener('input', () => this.updateCharCount());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async checkServerStatus() {
        try {
            const response = await fetch(`${this.apiBase}/health`);
            const data = await response.json();
            
            if (data.status === 'OK') {
                this.updateStatus('connected', 'Server connected');
                this.updateSafetyStatus(data.api_keys_configured);
            } else {
                this.updateStatus('error', 'Server error');
            }
        } catch (error) {
            this.updateStatus('error', 'Server offline');
            console.error('Health check failed:', error);
        }
    }

    updateStatus(status, text) {
        this.statusDot.className = `status-dot ${status}`;
        this.statusText.textContent = text;
    }

    updateSafetyStatus(apiKeys) {
        if (apiKeys.huggingface) {
            this.promptGuardStatus.textContent = 'Active';
            this.promptGuardStatus.className = 'safety-value';
            this.responseGuardStatus.textContent = 'Active';
            this.responseGuardStatus.className = 'safety-value';
        } else {
            this.promptGuardStatus.textContent = 'Disabled';
            this.promptGuardStatus.className = 'safety-value blocked';
            this.responseGuardStatus.textContent = 'Disabled';
            this.responseGuardStatus.className = 'safety-value blocked';
        }
    }

    async loadProviders() {
        try {
            const response = await fetch(`${this.apiBase}/providers`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.providers = data.providers;
                this.populateProviderSelect();
            }
        } catch (error) {
            console.error('Failed to load providers:', error);
            this.addMessage('system', 'Failed to load providers. Please check your connection.');
        }
    }

    populateProviderSelect() {
        this.providerSelect.innerHTML = '<option value="">Select Provider...</option>';
        
        this.providers.forEach(provider => {
            const option = document.createElement('option');
            option.value = provider.id;
            option.textContent = provider.name;
            this.providerSelect.appendChild(option);
        });
    }

    onProviderChange() {
        const providerId = this.providerSelect.value;
        this.currentProvider = providerId;
        
        if (providerId) {
            const provider = this.providers.find(p => p.id === providerId);
            this.populateModelSelect(provider.models);
            this.modelSelect.disabled = false;
        } else {
            this.modelSelect.innerHTML = '<option value="">Select Model...</option>';
            this.modelSelect.disabled = true;
            this.currentModel = null;
            this.updateInputState();
        }
    }

    populateModelSelect(models) {
        this.modelSelect.innerHTML = '<option value="">Select Model...</option>';
        
        models.forEach(model => {
            const option = document.createElement('option');
            // Handle both string and object model formats
            if (typeof model === 'string') {
                option.value = model;
                option.textContent = model;
            } else {
                option.value = model.id;
                option.textContent = model.name || model.id;
            }
            this.modelSelect.appendChild(option);
        });
    }

    onModelChange() {
        this.currentModel = this.modelSelect.value;
        this.updateInputState();
    }

    updateInputState() {
        const isReady = this.currentProvider && this.currentModel;
        this.messageInput.disabled = !isReady;
        this.sendButton.disabled = !isReady || !this.messageInput.value.trim();
        
        if (isReady) {
            this.messageInput.placeholder = 'Type your message here...';
        } else {
            this.messageInput.placeholder = 'Select a provider and model to start chatting...';
        }
    }

    updateCharCount() {
        const length = this.messageInput.value.length;
        this.charCount.textContent = `${length} characters`;
        
        const isReady = this.currentProvider && this.currentModel;
        this.sendButton.disabled = !isReady || !this.messageInput.value.trim();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.currentProvider || !this.currentModel) return;

        // Add user message to chat
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.updateCharCount();

        // Show loading
        this.showLoading(true);

        try {
            // Prepare request
            const requestBody = {
                provider: this.currentProvider,
                model: this.currentModel,
                messages: [...this.messages, { role: 'user', content: message }],
                temperature: parseFloat(this.temperatureSlider.value),
                max_output_tokens: parseInt(this.maxTokensSlider.value),
                frequency_penalty: parseFloat(this.frequencyPenaltySlider.value),
                presence_penalty: parseFloat(this.presencePenaltySlider.value)
            };

            // Add optional parameters
            if (this.systemPromptTextarea.value.trim()) {
                requestBody.system_prompt = this.systemPromptTextarea.value.trim();
            }

            if (this.seedInput.value) {
                requestBody.seed = parseInt(this.seedInput.value);
            }

            if (this.stopSequencesInput.value.trim()) {
                requestBody.stop_sequences = this.stopSequencesInput.value
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s);
            }

            // Send request
            const response = await fetch(`${this.apiBase}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.status === 'success') {
                // Add assistant response
                this.addMessage('assistant', data.response.content, {
                    model: data.response.model,
                    provider: data.response.provider,
                    usage: data.usage,
                    requestId: data.request_id
                });

                // Update messages history
                this.messages.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: data.response.content }
                );

            } else if (data.status === 'blocked') {
                // Safety guardrails blocked the request
                this.addMessage('blocked', `🛡️ ${data.message}: ${data.reason}`);
                
            } else {
                // Error occurred
                this.addMessage('system', `❌ Error: ${data.message}`);
            }

        } catch (error) {
            console.error('Chat request failed:', error);
            this.addMessage('system', '❌ Request failed. Please check your connection and try again.');
        } finally {
            this.showLoading(false);
        }
    }

    addMessage(type, content, metadata = {}) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.textContent = content;
        messageDiv.appendChild(contentDiv);

        // Add metadata for assistant messages
        if (type === 'assistant' && metadata.model) {
            const metaDiv = document.createElement('div');
            metaDiv.className = 'message-meta';
            
            const modelInfo = document.createElement('span');
            modelInfo.textContent = `${metadata.provider} • ${metadata.model}`;
            
            const usageInfo = document.createElement('span');
            if (metadata.usage) {
                const tokens = metadata.usage.total_tokens || 
                             (metadata.usage.prompt_tokens + metadata.usage.completion_tokens) || 
                             'N/A';
                usageInfo.textContent = `${tokens} tokens`;
            }
            
            metaDiv.appendChild(modelInfo);
            metaDiv.appendChild(usageInfo);
            messageDiv.appendChild(metaDiv);
        }

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();

        // Remove welcome message if it exists
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
    }

    clearChat() {
        this.messages = [];
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <h3>Welcome to LLM Playground! 🚀</h3>
                <p>Select a provider and model to start chatting. All conversations are processed locally with safety guardrails.</p>
            </div>
        `;
    }

    showLoading(show) {
        if (show) {
            this.loadingOverlay.classList.add('show');
            this.sendButton.disabled = true;
        } else {
            this.loadingOverlay.classList.remove('show');
            this.updateInputState();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LLMPlayground();
});