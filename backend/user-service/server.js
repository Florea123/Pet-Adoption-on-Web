const http = require('http');
const url = require('url');
const UserController = require('./src/controllers/UserController');

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
  
  // Add CORS headers to all responses
  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;  // No Content
    res.end();
    return;
  }
  
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && parsedUrl.pathname === '/users/register') {
    try {
      const body = await parseBody(req);
      await UserController.register({ body }, res);
    } catch (err) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/users/login') {
    try {
      const body = await parseBody(req);
      await UserController.login({ body }, res);
    } catch (err) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/users/profile') {
    const userId = parsedUrl.query.userId;
    await UserController.getProfile({ user: { userId } }, res);
    return;
  }

  if (req.method === 'DELETE' && parsedUrl.pathname === '/users/delete') {
    try {
      const body = await parseBody(req);
      await UserController.deleteUser({ body }, res);
    } catch (err) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/users/signup')) {
    await UserController.register(req, res);
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});