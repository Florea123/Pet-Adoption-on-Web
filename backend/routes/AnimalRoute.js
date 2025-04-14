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

    // Validate required fields
    if (!userID || !name || !breed || !species || !age || !gender) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing required animal fields" }));
      return;
    }

    // Create the animal
    await Animal.create(userID, name, breed, species, age, gender);

    // Get the ID of the newly created animal
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

    // Insert feeding schedule if provided
    if (feedingSchedule) {
      const { feeding_time, food_type, notes } = feedingSchedule;
      await FeedingSchedule.create(
        animalId,
        feeding_time,
        food_type,
        notes
      );
    }

    // Insert medical history if provided
     if (medicalHistory) {
      const { vetNumber, recordDate, description, first_aid_noted } =
        medicalHistory;
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

    // Insert multimedia if provided
    if (multimedia && multimedia.length > 0) {
      for (const media of multimedia) {
        const { mediaType, url, description } = media;
        const upload_date = new Date(); 
        await MultiMedia.create(
          animalId,
          mediaType,
          url,
          description,
          upload_date
        );
      }
    }

    // Insert relations if provided
    if (relations && relations.friendWith) {
      await Relations.create(animalId, relations.friendWith);
    }

    // Send success response with the newly created animal's ID
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        message: "Animal and related data created successfully",
        animalId
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

module.exports = {
  getAllAnimals,
  getAnimalDetailsById,
  findBySpecies,
  createAnimal,
};