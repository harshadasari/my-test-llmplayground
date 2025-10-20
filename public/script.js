class LLMPlayground {
    constructor() {
        console.log('=== LLMPlayground Constructor Starting ===');
        this.apiBase = '/api';
        this.providers = [];
        this.currentProvider = null;
        this.currentModel = null;
        this.messages = [];
        this.currentChatId = null;
        this.chats = [];
        
        // Performance optimization properties
        this.messageCache = new Map();
        this.renderQueue = [];
        this.isRendering = false;
        this.visibleMessages = new Set();
        this.intersectionObserver = null;
        
        console.log('Initializing elements...');
        this.initializeElements();
        console.log('Attaching event listeners...');
        this.attachEventListeners();
        console.log('Setting up performance optimizations...');
        this.setupPerformanceOptimizations();
        console.log('Checking server status...');
        this.checkServerStatus();
        console.log('Loading providers...');
        this.loadProviders();
        
        // Initialize panel state
        console.log('Initializing panel state...');
        this.initializePanelState();
        
        // Setup mobile navigation
        console.log('Setting up mobile navigation...');
        this.setupMobileNavigation();
        
        // Add a delay to ensure DOM is fully ready
        setTimeout(() => {
            console.log('Loading chat history after delay...');
            this.loadChatHistory();
        }, 1000);
        
        console.log('=== LLMPlayground Constructor Complete ===');
    }

    initializeElements() {
        console.log('=== initializeElements DEBUG ===');
        // Status elements
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusDot = this.statusIndicator.querySelector('.status-dot');
        this.statusText = this.statusIndicator.querySelector('.status-text');

        // Sidebar elements
        this.chatSidebar = document.getElementById('chatSidebar');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.chatList = document.getElementById('chatList');

        // Settings sidebar elements
        this.settingsSidebar = document.getElementById('settingsSidebar');
        // Removed settingsToggle and positionToggle references

        // Settings elements
        this.providerModelSelect = document.getElementById('providerModelSelect');
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
        this.guardrailsToggle = document.getElementById('guardrailsToggle');
        this.promptGuardStatus = document.getElementById('promptGuardStatus');
        this.responseGuardStatus = document.getElementById('responseGuardStatus');

        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.charCount = document.getElementById('charCount');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        console.log('Loading overlay element found:', this.loadingOverlay);
        console.log('Loading overlay initial classes:', this.loadingOverlay ? this.loadingOverlay.className : 'not found');
        
        // CRITICAL FIX: Ensure loading overlay is hidden on initialization
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('show');
            this.loadingOverlay.style.display = 'none';
            console.log('FORCED loading overlay to be hidden');
        }
        
        console.log('=== initializeElements COMPLETE ===');
    }

    attachEventListeners() {
        // Sidebar interactions
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        // Removed settingsToggle and positionToggle event listeners

        // Provider-model selection
        this.providerModelSelect.addEventListener('change', () => this.onProviderModelChange());

        // Guardrails toggle
        this.guardrailsToggle.addEventListener('change', () => this.onGuardrailsToggle());

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
        
        this.messageInput.addEventListener('input', () => this.updateCharCount());
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });

        // Removed click outside functionality for settings panel
    }

    initializePanelState() {
        // Ensure the settings panel starts in the correct state
        // Remove any conflicting classes and set initial position
        this.settingsSidebar.classList.remove('left-position');
        this.settingsSidebar.classList.remove('closed');
        
        // Force a reflow to ensure styles are applied
        this.settingsSidebar.offsetHeight;
        
        // Set initial position to right side (default)
        this.settingsSidebar.style.right = '0';
        this.settingsSidebar.style.left = 'auto';
        this.settingsSidebar.style.transform = 'translateX(0)';
    }

    onGuardrailsToggle() {
        const isEnabled = this.guardrailsToggle.checked;
        console.log('Guardrails toggled:', isEnabled);
        // Update safety status display based on toggle
        if (isEnabled) {
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
        this.providerModelSelect.innerHTML = '<option value="">Select Provider and Model...</option>';
        
        this.providers.forEach(provider => {
            // Create provider group header (disabled option)
            const providerGroup = document.createElement('optgroup');
            providerGroup.label = provider.name;
            
            // Add models for this provider
            provider.models.forEach(model => {
                const option = document.createElement('option');
                // Combine provider and model for the value
                option.value = `${provider.id}|${typeof model === 'string' ? model : model.id}`;
                option.textContent = typeof model === 'string' ? model : (model.name || model.id);
                providerGroup.appendChild(option);
            });
            
            this.providerModelSelect.appendChild(providerGroup);
        });
        
        // Set default to OpenAI ChatGPT 3.5 if available
        this.setDefaultModel();
    }

    setDefaultModel() {
        // Look for OpenAI ChatGPT 3.5 or similar
        const options = this.providerModelSelect.querySelectorAll('option');
        let defaultOption = null;
        
        // Priority order for default models
        const preferredModels = [
            'openai|gpt-3.5-turbo',
            'openai|gpt-3.5-turbo-1106',
            'openai|gpt-3.5-turbo-0125'
        ];
        
        for (const preferred of preferredModels) {
            for (const option of options) {
                if (option.value === preferred) {
                    defaultOption = option;
                    break;
                }
            }
            if (defaultOption) break;
        }
        
        // If no preferred model found, look for any OpenAI model
        if (!defaultOption) {
            for (const option of options) {
                if (option.value.startsWith('openai|')) {
                    defaultOption = option;
                    break;
                }
            }
        }
        
        // Set the default selection
        if (defaultOption) {
            this.providerModelSelect.value = defaultOption.value;
            this.onProviderModelChange();
        }
    }

    onProviderModelChange() {
        const selectedValue = this.providerModelSelect.value;
        
        if (selectedValue) {
            const [providerId, modelId] = selectedValue.split('|');
            this.currentProvider = providerId;
            this.currentModel = modelId;
        } else {
            this.currentProvider = null;
            this.currentModel = null;
        }
        
        this.updateInputState();
    }



    updateInputState() {
        const isReady = this.currentProvider && this.currentModel;
        this.messageInput.disabled = !isReady;
        this.sendButton.disabled = !isReady || !this.messageInput.value.trim();
        
        if (isReady) {
            this.messageInput.placeholder = 'Message LLM Playground...';
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

    // Chat History Management
    async loadChatHistory() {
        try {
            const response = await fetch(`${this.apiBase}/chats`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.chats = data.chats;
                this.renderChatHistory();
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }

    renderChatHistory() {
        this.chatList.innerHTML = '';
        
        if (this.chats.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'chat-history-empty';
            emptyState.innerHTML = '<p style="color: #9ca3af; text-align: center; padding: 20px; font-size: 14px;">No chat history yet</p>';
            this.chatList.appendChild(emptyState);
            return;
        }

        this.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.id === this.currentChatId ? 'active' : ''}`;
            
            chatItem.innerHTML = `
                <div class="chat-item-title">${chat.title}</div>
                <div class="chat-item-date">${this.formatDate(chat.updatedAt)}</div>
                <button class="chat-item-delete" onclick="event.stopPropagation(); playground.deleteChat('${chat.id}')">×</button>
            `;
            
            chatItem.addEventListener('click', () => this.loadChat(chat.id));
            this.chatList.appendChild(chatItem);
        });
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        
        return date.toLocaleDateString();
    }

    async startNewChat() {
        // Save current chat if it has messages
        if (this.messages.length > 0 && this.currentChatId) {
            await this.saveCurrentChat();
        }

        // Reset chat state
        this.currentChatId = null;
        this.messages = [];
        this.clearChatDisplay();
        this.updateChatHistorySelection();
    }

    async loadChat(chatId) {
        try {
            // Save current chat if it has unsaved changes
            if (this.messages.length > 0 && this.currentChatId && this.currentChatId !== chatId) {
                await this.saveCurrentChat();
            }

            const response = await fetch(`${this.apiBase}/chats/${chatId}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.currentChatId = chatId;
                this.messages = data.chat.messages;
                this.renderChatMessages();
                this.updateChatHistorySelection();
            }
        } catch (error) {
            console.error('Failed to load chat:', error);
            this.addMessage('system', 'Failed to load chat. Please try again.');
        }
    }

    async saveCurrentChat() {
        if (this.messages.length === 0) return;

        try {
            const title = this.generateChatTitle();
            const chatData = {
                title,
                messages: this.messages
            };

            let response;
            if (this.currentChatId) {
                // Update existing chat
                response = await fetch(`${this.apiBase}/chats/${this.currentChatId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(chatData)
                });
            } else {
                // Create new chat
                response = await fetch(`${this.apiBase}/chats`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(chatData)
                });
            }

            const data = await response.json();
            if (data.status === 'success') {
                if (!this.currentChatId) {
                    this.currentChatId = data.chat.id;
                }
                await this.loadChatHistory(); // Refresh chat list
            }
        } catch (error) {
            console.error('Failed to save chat:', error);
        }
    }

    async deleteChat(chatId) {
        if (!confirm('Are you sure you want to delete this chat?')) return;

        try {
            const response = await fetch(`${this.apiBase}/chats/${chatId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.status === 'success') {
                if (this.currentChatId === chatId) {
                    this.startNewChat();
                }
                await this.loadChatHistory();
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
        }
    }

    generateChatTitle() {
        if (this.messages.length === 0) return 'New Chat';
        
        const firstUserMessage = this.messages.find(m => m.role === 'user');
        if (firstUserMessage) {
            const title = firstUserMessage.content.substring(0, 50);
            return title.length < firstUserMessage.content.length ? title + '...' : title;
        }
        
        return 'New Chat';
    }

    updateChatHistorySelection() {
        const chatItems = this.chatList.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            item.classList.remove('active');
        });

        if (this.currentChatId) {
            const activeItem = this.chatList.querySelector(`[onclick*="${this.currentChatId}"]`)?.parentElement;
            if (activeItem) {
                activeItem.classList.add('active');
            }
        }
    }

    renderChatMessages() {
        this.chatMessages.innerHTML = '';
        
        if (this.messages.length === 0) {
            this.showWelcomeMessage();
            return;
        }

        this.messages.forEach(message => {
            this.addMessageToDisplay(message.role, message.content);
        });
    }

    clearChatDisplay() {
        this.chatMessages.innerHTML = '';
        this.showWelcomeMessage();
    }

    showWelcomeMessage() {
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <h3>Welcome to LLM Playground! 🚀</h3>
                <p>Select a provider and model to start chatting. All conversations are processed locally with safety guardrails.</p>
            </div>
        `;
    }

    async sendMessage() {
        console.log('sendMessage called');
        const message = this.messageInput.value.trim();
        if (!message || !this.currentProvider || !this.currentModel) {
            console.log('sendMessage early return - missing data:', { message, provider: this.currentProvider, model: this.currentModel });
            return;
        }

        console.log('Sending message:', message);
        
        // Add user message to chat
        this.addMessage('user', message);
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.updateCharCount();

        // Show loading
        console.log('Showing loading overlay');
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

            console.log('Making API request to:', `${this.apiBase}/chat`);
            console.log('Request body:', requestBody);

            // Send request
            const response = await fetch(`${this.apiBase}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('API response received:', response.status);
            const data = await response.json();
            console.log('API response data:', data);

            if (data.status === 'success') {
                console.log('Success response, adding assistant message');
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

                // Auto-save chat after successful exchange
                await this.saveCurrentChat();

            } else if (data.status === 'blocked') {
                console.log('Request was blocked by safety guardrails');
                // Safety guardrails blocked the request
                this.addMessage('blocked', `🛡️ ${data.message}: ${data.reason}`);
                
            } else {
                console.log('API returned error:', data.message);
                // Error occurred
                this.addMessage('system', `❌ Error: ${data.message}`);
            }

        } catch (error) {
            console.error('Chat request failed:', error);
            this.addMessage('system', '❌ Request failed. Please check your connection and try again.');
        } finally {
            console.log('Hiding loading overlay');
            this.showLoading(false);
        }
    }

    addMessage(type, content, metadata = {}) {
        // Add to messages array if it's a user or assistant message
        if (type === 'user' || type === 'assistant') {
            // Don't add to messages array here, it's handled in sendMessage
        }

        this.addMessageToDisplay(type, content, metadata);
    }

    addMessageToDisplay(type, content, metadata = {}) {
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

    showLoading(show) {
        console.log('=== showLoading DEBUG ===');
        console.log('showLoading called with:', show);
        console.log('Call stack:', new Error().stack);
        console.log('loadingOverlay element:', this.loadingOverlay);
        console.log('loadingOverlay classes before:', this.loadingOverlay ? this.loadingOverlay.className : 'element not found');
        
        if (show) {
            if (this.loadingOverlay) {
                this.loadingOverlay.style.display = 'flex';
                this.loadingOverlay.classList.add('show');
                console.log('Added show class and set display flex to loading overlay');
            } else {
                console.error('loadingOverlay element not found!');
            }
            this.sendButton.disabled = true;
            console.log('Send button disabled');
        } else {
            if (this.loadingOverlay) {
                this.loadingOverlay.classList.remove('show');
                this.loadingOverlay.style.display = 'none';
                console.log('Removed show class and set display none to loading overlay');
            } else {
                console.error('loadingOverlay element not found!');
            }
            this.updateInputState();
            console.log('Updated input state');
        }
        
        console.log('loadingOverlay classes after:', this.loadingOverlay ? this.loadingOverlay.className : 'element not found');
        console.log('=== END showLoading DEBUG ===');
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    setupPerformanceOptimizations() {
        // Set up intersection observer for message visibility
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const messageId = entry.target.dataset.messageId;
                    if (entry.isIntersecting) {
                        this.visibleMessages.add(messageId);
                    } else {
                        this.visibleMessages.delete(messageId);
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });
        }

        // Set up render queue processing
        this.processRenderQueue();

        // Set up message caching
        this.setupMessageCaching();
    }

    processRenderQueue() {
        if (this.isRendering || this.renderQueue.length === 0) return;

        this.isRendering = true;
        
        requestAnimationFrame(() => {
            const batch = this.renderQueue.splice(0, 5); // Process 5 items at a time
            
            batch.forEach(renderTask => {
                renderTask();
            });

            this.isRendering = false;
            
            // Continue processing if there are more items
            if (this.renderQueue.length > 0) {
                this.processRenderQueue();
            }
        });
    }

    setupMessageCaching() {
        // Cache frequently accessed message elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('message')) {
                            const messageId = node.dataset.messageId || Date.now().toString();
                            node.dataset.messageId = messageId;
                            this.messageCache.set(messageId, node);
                            
                            // Observe for visibility
                            if (this.intersectionObserver) {
                                this.intersectionObserver.observe(node);
                            }
                        }
                    });
                }
            });
        });

        if (this.chatMessages) {
            observer.observe(this.chatMessages, { childList: true, subtree: true });
        }
    }

    setupMobileNavigation() {
        // Mobile navigation functionality
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        if (viewport.width < 768) {
            // Add mobile-specific navigation features
            this.setupMobileMenuToggle();
            this.setupMobileGestures();
            this.setupMobileKeyboard();
        }
    }

    setupMobileGestures() {
        // Implement swipe gestures for mobile navigation
        let startX = 0;
        let startY = 0;
        let isSwipeGesture = false;

        document.addEventListener('touchstart', (event) => {
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
            isSwipeGesture = false;
        }, { passive: true });

        document.addEventListener('touchmove', (event) => {
            if (!startX || !startY) return;

            const currentX = event.touches[0].clientX;
            const currentY = event.touches[0].clientY;
            
            const diffX = startX - currentX;
            const diffY = startY - currentY;

            // Determine if this is a horizontal swipe
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                isSwipeGesture = true;
                
                // Prevent vertical scrolling during horizontal swipe
                if (Math.abs(diffX) > Math.abs(diffY) * 2) {
                    event.preventDefault();
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', (event) => {
            if (!startX || !startY || !isSwipeGesture) return;

            const endX = event.changedTouches[0].clientX;
            const diffX = startX - endX;
            const chatSidebar = document.querySelector('.chat-sidebar');

            // Swipe right (from left edge) - open sidebar
            if (diffX < -100 && startX < 50 && chatSidebar) {
                chatSidebar.classList.add('mobile-visible');
            }
            
            // Swipe left - close sidebar
            if (diffX > 100 && chatSidebar && chatSidebar.classList.contains('mobile-visible')) {
                chatSidebar.classList.remove('mobile-visible');
            }

            // Reset values
            startX = 0;
            startY = 0;
            isSwipeGesture = false;
        }, { passive: true });
    }

    setupMobileMenuToggle() {
        // Create mobile menu toggle if it doesn't exist
        let mobileToggle = document.querySelector('.mobile-menu-toggle');
        if (!mobileToggle) {
            mobileToggle = document.createElement('button');
            mobileToggle.className = 'mobile-menu-toggle';
            mobileToggle.innerHTML = '☰';
            mobileToggle.setAttribute('aria-label', 'Toggle mobile menu');
            
            const header = document.querySelector('.header');
            if (header) {
                header.appendChild(mobileToggle);
            }
        }

        // Toggle mobile menu
        mobileToggle.addEventListener('click', () => {
            const chatSidebar = document.querySelector('.chat-sidebar');
            const settingsSidebar = document.querySelector('.settings-sidebar');
            
            if (chatSidebar) {
                chatSidebar.classList.toggle('mobile-visible');
            }
            
            // Close settings if open
            if (settingsSidebar && settingsSidebar.classList.contains('visible')) {
                settingsSidebar.classList.remove('visible');
            }
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (event) => {
            const chatSidebar = document.querySelector('.chat-sidebar');
            const mobileToggle = document.querySelector('.mobile-menu-toggle');
            
            if (chatSidebar && 
                chatSidebar.classList.contains('mobile-visible') &&
                !chatSidebar.contains(event.target) &&
                !mobileToggle.contains(event.target)) {
                chatSidebar.classList.remove('mobile-visible');
            }
        });
    }

    setupMobileKeyboard() {
        // Handle mobile keyboard appearance
        let initialViewportHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            // If viewport height decreased significantly, keyboard is likely open
            if (heightDifference > 150) {
                document.body.classList.add('keyboard-open');
                
                // Scroll to bottom of chat messages
                const chatMessages = document.querySelector('.chat-messages');
                if (chatMessages) {
                    setTimeout(() => {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }, 100);
                }
            } else {
                document.body.classList.remove('keyboard-open');
            }
        });
    }

    // Test function to manually trigger the loading overlay for debugging

}

