const url = require('url');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const Address = require('../models/Address');
const { parseRequestBody } = require('../utils/requestUtils');

// Function to authenticate a user by email
async function getUserByEmailAndPassword(req, res) {
  try {
    const body = await parseRequestBody(req);
    const { email, password } = body;

    if (!email || !password) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing email or password' })); 
      return;
    }

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
  try {
    const body = await parseRequestBody(req);
    const { firstName, lastName, email, password, phone, address } = body;
    console.log('Received data:', { firstName, lastName, email, password, phone, address });

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !phone || !address) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing required fields' }));
      return;
    }

    // Insert the user into the database
    await User.create(firstName, lastName, email, password, phone);
    console.log('User created successfully');

    // Retrieve the userID of the newly inserted user
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('User not found after insertion');
    }

    const userID = user.USERID;
    console.log('User ID:', userID);

    // Insert the address into the database
    const { street, city, state, zipCode, country } = address;
    await Address.create(userID, street, city, state, zipCode, country);
    console.log('Address created successfully');

    // Respond with success
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'User and address created successfully' }));
  } catch (err) {
    console.error('Error processing request:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

module.exports = { getUserByEmailAndPassword, insertUser };