const url = require('url');
const Animal = require('../models/Animal');
const FeedingSchedule = require('../models/FeedingSchedule');
const MedicalHistory = require('../models/MedicalHistory');
const Relations = require('../models/Relations');
const querystring = require('querystring');

const requestTracker = new Map();
const REQUEST_COOLDOWN = 5000;
const MAX_REQUESTS_PER_MINUTE = 30; 
const ipRequestCounts = new Map(); 

// Helper function to parse request body
const parseRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const parsedBody = body ? JSON.parse(body) : {};
        resolve(parsedBody);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', (error) => {
      reject(error);
    });
  });
};

function shouldProcessRequest(requestId, req) {
  const now = Date.now();
  const clientIp = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   'unknown';
  
  // Rate limit by IP address
  const minuteKey = `${clientIp}:${Math.floor(now / 60000)}`;
  const requestsThisMinute = ipRequestCounts.get(minuteKey) || 0;
  
  if (requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
    console.log(`[RATE LIMIT] Too many requests from ${clientIp}`);
    return false;
  }
  
  ipRequestCounts.set(minuteKey, requestsThisMinute + 1);
  
  // Check for duplicate requests
  if (requestTracker.has(requestId)) {
    const lastRequestTime = requestTracker.get(requestId);
    
    // If the same request was made too recently, reject it
    if (now - lastRequestTime < REQUEST_COOLDOWN) {
      console.log(`[DEBOUNCE] Ignoring duplicate request: ${requestId}`);
      return false;
    }
  }
  
  requestTracker.set(requestId, now);
  
  // Clean up old request entries periodically
  if (requestTracker.size > 100 || ipRequestCounts.size > 100) {
    const cutoffTime = now - (REQUEST_COOLDOWN * 2);
    const cutoffMinute = Math.floor((now - 60000) / 60000);
    
    for (const [key, timestamp] of requestTracker.entries()) {
      if (timestamp < cutoffTime) {
        requestTracker.delete(key);
      }
    }
    
    for (const [key, _] of ipRequestCounts.entries()) {
      const minuteValue = parseInt(key.split(':')[1], 10);
      if (minuteValue < cutoffMinute) {
        ipRequestCounts.delete(key);
      }
    }
  }
  
  return true;
}

