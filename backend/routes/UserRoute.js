const url = require('url');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// Function to authenticate a user by email
async function getUserByEmailAndPassword(req, res) {
  const { email } = req.body;
  const { password } = req.body;

  if (!email || !password) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing email or password' })); 
    return;
  }

  try {
    const user = await User.findByEmailAndPassword(email, password);
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Email or password wrong' })); 
      return;
    }

    const token = generateToken(user);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Authentication successful', token })); 
  } catch (err) {
    console.error('Error authenticating user:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' })); 
  }
}
// Function to insert a new user
async function insertUser(req, res) {
  const queryObject = url.parse(req.url, true).query;

  const { firstName, lastName, email, password, phone } = queryObject;

  if (!firstName || !lastName || !email || !password || !phone) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing required fields' }));
    return;
  }

  try {
    // Insert the user into the database
    const result = await User.create(firstName, lastName, email, password, phone);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'User created successfully', result }));
  } catch (err) {
    console.error('Error inserting user:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

module.exports = { getUserByEmailAndPassword, insertUser };