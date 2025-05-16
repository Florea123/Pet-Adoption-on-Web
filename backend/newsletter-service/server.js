const http = require('http');
const url = require('url');
const NewsletterController = require('./src/controllers/NewsletterController');
const Newsletter = require('./src/models/Newsletter');

// Helper to parse JSON body
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
    // Subscribe to newsletter
    if (req.method === 'POST' && parsedUrl.pathname === '/newsletter/subscribe') {
      const body = await parseBody(req);
      const { email } = body;
      if (!email) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Email is required' }));
        return;
      }
      await Newsletter.subscribe(email);
      res.statusCode = 201;
      res.end(JSON.stringify({ message: 'Subscribed successfully' }));
      return;
    }

    // Unsubscribe from newsletter
    if (req.method === 'POST' && parsedUrl.pathname === '/newsletter/unsubscribe') {
      const body = await parseBody(req);
      const { email } = body;
      if (!email) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Email is required' }));
        return;
      }
      await Newsletter.unsubscribe(email);
      res.statusCode = 200;
      res.end(JSON.stringify({ message: 'Unsubscribed successfully' }));
      return;
    }

    // Get all subscribers
    if (req.method === 'GET' && parsedUrl.pathname === '/newsletter/subscribers') {
      const subscribers = await Newsletter.getAllSubscribers();
      res.statusCode = 200;
      res.end(JSON.stringify(subscribers));
      return;
    }

    // Get subscriptions (newly added route)
    if (req.method === 'GET' && parsedUrl.pathname === '/newsletter/subscriptions') {
      // Example authentication (replace with real auth in production)
      req.user = { id: 1 }; // TEMP: Replace with actual user ID logic
      await NewsletterController.getSubscriptions(req, res);
      return;
    }

    // Not found
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Route not found' }));
  } catch (err) {
    console.error('Server error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
  console.log(`Newsletter Service running on port ${PORT}`);
});