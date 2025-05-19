const http = require('http');
const url = require('url');
const { initialize, closePool } = require('./db');
const newsletterRoutes = require('./routes/newsletterRoutes');
const { authenticateRequest } = require('../middleware/auth');
const nodemailer = require('nodemailer');
require('dotenv').config();

const PORT = process.env.PORT || 3004;

// Email configuration validation
let emailConfigValid = false;

async function validateEmailConfig() {
  const emailAddress = process.env.EMAIL_ADDRESS;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailAddress || !emailPassword) {
    console.error('Email configuration missing. Check your .env file for EMAIL_ADDRESS and EMAIL_PASSWORD.');
    return false;
  }

  try {
    console.log(`Testing email connection for ${emailAddress}...`);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailAddress,
        pass: emailPassword
      }
    });

    await transporter.verify();
    console.log('✅ Email configuration is valid and connected to Gmail successfully!');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    console.error('Newsletter emails will not be sent until this is resolved.');
    return false;
  }
}

// Create the HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  try {
    // Health check endpoint
    if (path === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy' }));
      return;
    }

    // Get subscriptions
    if ((path === '/api/newsletter/subscriptions' || path === '/newsletter/subscriptions') && req.method === 'GET') {
      authenticateRequest(req, res, () => newsletterRoutes.getSubscriptions(req, res));
      return;
    }

    // Update subscriptions
    if ((path === '/api/newsletter/update' || path === '/newsletter/update') && req.method === 'POST') {
      authenticateRequest(req, res, () => newsletterRoutes.updateSubscriptions(req, res));
      return;
    }

    // Send newsletter emails
    if ((path === '/api/newsletter/send-emails' || path === '/newsletter/send-emails') && req.method === 'POST') {
      newsletterRoutes.sendNewsletterEmails(req, res);
      return;
    }
    
    // Handle new animal notification endpoint
    if ((path === '/api/newsletter/new-animal-notification') && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Notification acknowledged' }));
      return;
    }

    // If no route matches
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));

  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

async function startServer() {
  try {
    await initialize();
    console.log('Database connection pool initialized');
    
    emailConfigValid = await validateEmailConfig();
    global.emailConfigValid = emailConfigValid;

    server.listen(PORT, () => {
      console.log(`Newsletter service running on http://localhost:${PORT}`);
    });
    
    // Set up graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down newsletter service');
      await closePool();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();