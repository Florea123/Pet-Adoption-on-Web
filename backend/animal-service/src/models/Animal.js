const { getConnection } = require('../../db');
const oracledb = require('oracledb');
const FeedingSchedule = require('./FeedingSchedule');
const MedicalHistory = require('./MedicalHistory');
const Relations = require('./Relations');
const http = require('http');

async function fetchUserAndAddress(userId) {
  return new Promise((resolve) => {
    const options = {
      hostname: process.env.USER_SERVICE_HOST || 'localhost',
      port: process.env.USER_SERVICE_PORT || 3001,
      path: `/users/profile?userId=${userId}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (err) {
          resolve({ user: null, address: null });
        }
      });
    });

    req.on('error', () => resolve({ user: null, address: null }));
    req.end();
  });
}

class Animal {
  static async create(userID, name, breed, species, age, gender) {
    const connection = await getConnection();
    try {

      const result = await connection.execute(
        `INSERT INTO Animal (userID, name, breed, species, age, gender) 
         VALUES (:userID, :name, :breed, :species, :age, :gender)
         RETURNING animalID INTO :animalID`,
        { 
          userID, name, breed, species, age, gender,
          animalID: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true }
      );
      
      
      return result.outBinds.animalID[0];
    } finally {
      await connection.close();
    }
  }

  static async getAll() {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Animal`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const animals = result.rows || [];
      // Attach multimedia via API
      return await Promise.all(
        animals.map(async (animal) => {
          const multimedia = await this.fetchMultimedia(animal.ANIMALID);
          return { ...animal, multimedia: multimedia || [] };
        })
      );
    } finally {
      await connection.close();
    }
  }

  static async findById(animalID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Animal WHERE animalID = :animalID`,
        { animalID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows[0];
    } finally {
      await connection.close();
    }
  }

  static async findByIdWithDetails(animalID) {
    const connection = await getConnection();
    try {
      // 1. Get animal info
      const animalResult = await connection.execute(
        `SELECT * FROM Animal WHERE animalID = :animalID`,
        { animalID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const animal = animalResult.rows[0];
      if (!animal) return null;

      // 2. Get feeding schedule
      animal.feedingSchedule = await FeedingSchedule.findByAnimalId(animalID);

      // 3. Get medical history
      animal.medicalHistory = await MedicalHistory.findByAnimalId(animalID);

      // 4. Get friends/relations
      animal.friends = await Relations.findFriendsByAnimalId(animalID);

      // 5. Get multimedia (optional: or fetch in frontend)
      animal.multimedia = await this.fetchMultimedia(animalID);

      return animal;
    } finally {
      await connection.close();
    }
  }

  static async findByUserId(userID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Animal WHERE userID = :userID`,
        { userID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async findBySpecies(species) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Animal WHERE species = :species`,
        { species },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async deleteAnimalWithRelatedData(animalID) {
    const connection = await getConnection();
    try {
      try {
        await connection.execute(
          `BEGIN
             pet_adoption_utils.delete_animal_safe(:animalID);
           END;`,
          { animalID },
          { autoCommit: true }
        );
        return true;
      } catch (err) {
        console.error('Error using PL/SQL to delete animal, falling back to individual deletes:', err);
        
        try {
          await Relations.deleteByAnimalId(animalID);
          console.log(`Relations deleted`);
        } catch (err) {
          console.error('Error deleting relations:', err);
        }
        
        try {
          await FeedingSchedule.deleteByAnimalId(animalID);
          console.log(`Feeding schedule deleted`);
        } catch (err) {
          console.error('Error deleting feeding schedule:', err);
        }
        
        try {
          await MedicalHistory.deleteByAnimalId(animalID);
          console.log(`Medical history deleted`);
        } catch (err) {
          console.error('Error deleting medical history:', err);
        }

        const animalResult = await connection.execute(
          `DELETE FROM Animal WHERE animalID = :animalID`,
          { animalID },
          { autoCommit: true } 
        );
        
        return animalResult.rowsAffected > 0;
      }
    } catch (error) {
      console.error('Error in deleteAnimalWithRelatedData:', error);
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error('Error closing connection:', err);
        }
      }
    }
  }

  static async incrementViews(animalID) {
    const connection = await getConnection();
    try {
      await connection.execute(
        `UPDATE Animal SET views = views + 1 WHERE animalID = :animalID`,
        { animalID },
        { autoCommit: true }
      );
    } finally {
      await connection.close();
    }
  }
  
  static async getTopAnimalsByCity(userId) {
    const connection = await getConnection();
    try {
      // 1. Get user's city from user-service
      const { address: userAddress } = await fetchUserAndAddress(userId);
      if (!userAddress || !userAddress.CITY) {
        return [];
      }
      const city = userAddress.CITY;

      // 2. Get all animals (limit for performance)
      const result = await connection.execute(
        `SELECT * FROM ANIMAL ORDER BY VIEWS DESC FETCH FIRST 50 ROWS ONLY`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const animals = result.rows || [];

      // 3. For each animal, fetch owner/address and filter by city
      const animalsWithDetails = [];
      for (const animal of animals) {
        const { user: owner, address } = await fetchUserAndAddress(animal.USERID);
        if (address && address.CITY === city) {
          const multimedia = await this.fetchMultimedia(animal.ANIMALID);
          animalsWithDetails.push({
            ...animal,
            multimedia: multimedia || [],
            owner: owner || null,
            address: address || null
          });
          if (animalsWithDetails.length >= 10) break; // Only top 10
        }
      }
      return animalsWithDetails;
    } catch (err) {
      console.error("getTopAnimalsByCity error:", err);
      return [];
    } finally {
      await connection.close();
    }
  }

  static async getAnimalDetailsForUser(userID) {
    const connection = await getConnection();
    try {
      // Get all animals for the user
      const animals = await this.findByUserId(userID);
      
      if (!animals || animals.length === 0) {
        return [];
      }
      
      // For each animal, fetch related data
      const detailedAnimals = await Promise.all(animals.map(async (animal) => {
        const animalID = animal.ANIMALID;
        
        const feedingSchedule = await FeedingSchedule.findByAnimalId(ananimalID);
        
        const medicalHistory = await MedicalHistory.findByAnimalId(animalID);
        
        const relationsData = await Relations.findByAnimalId(animalID);
        
        return {
          ...animal,
          feedingSchedule: feedingSchedule || [],
          medicalHistory: medicalHistory || [],
          relations: relationsData || []
        };
      }));
      
      return detailedAnimals;
    } finally {
      await connection.close();
    }
  }

  static async animalExists(animalID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `DECLARE
           v_exists BOOLEAN;
         BEGIN
           v_exists := pet_adoption_utils.animal_exists(:animalID);
           :result := CASE WHEN v_exists THEN 1 ELSE 0 END;
         END;`,
        { 
          animalID,
          result: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        }
      );
      
      return result.outBinds.result === 1;
    } catch (error) {
      console.error('Error checking if animal exists:', error);
      const fallbackResult = await connection.execute(
        `SELECT COUNT(*) AS count FROM Animal WHERE animalID = :animalID`,
        { animalID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return fallbackResult.rows[0].COUNT > 0;
    } finally {
      await connection.close();
    }
  }

  static async getPopularBreedsBySpecies(species) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT breed, COUNT(*) as breed_count
         FROM Animal
         WHERE species = :species
         GROUP BY breed
         ORDER BY breed_count DESC`,
        { species },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting popular breeds:', error);
      return [];
    } finally {
      await connection.close();
    }
  }

  static async fetchMultimedia(animalId) {
    return new Promise((resolve) => {
      const options = {
        hostname: process.env.MULTIMEDIA_SERVICE_HOST || 'localhost',
        port: process.env.MULTIMEDIA_SERVICE_PORT || 3004,
        path: `/media/animal/${animalId}`,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (err) {
            resolve([]);
          }
        });
      });

      req.on('error', () => resolve([]));
      req.end();
    });
  }
}

module.exports = Animal;