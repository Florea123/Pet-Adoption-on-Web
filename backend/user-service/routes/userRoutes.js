const url = require('url');
const User = require('../models/User');
const Address = require('../models/Address');
const { parseRequestBody } = require('../../utils/requestUtils');
const { generateToken } = require('../../middleware/auth');

// Function to authenticate a user by email and password 
async function getUserByEmailAndPassword(req, res) {
  try {
    const data = await parseRequestBody(req);
    const { email, password } = data;
    
    if (!email || !password) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Email and password are required" }));
      return;
    }

    const user = await User.findByEmail(email);
    
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid credentials" }));
      return;
    }

    const isMatch = await User.verifyPassword(user, password);
    
    if (!isMatch) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid credentials" }));
      return;
    }

    // Use the centralized generateToken function
    const token = generateToken({
      USERID: user.USERID,
      EMAIL: user.EMAIL,
      FIRSTNAME: user.FIRSTNAME,
      LASTNAME: user.LASTNAME,
      PHONE: user.PHONE,
      CREATEDAT: user.CREATEDAT,
      isAdmin: user.ISADMIN === 1
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Authentication successful", token }));
  } catch (error) {
    console.error("Error in getUserByEmailAndPassword:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

// Function to create a new user 
async function insertUser(req, res) {
  try {
    const body = await parseRequestBody(req);
    const { firstName, lastName, email, password, phone, address } = body;
    
    if (!firstName || !lastName || !email || !password) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing required fields" }));
      return;
    }

    await User.create(firstName, lastName, email, password, phone);
    
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('User not found after insertion');
    }

    const userId = user.USERID;
    
    if (address) {
      const { street, city, state, zipCode, country } = address;
      await Address.create(userId, street, city, state, zipCode, country);
    }

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "User and address created successfully" }));
  } catch (error) {
    console.error("Error in insertUser:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

// Get all users with details 
async function getAllUsersWithDetails(req, res) {
  try {
    // Get all users with their address details
    const users = await User.getAllUsersWithDetails();
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(users));
  } catch (error) {
    console.error("Error in getAllUsersWithDetails:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

// Delete a user
async function deleteUser(req, res) {
  try {
    const body = await parseRequestBody(req);
    const { userId } = body;

    if (!userId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "User ID is required" }));
      return;
    }
    
    const user = await User.findById(userId);
    if (!user) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "User not found" }));
      return;
    }

    await User.deleteUserWithRelatedData(userId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "User and all related data successfully deleted" }));
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

module.exports = {
  getUserByEmailAndPassword,
  insertUser,
  getAllUsersWithDetails,
  deleteUser
};