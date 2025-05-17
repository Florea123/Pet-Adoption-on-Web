const http = require('http');
const Animal = require('../models/Animal');
const FeedingSchedule = require('../models/FeedingSchedule');
const MedicalHistory = require('../models/MedicalHistory');
const Relations = require('../models/Relations');
const { fetchMultimedia } = require('../models/Animal'); // Add this at the top if not present

async function fetchUserAndAddress(userId) {
  return new Promise((resolve) => {
    const options = {
      hostname: process.env.USER_SERVICE_HOST || 'localhost',
      port: process.env.USER_SERVICE_PORT || 3001,
      path: `/users/profile?userId=${userId}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    console.log(`Fetching user profile for ID ${userId} from ${options.hostname}:${options.port}${options.path}`);

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          console.log(`User profile response status: ${res.statusCode}`);
          console.log(`User profile raw data: ${data}`);
          
          if (res.statusCode !== 200) {
            console.error(`Error fetching user profile: HTTP ${res.statusCode}`);
            return resolve({ user: null, address: null });
          }
          
          const parsed = JSON.parse(data);
          console.log('Parsed user profile:', JSON.stringify(parsed, null, 2));
          
          // Check all possible address formats
          let addressData = null;
          
          if (parsed.address) {
            // Direct address object
            addressData = parsed.address;
          } else if (parsed.user && parsed.user.address) {
            // Nested in user object
            addressData = parsed.user.address;
          }
          
          // Convert to array if needed
          const formattedAddress = addressData ? 
            (Array.isArray(addressData) ? addressData : [addressData]) : 
            [];
            
          console.log('Formatted address:', JSON.stringify(formattedAddress, null, 2));
          
          resolve({ 
            user: parsed.user || parsed, 
            address: formattedAddress 
          });
        } catch (err) {
          console.error("Error parsing user profile response:", err);
          resolve({ user: null, address: null });
        }
      });
    });

    req.on('error', (err) => {
      console.error("Error fetching user profile:", err);
      resolve({ user: null, address: null });
    });
    
    // Set timeout
    req.setTimeout(5000, () => {
      console.error("Timeout fetching user profile");
      req.destroy();
      resolve({ user: null, address: null });
    });
    
    req.end();
  });
}

exports.getAllAnimals = async (req, res) => {
  try {
    const animals = await Animal.getAll();

    // Optionally, attach multimedia to each animal
    const animalsWithMedia = await Promise.all(
      animals.map(async (animal) => {
        const multimedia = await fetchMultimedia(animal.ANIMALID);
        return { ...animal, multimedia: multimedia || [] };
      })
    );

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(animalsWithMedia));
  } catch (err) {
    console.error("Error fetching animals:", err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
};

exports.getAnimalDetailsById = async (req, res) => {
  try {
    const { animalId } = req.params || req.body;

    if (!animalId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: "Animal ID is required" }));
      return;
    }

    const exists = await Animal.animalExists(animalId);
    if (!exists) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: "Animal not found" }));
      return;
    }

    const animal = await Animal.findById(animalId);
    await Animal.incrementViews(animalId);

    const feedingSchedule = await FeedingSchedule.findByAnimalId(animalId);
    const medicalHistory = await MedicalHistory.findByAnimalId(animalId);
    const relations = await Relations.findByAnimalId(animalId);
    const multimedia = await Animal.fetchMultimedia(animalId);

    let friendRelations = [];
    if (relations && relations.length > 0) {
      friendRelations = relations.map((relation) => ({
        ID: relation.ID,
        FRIENDWITH: relation.FRIENDWITH,
      }));
    }

    // Normalize animal fields to match monolithic structure
    const normalizeAnimal = (animal) => ({
      ANIMALID: animal.ANIMALID || animal.animalID || animal.id,
      NAME: animal.NAME || animal.name,
      BREED: animal.BREED || animal.breed,
      SPECIES: animal.SPECIES || animal.species,
      AGE: animal.AGE || animal.age,
      GENDER: animal.GENDER || animal.gender,
      USERID: animal.USERID || animal.userID,
      // Add more fields as needed
    });

    const { user: owner, address } = await fetchUserAndAddress(animal.USERID);

    const response = {
      animal: normalizeAnimal(animal),
      multimedia: multimedia || [],
      owner: owner || null,
      address: address || null,
      feedingSchedule: feedingSchedule || [],
      medicalHistory: medicalHistory || [],
      relations: friendRelations || [],
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(response));
  } catch (error) {
    console.error("Error fetching animal details:", error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: "Failed to fetch animal details" }));
  }
};

exports.findBySpecies = async (req, res) => {
  try {
    const { species } = req.params || req.body;

    if (!species) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: "Species is required" }));
      return;
    }
    
    const animals = await Animal.findBySpecies(species);
    
    const popularBreeds = await Animal.getPopularBreedsBySpecies(species);

    if (!animals || animals.length === 0) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: "No animals found for this species",
        popularBreeds: popularBreeds || []
      }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      animals: animals,
      popularBreeds: popularBreeds || []
    }));
  } catch (err) {
    console.error("Error fetching animals by species:", err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
};

exports.createAnimal = async (req, res) => {
  let connection = null;
  try {
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
    } = req.body;

    if (!userID || !name || !breed || !species || !age || !gender) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: "Missing required animal fields" }));
      return;
    }

    console.log("Creating animal:", name, breed, species);
    
    // Create the animal record
    const animalId = await Animal.create(userID, name, breed, species, age, gender);
    console.log("Animal created with ID:", animalId);
    
    // Process feeding schedule
    if (feedingSchedule && Array.isArray(feedingSchedule) && feedingSchedule.length > 0) {
      try {
        const feedingTimes = feedingSchedule.map((item) => item.feedingTime);
        const foodType = feedingSchedule
          .map((item) => item.foodType)
          .join(", ");
        const notes = "Scheduled feeding times";
    
        await FeedingSchedule.create(
          animalId,
          feedingTimes, 
          foodType,
          notes
        );
        console.log("Feeding schedule created for animal:", animalId);
      } catch (error) {
        console.error("Error creating feeding schedule:", error);
      }
    }
    
    // Process medical history
    if (medicalHistory && Array.isArray(medicalHistory) && medicalHistory.length > 0) {
      try {
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
        console.log("Medical history created for animal:", animalId);
      } catch (error) {
        console.error("Error creating medical history:", error);
      }
    }
    
    // Process multimedia
    if (multimedia && Array.isArray(multimedia) && multimedia.length > 0) {
      try {
        // For each multimedia item, create a record via the API
        const multimediaPromises = multimedia.map(async (item) => {
          const { mediaType, url, description } = item;
          
          // Create a record in the multimedia service
          const mediaServiceUrl = process.env.MULTIMEDIA_SERVICE_URL || 'http://localhost:3004';
          const options = {
            hostname: new URL(mediaServiceUrl).hostname,
            port: new URL(mediaServiceUrl).port,
            path: '/multimedia/create', // Use the new endpoint
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': req.headers.authorization || ''
            }
          };
          
          return new Promise((resolve, reject) => {
            const mediaReq = http.request(options, (mediaRes) => {
              let data = '';
              mediaRes.on('data', chunk => data += chunk);
              mediaRes.on('end', () => {
                try {
                  if (mediaRes.statusCode >= 200 && mediaRes.statusCode < 300) {
                    resolve();
                  } else {
                    reject(new Error(`Failed to create multimedia: ${data}`));
                  }
                } catch (error) {
                  reject(error);
                }
              });
            });
            
            mediaReq.on('error', reject);
            mediaReq.write(JSON.stringify({
              animalID: animalId,
              media: mediaType,
              url: url,
              description: description || '',
              upload_date: new Date()
            }));
            mediaReq.end();
          });
        });
        
        await Promise.allSettled(multimediaPromises);
        console.log("Multimedia entries created for animal:", animalId);
      } catch (error) {
        console.error("Error creating multimedia:", error);
      }
    }
    
    // Process relations
    if (relations && relations.friendWith) {
      try {
        await Relations.create(animalId, relations.friendWith);
        console.log("Relations created for animal:", animalId);
      } catch (error) {
        console.error("Error creating relations:", error);
      }
    }

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        message: "Animal and related data created successfully",
        animalId,
      })
    );
  } catch (err) {
    console.error("Error parsing request or creating animal:", err);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({ error: "Invalid request data or database error" })
    );
  }
};

exports.deleteAnimal = async (req, res) => {
  try {
    const { animalId } = req.params || req.body;

    if (!animalId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: "Animal ID is required" }));
      return;
    }

    // Check if animal exists 
    const exists = await Animal.animalExists(animalId);
    if (!exists) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: "Animal not found" }));
      return;
    }

    // Replace Animal.delete with the correct method
    await Animal.deleteAnimalWithRelatedData(animalId);
    

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        message: "Animal and related data successfully deleted",
      })
    );
  } catch (err) {
    console.error("Error deleting animal:", err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
};

exports.getTopAnimalsByCity = async (req, res) => {
  try {
    const userId = req.query?.userId;
    if (!userId) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: "User ID is required" }));
      return;
    }

    const topAnimals = await Animal.getTopAnimalsByCity(userId);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(topAnimals));
  } catch (error) {
    console.error("Error fetching top animals by city:", error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
};