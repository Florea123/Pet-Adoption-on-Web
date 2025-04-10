const http = require('http'); 

const port = 3000; 

// Create an HTTP server
const server = http.createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') { 
    res.writeHead(200, { 'Content-Type': 'text/plain' }); 
    res.end('Hello World'); 
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' }); 
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`); 
});