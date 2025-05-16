const http = require('http');
const url = require('url');
const AnimalController = require('./src/controllers/AnimalController');

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
  
  try {
    if (req.method === 'GET' && parsedUrl.pathname === '/animals') {
      await AnimalController.getAllAnimals(req, res);
      return;
    }

    if (req.method === 'GET' && parsedUrl.pathname === '/animals/all') {
      await AnimalController.getAllAnimals(req, res);
      return;
    }

    if (req.method === 'GET' && parsedUrl.pathname.match(/^\/animals\/\d+$/)) {
      const animalId = parsedUrl.pathname.split('/')[2];
      req.params = { animalId };
      await AnimalController.getAnimalDetailsById(req, res);
      return;
    }

    if (req.method === 'GET' && parsedUrl.pathname.startsWith('/animals/species/')) {
      const species = parsedUrl.pathname.split('/animals/species/')[1];
      req.params = { species };
      await AnimalController.findBySpecies(req, res);
      return;
    }

    if (req.method === 'POST' && parsedUrl.pathname === '/animals') {
      const body = await parseBody(req);
      req.body = body;
      await AnimalController.createAnimal(req, res);
      return;
    }

    if (req.method === 'DELETE' && parsedUrl.pathname.match(/^\/animals\/\d+$/)) {
      const animalId = parseInt(parsedUrl.pathname.split('/')[2]);
      req.params = { animalId };
      await AnimalController.deleteAnimal(req, res);
      return;
    }
    if (req.method === 'GET' && parsedUrl.pathname === '/animals/top-by-city') {
      await AnimalController.getTopAnimalsByCity(req, res);
      return;
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error('Server error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Animal Service running on port ${PORT}`);
});