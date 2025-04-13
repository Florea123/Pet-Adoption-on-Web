const http = require('http');
const { getUserByEmailAndPassword, insertUser } = require('./routes/UserRoute');
const { authenticate } = require('./middleware/auth');
const { getAllAnimals, getAnimalDetailsById } = require('./routes/AnimalRoute');

const port = 3000;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url.startsWith('/users/login')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        req.body = JSON.parse(body); // Parse JSON body
        await getUserByEmailAndPassword(req, res); // Pass the parsed body to the handler
      } catch (err) {
        console.error('Invalid JSON:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' })); // Ensure JSON response
      }
    });
  }

  if(req.method === 'GET' && req.url.startsWith('/animals')) {
    await getAllAnimals(req, res);

  } 

  if (req.method === 'POST' && req.url.startsWith('/animals/details')) {
    await getAnimalDetailsById(req, res);
  }

});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});