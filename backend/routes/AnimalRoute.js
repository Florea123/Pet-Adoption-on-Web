const Animal = require('../models/Animal');
const MultiMedia = require('../models/MultiMedia');
const FeedingSchedule = require('../models/FeedingSchedule');
const MedicalHistory = require('../models/MedicalHistory');
const User = require('../models/User');
const Address = require('../models/Address');

// Get all animals with multimedia
async function getAllAnimals(req, res) {
  try {
    const animals = await Animal.getAll();

    const animalsWithMedia = await Promise.all(
      animals.map(async (animal) => {
        const multimedia = await MultiMedia.findByAnimalIdOnePhoto(animal.ANIMALID);
        return { ...animal, multimedia };
      })
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(animalsWithMedia));
  } catch (err) {
    console.error('Error fetching animals:', err);

    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }
}

async function getAnimalDetailsById(req, res) {
  try {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      const { animalId } = JSON.parse(body);

      if (!animalId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Animal ID is required' }));
        return;
      }

      const animal = await Animal.findById(animalId);
      if (!animal) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Animal not found' }));
        return;
      }

      const multimedia = await MultiMedia.findByAnimalId(animalId);
      const feedingSchedule = await FeedingSchedule.findByAnimalId(animalId);
      const medicalHistory = await MedicalHistory.findByAnimalId(animalId);
      const owner = await User.findById(animal.USERID);
      const address = await Address.findByUserId(animal.USERID); 

      const response = {
        animal,
        multimedia,
        feedingSchedule,
        medicalHistory,
        owner,
        address, 
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    });
  } catch (err) {
    console.error('Error fetching animal details:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

module.exports = { getAllAnimals, getAnimalDetailsById };