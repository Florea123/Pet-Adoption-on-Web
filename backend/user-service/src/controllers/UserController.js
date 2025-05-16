const User = require('../models/User');
const Address = require('../models/Address');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;

// Registration with address handling
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, address } = req.body;
    console.log('Received data:', { firstName, lastName, email, password, phone, address });

    if (!firstName || !lastName || !email || !password || !phone || !address) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing required fields' }));
      return;
    }

    await User.create(firstName, lastName, email, password, phone);
    console.log('User created successfully');

    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('User not found after insertion');
    }

    const userID = user.USERID;
    console.log('User ID:', userID);

    const { street, city, state, zipCode, country } = address;
    await Address.create(userID, street, city, state, zipCode, country);
    console.log('Address created successfully');

    res.statusCode = 201;
    res.end(JSON.stringify({ message: 'User and address created successfully' }));
  } catch (err) {
    console.error('Error processing request:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};

// Login using your existing implementation with generateToken
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing email or password' })); 
      return;
    }

    const user = await User.findByEmailAndPassword(email, password);
    if (!user) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Email or password wrong' })); 
      return;
    }

    const token = generateToken(user);
    res.statusCode = 200;
    res.end(JSON.stringify({ message: 'Authentication successful', token })); 
  } catch (err) {
    console.error('Error authenticating user:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' })); 
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.query.userId || (req.user && req.user.userId);
    if (!userId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'User ID is required' }));
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'User not found' }));
      return;
    }

    // Fetch address if available
    let address = null;
    try {
      address = await Address.findByUserId(userId);
    } catch (err) {
      // Address is optional, so ignore errors here
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ user, address }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
};

// Delete user with all related data
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: "User ID is required" }));
      return;
    }
    
    const user = await User.findById(userId);
    if (!user) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "User not found" }));
      return;
    }

    await User.deleteUserWithRelatedData(userId);

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        message: "User and all related data successfully deleted",
      })
    );
  } catch (err) {
    console.error("Error deleting user:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
};

// Get all users with details
exports.getAllUsersWithDetails = async (req, res) => {
  try {
    const users = await User.getAllUsersWithDetails();
  
    res.statusCode = 200;
    res.end(JSON.stringify(users));
    
  } catch (err) {
    console.error("Error retrieving users with details:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
};