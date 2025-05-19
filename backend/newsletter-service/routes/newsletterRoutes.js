const { parseRequestBody } = require('../utils/requestUtils');
const Newsletter = require('../models/Newsletter');
const nodemailer = require('nodemailer');

// Get user's newsletter subscriptions
async function getSubscriptions(req, res) {
  try {
    const userId = req.user.id;
    const subscriptions = await Newsletter.getByUserId(userId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(subscriptions));
  } catch (err) {
    console.error('Error getting newsletter subscriptions:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

// Update user's newsletter subscriptions
async function updateSubscriptions(req, res) {
  try {
    const userId = req.user.id;
    const body = await parseRequestBody(req);
    
    await Newsletter.updateSubscriptions(userId, body.species);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } catch (err) {
    console.error('Error updating newsletter subscriptions:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

// Send newsletter emails for new animal
async function sendNewsletterEmails(req, res) {
  try {
    if (!global.emailConfigValid) {
      console.warn('Cannot send newsletter emails: Email configuration is invalid');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Email configuration is invalid' }));
      return;
    }

    const body = await parseRequestBody(req);
    const { animalId, species, name, breed, age } = body;
    
    if (!species || !name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing required animal data' }));
      return;
    }

    const subscribers = await Newsletter.getSubscribersBySpecies(species);
    
    if (subscribers.length === 0) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'No subscribers for this species' }));
      return;
    }
    
    const emailAddress = process.env.EMAIL_ADDRESS;
    const emailPassword = process.env.EMAIL_PASSWORD;
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailAddress,
        pass: emailPassword
      }
    });
    
    const emailSubject = `New ${species} Added: ${name}`;
    const emailContent = `
      <h2>A new ${species} has been added to Pet Adoption!</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Breed:</strong> ${breed || 'Not specified'}</p>
      <p><strong>Age:</strong> ${age || 'Not specified'}</p>
      <p><a href="http://localhost:8080/Home/Home.html">View on Pet Adoption</a></p>
      <hr>
      <p>You received this email because you subscribed to ${species} notifications. 
      To update your preferences, visit your <a href="http://localhost:8080/Newsletter/Newsletter.html">Newsletter settings</a>.</p>
    `;
    
    for (const subscriber of subscribers) {
      await transporter.sendMail({
        from: `"Pet Adoption" <${emailAddress}>`,
        to: subscriber.EMAIL,
        subject: emailSubject,
        html: emailContent
      });
    }
    
    console.log(`Newsletter emails sent for new ${species}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, emailsSent: subscribers.length }));
  } catch (err) {
    console.error('Error sending newsletter emails:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

module.exports = {
  getSubscriptions,
  updateSubscriptions,
  sendNewsletterEmails
};