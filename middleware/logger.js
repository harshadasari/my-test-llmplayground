const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFileName(type = 'general') {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `${type}-${date}.log`);
  }

  formatLogEntry(level, message, metadata = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata
    }) + '\n';
  }

  writeLog(filename, entry) {
    try {
      fs.appendFileSync(filename, entry);
    } catch (error) {
      console.error('Failed to write log:', error.message);
    }
  }

  logRequest(req, res, next) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    req.requestId = requestId;
    req.startTime = startTime;

    // Log incoming request
    const requestLog = this.formatLogEntry('INFO', 'Incoming request', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      body: req.method === 'POST' ? req.body : undefined
    });

    this.writeLog(this.getLogFileName('requests'), requestLog);

    // Override res.json to log responses
    const originalJson = res.json;
    res.json = (body) => {
      const duration = Date.now() - startTime;
      
      const responseLog = this.formatLogEntry('INFO', 'Response sent', {
        requestId,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        body: body
      });

      this.writeLog(this.getLogFileName('responses'), responseLog);
      return originalJson.call(res, body);
    };

    next();
  }

  logPrompt(prompt, provider, model, requestId) {
    const promptLog = this.formatLogEntry('INFO', 'Prompt logged', {
      requestId,
      provider,
      model,
      prompt: prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''),
      promptLength: prompt.length
    });

    this.writeLog(this.getLogFileName('prompts'), promptLog);
  }

  logSafetyCheck(type, content, result, requestId) {
    const safetyLog = this.formatLogEntry('INFO', `Safety check: ${type}`, {
      requestId,
      type,
      safe: result.safe,
      reason: result.reason,
      confidence: result.confidence,
      contentLength: content.length
    });

    this.writeLog(this.getLogFileName('safety'), safetyLog);
  }

  logError(error, context = {}) {
    const errorLog = this.formatLogEntry('ERROR', error.message, {
      stack: error.stack,
      ...context
    });

    this.writeLog(this.getLogFileName('errors'), errorLog);
  }
}

module.exports = new Logger();