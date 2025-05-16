const http = require('http');
const url = require('url');
const MessageController = require('./src/controllers/MessageController');
const { withAuth } = require('./src/middleware/auth');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  req.query = parsedUrl.query;


  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;  
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'POST' && parsedUrl.pathname === '/messages/send') {
      const body = await parseBody(req);
      req.body = body;
      await MessageController.sendMessage(req, res);
      return;
    }

    if (req.method === 'POST' && parsedUrl.pathname === '/messages/conversation') {
      const body = await parseBody(req);
      req.body = body;
      await MessageController.getConversation(req, res);
      return;
    }
    if (req.method === 'GET' && req.url.startsWith('/messages/conversations')) {
      return withAuth(MessageController.getConversations)(req, res);
    }

    if (req.method === 'POST' && parsedUrl.pathname === '/messages/read') {
      const body = await parseBody(req);
      req.body = body;
      await MessageController.markMessagesAsRead(req, res);
      return;
    }

    if (req.method === 'GET' && parsedUrl.pathname === '/messages/unread-count') {
      await MessageController.getUnreadCount(req, res);
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Route not found' }));
  } catch (err) {
    console.error('Server error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`Messages Service running on port ${PORT}`);
});