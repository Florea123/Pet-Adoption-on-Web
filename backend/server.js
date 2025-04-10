const http = require('http');
const User = require('./models/User');

const port = 3000;

const server = http.createServer(async (req, res) => {
  //if (req.url === '/users' && req.method === 'POST') {
   /* // Example: Create a new user
    const newUser = await User.create('John', 'Doe', 'john.doe@example.com', 'password123', '1234567890');
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'User created', user: newUser }));
  } else*/ 
   if (req.url.startsWith('/users') && req.method === 'GET') {
    // Example: Fetch a user by ID
    const userID = req.url.split('/')[2];
    const user = await User.findById(userID);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(user));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});