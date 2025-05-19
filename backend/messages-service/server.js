const http = require('http');
const url = require('url');
const { initialize, closePool } = require('./db');
const messageRoutes = require('./routes/messageRoutes');
const { authenticateRequest } = require('../middleware/auth');
const jwt = require('jsonwebtoken'); 
require('dotenv').config();

const PORT = process.env.PORT || 3003;

// Create the HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  try {
    // Health check endpoint
    if (path === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy' }));
      return;
    }

    // Message routes - support both new and old patterns
    // Send message
    if ((path === '/api/messages/send' || path === '/messages/send') && req.method === 'POST') {
      authenticateRequest(req, res, () => messageRoutes.sendMessage(req, res));
      return;
    }

    // Get conversation
    if ((path === '/api/messages/conversation' || path === '/messages/conversation') && req.method === 'POST') {
      authenticateRequest(req, res, () => messageRoutes.getConversation(req, res));
      return;
    }

    // Get all conversations
    if ((path === '/api/messages/conversations' || path === '/messages/conversations') && req.method === 'GET') {
      authenticateRequest(req, res, () => messageRoutes.getConversations(req, res));
      return;
    }

    // Mark messages as read
    if ((path === '/api/messages/read' || path === '/messages/read') && req.method === 'POST') {
      authenticateRequest(req, res, () => messageRoutes.markMessagesAsRead(req, res));
      return;
    }

    // Get unread count
    if ((path === '/api/messages/unread-count' || path === '/messages/unread-count') && req.method === 'GET') {
      authenticateRequest(req, res, () => messageRoutes.getUnreadCount(req, res));
      return;
    }

    // If no route matches
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));

  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

// Initialize database connection and start the server
async function startServer() {
  try {
    await initialize();
    
    server.listen(PORT, () => {
      console.log(`Message service running on port ${PORT}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down...');
      await closePool();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();