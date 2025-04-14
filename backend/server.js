const http = require('http');
const { getUserByEmailAndPassword, insertUser } = require('./routes/UserRoute');
const { authenticate } = require('./middleware/auth');
const { getAllAnimals, getAnimalDetailsById, findBySpecies, createAnimal } = require('./routes/AnimalRoute');

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

  try {
    // User routes
    if (req.method === 'POST' && req.url.startsWith('/users/login')) {
      await getUserByEmailAndPassword(req, res);
      return;
    }

    if (req.method === 'POST' && req.url.startsWith('/users/signup')) {
      await insertUser(req, res);
      return;
    }

    // Animal routes
    if(req.method === 'GET' && req.url.startsWith('/animals/all')) {
      await getAllAnimals(req, res);
      return;
    } 

    if (req.method === 'POST' && req.url.startsWith('/animals/details')) {
      await getAnimalDetailsById(req, res);
      return;
    }

    if (req.method === 'POST' && req.url.startsWith('/animals/species')) {
      await findBySpecies(req, res);
      return;
    }

    if (req.method === 'POST' && req.url.startsWith('/animals/create')) {
      await createAnimal(req, res);
      return;
    }

    // Route not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found' }));
    
  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});