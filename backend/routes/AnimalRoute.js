const Animal = require("../models/Animal");
const MultiMedia = require("../models/MultiMedia");
const FeedingSchedule = require("../models/FeedingSchedule");
const MedicalHistory = require("../models/MedicalHistory");
const User = require("../models/User");
const Address = require("../models/Address");
const Relations = require("../models/Relations");
const { parseRequestBody } = require("../utils/requestUtils");

// Get all animals with multimedia
async function getAllAnimals(req, res) {
  try {
    const animals = await Animal.getAll();

    const animalsWithMedia = await Promise.all(
      animals.map(async (animal) => {
        const multimedia = await MultiMedia.findByAnimalIdOnePhoto(
          animal.ANIMALID
        );
        return { ...animal, multimedia };
      })
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(animalsWithMedia));
  } catch (err) {
    console.error("Error fetching animals:", err);

    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
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

    const animal = await Animal.findById(animalId);
    if (!animal) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Animal not found" }));
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

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
  } catch (err) {
    console.error("Error fetching animal details:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}

async function findBySpecies(req, res) {
  try {
    const body = await parseRequestBody(req);
    const { species } = body;

    if (!species) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Species is required" }));
      return;
    }
    console.log("Species:", species);
    const animals = await Animal.findBySpecies(species);
    if (!animals || animals.length === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No animals found for this species" }));
      return;
    }

    // Add multimedia to each animal, just like in getAllAnimals
    const animalsWithMedia = await Promise.all(
      animals.map(async (animal) => {
        const multimedia = await MultiMedia.findByAnimalIdOnePhoto(
          animal.ANIMALID
        );
        return { ...animal, multimedia };
      })
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(animalsWithMedia));
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

    // Create the animal
    await Animal.create(userID, name, breed, species, age, gender);
    
    const animals = await Animal.findByUserId(userID);
    const newAnimal = animals.find(
      (animal) =>
        animal.NAME === name &&
        animal.BREED === breed &&
        animal.SPECIES === species
    );

    if (!newAnimal) {
      throw new Error("Failed to retrieve the newly created animal");
    }

    const animalId = newAnimal.ANIMALID;

    // Handle Feeding Schedule
    if (feedingSchedule) {
      console.log("Feeding schedule:", feedingSchedule);
    
      if (Array.isArray(feedingSchedule)) {
        // Extract feeding times from the array of objects
        const feedingTimes = feedingSchedule.map((item) => item.feedingTime);
        const foodType = feedingSchedule
          .map((item) => item.foodType)
          .join(", ");
        const notes = "Scheduled feeding times";
    
        console.log("Extracted feeding times:", feedingTimes);
    
        await FeedingSchedule.create(
          animalId,
          feedingTimes, 
          foodType,
          notes
        );
      }
    }

    // Handle Medical History
    if (medicalHistory) {
      console.log("Medical history:", medicalHistory);
      
      if (Array.isArray(medicalHistory)) {
        // Handle array of medical records
        for (const record of medicalHistory) {
          const { vetNumber, recordDate, description, first_aid_noted } = record;
          // Convert recordDate to Oracle date format
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
        // Handle single record case
        const { vetNumber, recordDate, description, first_aid_noted } = medicalHistory;
        // Convert recordDate to Oracle date format
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
      console.log("Multimedia:", multimedia);
      
      // Multimedia is already an array, so we can simply iterate through it
      for (const media of multimedia) {
        const { mediaType, url, description } = media;
        const upload_date = new Date();
        
        console.log(`Creating multimedia: ${mediaType}, ${url}`);
        
        await MultiMedia.create(
          animalId,
          mediaType,
          url,
          description,
          upload_date
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
  } catch (err) {
    console.error("Error parsing request or creating animal:", err);
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Invalid request data or database error" })
    );
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
    const animal = await Animal.findById(animalId);
    if (!animal) {
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

module.exports = {
  getAllAnimals,
  getAnimalDetailsById,
  findBySpecies,
  createAnimal,
  deleteAnimal,
};
