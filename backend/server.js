const http = require('http');
const { getUserByEmail, insertUser } = require('./routes/UserRoute');
const { authenticate } = require('./middleware/auth');

const port = 3000;

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/users') && req.method === 'GET') {

    // Authenticate the request using JWT
    await getUserByEmail(req, res); 

  } else if (req.url.startsWith('/users') && req.method === 'POST') {

    await insertUser(req, res);
    
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});