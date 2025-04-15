const http = require('http');
const { getUserByEmailAndPassword, insertUser } = require('./routes/UserRoute');
const { authenticate } = require('./middleware/auth');
const { 
  getAllAnimals, 
  getAnimalDetailsById, 
  findBySpecies, 
  createAnimal,
  deleteAnimal 
} = require('./routes/AnimalRoute');

const port = 3000;

function withAuth(handler) {
  return (req, res) => authenticate(req, res, () => handler(req, res));
}


const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

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
      return withAuth(getAllAnimals)(req, res);
    } 

    if (req.method === 'POST' && req.url.startsWith('/animals/details')) {
      return withAuth(getAnimalDetailsById)(req, res);
      return;
    }

    if (req.method === 'POST' && req.url.startsWith('/animals/species')) {
      return withAuth(findBySpecies)(req, res);
      return;
    }

    if (req.method === 'POST' && req.url.startsWith('/animals/create')) {
      return withAuth(createAnimal)(req, res);
    }

    if (req.method === 'DELETE' && req.url.startsWith('/animals/delete')) {
      return withAuth(deleteAnimal)(req, res);
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