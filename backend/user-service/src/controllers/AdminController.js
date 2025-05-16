const Admin = require('../models/Admin');
const { generateToken } = require('../middleware/auth');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing email or password' }));
      return;
    }

    const admin = await Admin.findByEmailAndPassword(email, password);
    if (!admin) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'Invalid email or password' }));
      return;
    }

    admin.isAdmin = true; 
    const token = generateToken(admin);

    res.statusCode = 200;
    res.end(JSON.stringify({ message: 'Admin authentication successful', token }));
  } catch (err) {
    console.error('Error authenticating admin:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};