// Global reference for event handlers
let playground;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DOMContentLoaded Event ===');
    console.log('Creating playground instance...');
    playground = new LLMPlayground();
    
    // Check loading overlay state immediately after creation
    setTimeout(() => {
        console.log('=== POST-INITIALIZATION CHECK ===');
        const overlay = document.getElementById('loadingOverlay');
        console.log('Loading overlay element:', overlay);
        console.log('Loading overlay classes:', overlay ? overlay.className : 'not found');
        console.log('Loading overlay computed display:', overlay ? getComputedStyle(overlay).display : 'not found');
        console.log('Loading overlay visible:', overlay ? (getComputedStyle(overlay).display !== 'none') : 'not found');
        
        // Force hide if it's showing
        if (overlay && overlay.classList.contains('show')) {
            console.log('WARNING: Loading overlay has show class! Removing it...');
            overlay.classList.remove('show');
            console.log('Removed show class. New classes:', overlay.className);
        }
    }, 100);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations when page is hidden
        document.body.classList.add('page-hidden');
    } else {
        // Resume animations
        document.body.classList.remove('page-hidden');
    }
});

// Handle online/offline status
window.addEventListener('online', () => {
    playground?.updateStatus('connected', 'Connected');
});

window.addEventListener('offline', () => {
    playground?.updateStatus('error', 'Offline');
});