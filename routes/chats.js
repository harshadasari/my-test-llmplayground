const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Path to store chat data
const CHATS_DIR = path.join(__dirname, '..', 'data', 'chats');
const CHATS_INDEX_FILE = path.join(CHATS_DIR, 'index.json');

// Ensure chats directory exists
async function ensureChatsDir() {
  try {
    await fs.access(CHATS_DIR);
  } catch {
    await fs.mkdir(CHATS_DIR, { recursive: true });
  }
}

// Load chats index
async function loadChatsIndex() {
  try {
    await ensureChatsDir();
    const data = await fs.readFile(CHATS_INDEX_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save chats index
async function saveChatsIndex(chats) {
  await ensureChatsDir();
  await fs.writeFile(CHATS_INDEX_FILE, JSON.stringify(chats, null, 2));
}

// Generate chat title from first message
function generateChatTitle(messages) {
  const userMessage = messages.find(msg => msg.role === 'user');
  if (!userMessage) return 'New Chat';
  
  const content = userMessage.content.trim();
  if (content.length <= 50) return content;
  return content.substring(0, 47) + '...';
}

// GET /api/chats - List all chats
router.get('/chats', async (req, res) => {
  try {
    const chats = await loadChatsIndex();
    res.json({
      status: 'success',
      chats: chats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    });
  } catch (error) {
    console.error('Error loading chats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to load chats',
      reason: error.message
    });
  }
});

// GET /api/chats/:id - Get specific chat
router.get('/chats/:id', async (req, res) => {
  try {
    const chatId = req.params.id;
    const chatFile = path.join(CHATS_DIR, `${chatId}.json`);
    
    const data = await fs.readFile(chatFile, 'utf8');
    const chat = JSON.parse(data);
    
    res.json({
      status: 'success',
      chat
    });
  } catch (error) {
    console.error('Error loading chat:', error);
    res.status(404).json({
      status: 'error',
      message: 'Chat not found',
      reason: error.message
    });
  }
});

// POST /api/chats - Save new chat
router.post('/chats', async (req, res) => {
  try {
    const { messages, settings, title } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid chat data',
        reason: 'Messages array is required and cannot be empty'
      });
    }

    const chatId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    
    const chat = {
      id: chatId,
      title: title || generateChatTitle(messages),
      messages,
      settings: settings || {},
      createdAt: now,
      updatedAt: now
    };

    // Save chat file
    const chatFile = path.join(CHATS_DIR, `${chatId}.json`);
    await fs.writeFile(chatFile, JSON.stringify(chat, null, 2));

    // Update index
    const chats = await loadChatsIndex();
    chats.push({
      id: chatId,
      title: chat.title,
      createdAt: now,
      updatedAt: now,
      messageCount: messages.length
    });
    await saveChatsIndex(chats);

    res.json({
      status: 'success',
      chat: {
        id: chatId,
        title: chat.title,
        createdAt: now,
        updatedAt: now
      }
    });
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save chat',
      reason: error.message
    });
  }
});

// PUT /api/chats/:id - Update existing chat
router.put('/chats/:id', async (req, res) => {
  try {
    const chatId = req.params.id;
    const { messages, settings, title } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid chat data',
        reason: 'Messages array is required'
      });
    }

    const chatFile = path.join(CHATS_DIR, `${chatId}.json`);
    
    // Load existing chat
    let existingChat;
    try {
      const data = await fs.readFile(chatFile, 'utf8');
      existingChat = JSON.parse(data);
    } catch {
      return res.status(404).json({
        status: 'error',
        message: 'Chat not found'
      });
    }

    const now = new Date().toISOString();
    const updatedChat = {
      ...existingChat,
      title: title || existingChat.title,
      messages,
      settings: settings || existingChat.settings,
      updatedAt: now
    };

    // Save updated chat
    await fs.writeFile(chatFile, JSON.stringify(updatedChat, null, 2));

    // Update index
    const chats = await loadChatsIndex();
    const chatIndex = chats.findIndex(c => c.id === chatId);
    if (chatIndex !== -1) {
      chats[chatIndex] = {
        ...chats[chatIndex],
        title: updatedChat.title,
        updatedAt: now,
        messageCount: messages.length
      };
      await saveChatsIndex(chats);
    }

    res.json({
      status: 'success',
      chat: {
        id: chatId,
        title: updatedChat.title,
        updatedAt: now
      }
    });
  } catch (error) {
    console.error('Error updating chat:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update chat',
      reason: error.message
    });
  }
});

// DELETE /api/chats/:id - Delete chat
router.delete('/chats/:id', async (req, res) => {
  try {
    const chatId = req.params.id;
    const chatFile = path.join(CHATS_DIR, `${chatId}.json`);
    
    // Delete chat file
    await fs.unlink(chatFile);
    
    // Update index
    const chats = await loadChatsIndex();
    const filteredChats = chats.filter(c => c.id !== chatId);
    await saveChatsIndex(filteredChats);
    
    res.json({
      status: 'success',
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete chat',
      reason: error.message
    });
  }
});

module.exports = router;