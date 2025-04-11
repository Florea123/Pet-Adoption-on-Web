const url = require('url');
const User = require('../models/User');

// Function to get a user by ID
async function getUserById(req, res) {
  const queryObject = url.parse(req.url, true).query;
  const userID = queryObject.userID;

  if (!userID) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing userID parameter' }));
    return;
  }

  try {
    // Fetch the user by ID
    const user = await User.findById(userID);
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'User not found' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(user));
  } catch (err) {
    console.error('Error fetching user:', err);
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

module.exports = { getUserById, insertUser };