// Get all animals with multimedia
async function getAllAnimals(req, res) {
  // Generate a unique request ID based on request properties
  const clientIp = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   'unknown';
  const requestId = `getAllAnimals-${clientIp}-${req.headers['x-internal-request'] || 'external'}`;
  
  if (!shouldProcessRequest(requestId, req)) {
    res.writeHead(429, { 
      "Content-Type": "application/json",
      "Retry-After": "5"
    });
    res.end(JSON.stringify({ message: "Request rate limited. Please try again later.", cached: true }));
    return;
  }
  
  try {
    const animals = await Animal.getAll();
    
    console.log(`Found ${animals.length} animals, adding multimedia...`);
    
    // Extract authorization token from request
    const authHeader = req.headers.authorization;
    const serviceHeaders = {};
    
    if (authHeader) {
      serviceHeaders['Authorization'] = authHeader;
    }

    const animalsWithMedia = await Promise.all(
      animals.map(async (animal) => {
        try {
          const multimedia = await Animal.callService(
            'multimedia-service',
            `/media/pipe/${animal.ANIMALID}`,
            'GET',
            null,
            serviceHeaders
          );
          return { ...animal, multimedia };
        } catch (mediaError) {
          console.warn(`Warning: Could not fetch multimedia for animal ${animal.ANIMALID}:`, mediaError.message);
          return { ...animal, multimedia: [] };
        }
      })
    );

    res.writeHead(200, { 
      "Content-Type": "application/json",
      "Cache-Control": "max-age=300" // 5 minute cache
    });
    res.end(JSON.stringify(animalsWithMedia));
  } catch (err) {
    console.error("Error fetching animals:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}

async function getAnimalDetailsById(req, res) {
  try {
    const body = await parseRequestBody(req);
    const { animalId } = body;

    if (!animalId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Animal ID is required" }));
      return;
    }

    const exists = await Animal.animalExists(animalId);
    if (!exists) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Animal not found" }));
      return;
    }

    const animal = await Animal.findById(animalId);
    await Animal.incrementViews(animalId);

    // Get data from this service
    const feedingSchedule = await FeedingSchedule.findByAnimalId(animalId);
    const medicalHistory = await MedicalHistory.findByAnimalId(animalId);
    const relations = await Relations.findByAnimalId(animalId);
    
    // Extract authorization token from request
    const authHeader = req.headers.authorization;
    const serviceHeaders = {};
    
    if (authHeader) {
      serviceHeaders['Authorization'] = authHeader;
    }
    
    // Get data from other services 
    let multimedia = [];
    try {
      multimedia = await Animal.callService(
        'multimedia-service', 
        `/media/pipe/${animalId}`, 
        'GET', 
        null, 
        serviceHeaders
      );
    } catch (error) {
      console.error(`Error fetching multimedia for animal ${animalId}:`, error);
    }

    // Get user data
    let owner = {};
    try {
      const ownerData = await Animal.callService(
        'user-service', 
        '/users/all/details', 
        'GET', 
        null, 
        serviceHeaders
      );
      owner = ownerData.find(user => user.USERID === animal.USERID) || {};
    } catch (error) {
      console.error(`Error fetching owner for animal ${animalId}:`, error);
    }

    // Get address data
    let address = [];
    try {
      const users = await Animal.callService(
        'user-service', 
        '/users/all/details', 
        'GET', 
        null, 
        serviceHeaders
      );
      const userWithAddress = users.find(user => user.USERID === animal.USERID);
      address = userWithAddress?.address || [];
    } catch (error) {
      console.error(`Error fetching address for user ${animal.USERID}:`, error);
    }

    const response = {
      animal,
      multimedia,
      feedingSchedule,
      medicalHistory,
      owner,
      address,
      relations
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error("Error fetching animal details:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Failed to fetch animal details" }));
  }
}

async function findBySpecies(req, res) {
  try {
    // Extract authorization token
    const authHeader = req.headers.authorization;
    const serviceHeaders = {};
    
    if (authHeader) {
      serviceHeaders['Authorization'] = authHeader;
    }
    
    const body = await parseRequestBody(req);
    const { species } = body;

    if (!species) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Species is required" }));
      return;
    }
    
    // Get animals for this species
    const animals = await Animal.findBySpecies(species);
    
    // Get popular breeds for this species
    const popularBreeds = await Animal.getPopularBreedsBySpecies(species);

    if (!animals || animals.length === 0) {
      // Still return popular breeds even when no animals are found
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ 
        error: "No animals found for this species",
        popularBreeds: popularBreeds || []
      }));
      return;
    }

    // Add multimedia to each animal 
    const animalsWithMedia = await Promise.all(
      animals.map(async (animal) => {
        try {
          const multimedia = await Animal.callService(
            'multimedia-service',
            `/media/pipe/${animal.ANIMALID}`,
            'GET',
            null,
            serviceHeaders
          );
          return { ...animal, multimedia };
        } catch (error) {
          console.warn(`Could not fetch multimedia for animal ${animal.ANIMALID}:`, error.message);
          return { ...animal, multimedia: [] };
        }
      })
    );

    // Return both animals and popular breeds
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      animals: animalsWithMedia,
      popularBreeds: popularBreeds || []
    }));
  } catch (err) {
    console.error("Error fetching animals by species:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}

async function createAnimal(req, res) {
  try {
    const body = await parseRequestBody(req);
    const {
      userID,
      name,
      breed,
      species,
      age,
      gender,
      feedingSchedule,
      medicalHistory,
      multimedia,
      relations,
    } = body;

    if (!userID || !name || !breed || !species || !age || !gender) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing required animal fields" }));
      return;
    }

    // Create the animal and get the ID directly
    const animalId = await Animal.create(userID, name, breed, species, age, gender);
    
    // Handle Feeding Schedule
    if (feedingSchedule) {
      if (Array.isArray(feedingSchedule)) {
        const feedingTimes = feedingSchedule.map((item) => item.feedingTime);
        const foodType = feedingSchedule.map((item) => item.foodType).join(", ");
        const notes = "Scheduled feeding times";
    
        await FeedingSchedule.create(animalId, feedingTimes, foodType, notes);
      }
    }

    // Handle Medical History
    if (medicalHistory) {
      if (Array.isArray(medicalHistory)) {
        for (const record of medicalHistory) {
          const { vetNumber, recordDate, description, first_aid_noted } = record;
          const formattedDate = new Date(recordDate);
          
          await MedicalHistory.create(
            animalId,
            vetNumber,
            formattedDate,
            description,
            first_aid_noted
          );
        }
      } else {
        const { vetNumber, recordDate, description, first_aid_noted } = medicalHistory;
        const formattedDate = new Date(recordDate);
        
        await MedicalHistory.create(
          animalId,
          vetNumber,
          formattedDate,
          description,
          first_aid_noted
        );
      }
    }

    // Handle Multimedia 
    if (multimedia && multimedia.length > 0) {
      for (const media of multimedia) {
        await Animal.callService(
          'multimedia-service',
          `/api/multimedia/create`,
          'POST',
          {
            animalID: animalId,
            mediaType: media.mediaType,
            url: media.url,
            description: media.description
          }
        );
      }
    }

    // Handle Relations
    if (relations && relations.friendWith) {
      await Relations.create(animalId, relations.friendWith);
    }

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        message: "Animal and related data created successfully",
        animalId,
      })
    );


    if (species) {
      try {
        await Animal.callService(
          'newsletter-service',
          `/api/newsletter/new-animal-notification`,
          'POST',
          { 
            animalId,
            species,
            name,
            breed,
            age 
          },
          { 'Cache-Control': 'no-store' } 
        );
        console.log('Newsletter service notified successfully');
      } catch (err) {
        console.error('Error notifying newsletter service:', err);
      }
    }
  } catch (err) {
    console.error("Error creating animal:", err);
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid request data or database error" }));
  }
}

async function deleteAnimal(req, res) {
  try {
    const body = await parseRequestBody(req);
    const { animalId } = body;

    if (!animalId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Animal ID is required" }));
      return;
    }

    // Check if animal exists
    const exists = await Animal.animalExists(animalId);
    if (!exists) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Animal not found" }));
      return;
    }

    // Delete the animal and all related data
    await Animal.deleteAnimalWithRelatedData(animalId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        message: "Animal and all related data successfully deleted",
      })
    );
  } catch (err) {
    console.error("Error deleting animal:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}

async function getTopAnimalsByCity(req, res) {
  try {
    // Parse the URL to extract query parameters
    const parsedUrl = url.parse(req.url, true);
    const userId = parsedUrl.query.userId;

    if (!userId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "User ID is required" }));
      return;
    }

    const topAnimals = await Animal.getTopAnimalsByCity(userId);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(topAnimals));
  } catch (error) {
    console.error("Error fetching top animals by city:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}

module.exports = {
  getAllAnimals,
  getAnimalDetailsById,
  findBySpecies,
  createAnimal,
  deleteAnimal,
  getTopAnimalsByCity
};