const { getConnection } = require('../db');
const oracledb = require('oracledb');
const http = require('http');
const https = require('https');

const mediaCache = new Map();
const MEDIA_CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

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
      return result.rows;
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
      
      await this.callService('multimedia-service', `/api/multimedia/animal/${animalID}`, 'DELETE');
      
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
        
        // Delete from Relations 
        try {
          await connection.execute(
            `DELETE FROM Relations WHERE animalID = :animalID`,
            { animalID },
            { autoCommit: true }
          );
          console.log(`Relations deleted`);
        } catch (err) {
          console.error('Error deleting relations:', err);
        }
        
        // Delete from Feeding Schedule
        try {
          await connection.execute(
            `DELETE FROM FeedingSchedule WHERE animalID = :animalID`,
            { animalID },
            { autoCommit: true }
          );
          console.log(`Feeding schedule deleted`);
        } catch (err) {
          console.error('Error deleting feeding schedule:', err);
        }
        
        // Delete from Medical History
        try {
          await connection.execute(
            `DELETE FROM MedicalHistory WHERE animalID = :animalID`,
            { animalID },
            { autoCommit: true }
          );
          console.log(`Medical history deleted`);
        } catch (err) {
          console.error('Error deleting medical history:', err);
        }

        // Delete the animal record
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
        `UPDATE Animal SET views = NVL(views, 0) + 1 WHERE animalID = :animalID`,
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
      // Get the user's city
      const usersResponse = await this.callService('user-service', '/users/all/details');
      
      // Find the specific user in the response
      const userDetails = usersResponse.find(user => user.USERID === parseInt(userId));
      if (!userDetails || !userDetails.address || !userDetails.address.CITY) {
        return [];
      }
      
      const city = userDetails.address.CITY;
      
      // Get animals in same city
      const result = await connection.execute(
        `SELECT a.* 
         FROM ANIMAL a
         WHERE a.ANIMALID IN (
           SELECT ua.ANIMALID 
           FROM ANIMAL ua 
           JOIN USERS u ON ua.USERID = u.USERID 
           JOIN ADDRESS ad ON u.USERID = ad.USERID 
           WHERE ad.CITY = :city
         )
         ORDER BY a.VIEWS DESC, a.CREATEDAT DESC`,
        { city },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      // Add multimedia data to each animal using multimedia service 
      const animalsWithMedia = await Promise.all(
        result.rows.map(async (animal) => {
          try {
            const multimedia = await this.callService('multimedia-service', `/media/pipe/${animal.ANIMALID}`);
            return { ...animal, multimedia };
          } catch (error) {
            console.error(`Error fetching multimedia for animal ${animal.ANIMALID}:`, error);
            return { ...animal, multimedia: [] };
          }
        })
      );
      
      return animalsWithMedia;
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
        
        // Get multimedia data 
        let multimedia = [];
        try {
          multimedia = await this.callService('multimedia-service', `/media/pipe/${animalID}`);
        } catch (error) {
          console.warn(`Could not fetch multimedia for animal ${animalID}:`, error.message);
        }
        
        // Get other data from this service
        const [feedingSchedule, medicalHistory, relations] = await Promise.all([
          this.getFeeding(animalID),
          this.getMedical(animalID),
          this.getRelations(animalID)
        ]);
        
        return {
          ...animal,
          multimedia: multimedia || [],
          feedingSchedule: feedingSchedule || [],
          medicalHistory: medicalHistory || [],
          relations: relations || []
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
        `SELECT COUNT(*) as count FROM Animal WHERE animalID = :animalID`,
        { animalID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows[0].COUNT > 0;
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

  // Helper methods for microservice communication
  static async callService(serviceName, endpoint, method = 'GET', body = null, headers = {}) {
    try {
      // Check cache for media pipe requests
      const cacheKey = `${serviceName}:${endpoint}:${method}`;
      
      // Only use cache for GET requests to the multimedia service
      if (method === 'GET' && serviceName === 'multimedia-service' && endpoint.includes('/media/pipe/')) {
        if (mediaCache.has(cacheKey)) {
          const cacheEntry = mediaCache.get(cacheKey);
          // Check if cache is still valid
          if (Date.now() - cacheEntry.timestamp < MEDIA_CACHE_TTL) {
            console.log(`[CACHE HIT] Using cached data for ${cacheKey}`);
            return cacheEntry.data;
          } else {
            console.log(`[CACHE EXPIRED] Cache expired for ${cacheKey}`);
            mediaCache.delete(cacheKey);
          }
        }
      }

      const serviceConfig = {
        'user-service': process.env.USER_SERVICE_URL || 'http://localhost:3000',
        'multimedia-service': process.env.MULTIMEDIA_SERVICE_URL || 'http://localhost:3002', 
        'newsletter-service': process.env.NEWSLETTER_SERVICE_URL || 'http://localhost:3004'
      };

      // Map the modern API endpoints to old server endpoints
      if (serviceName === 'user-service') {
        // Handle user service specific path transformations
        if (endpoint.startsWith('/api/users/')) {
          const parts = endpoint.split('/');
          const userId = parts[3];
          
          // Check if it's an address request
          if (endpoint.includes('/address')) {
            endpoint = '/users/all/details';
          } else {
           
            endpoint = '/users/all/details';
          }
        } else if (endpoint.startsWith('/address/')) {
         
          endpoint = '/users/all/details';
        }
      } else if (serviceName === 'multimedia-service') {
        
        if (endpoint.startsWith('/api/multimedia/animal/')) {
          const parts = endpoint.split('/');
          const animalId = parts[4];
          
          if (parts.length > 5 && parts[5] === 'one') {
            // For single photo
            endpoint = `/media/pipe/${animalId}`;
          } else {
            // For all animal multimedia
            endpoint = `/media/pipe/${animalId}`;
          }
        }
      }

      const serviceBaseUrl = serviceConfig[serviceName];
      if (!serviceBaseUrl) {
        throw new Error(`Unknown service: ${serviceName}`);
      }

      const url = `${serviceBaseUrl}${endpoint}`;
      console.log(`Calling service ${serviceName}: ${method} ${url}`);

      // Include standard headers for microservice communication
      const requestHeaders = {
        'Content-Type': 'application/json',
        'X-Service-Name': 'animal-service',
        'X-Internal-Request': 'true',
        ...headers
      };

      const options = {
        method,
        headers: requestHeaders
      };

      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        const responseText = await response.text();
        let errorMessage = 'Unknown error';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || 'Unknown error';
        } catch (e) {
          errorMessage = responseText || 'Unknown error';
        }
        throw new Error(`Request failed with status code ${response.status}: ${errorMessage}`);
      }
      
      // For empty responses
      if (response.status === 204) {
        return null;
      }

    
      let result;
      if (endpoint.includes('/media/pipe/')) {
        result = [{
          ID: endpoint.split('/').pop(),
          pipeUrl: endpoint
        }];
        
        // Cache media results
        if (method === 'GET') {
          mediaCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
          console.log(`[CACHE STORE] Cached result for ${cacheKey}`);
        }
        
        return result;
      }
      
      const jsonResponse = await response.json();
      
      // Process response for transformed endpoints
      if (endpoint === '/users/all/details' && serviceName === 'user-service') {
        // Extract information for specific user 
        if (body && body.userId) {
          const userId = body.userId;
          const userDetails = jsonResponse.find(user => user.USERID === parseInt(userId));
          
          if (userDetails) {
            // If this was an address request
            if (options.addressRequest) {
              return userDetails.address || {};
            }
            // Otherwise return full user
            return userDetails;
          }
          return {};
        }
      }
      
      // Cache the result for media-related endpoints
      if (method === 'GET' && 
          serviceName === 'multimedia-service' && 
          endpoint.includes('/media/pipe/')) {
        mediaCache.set(cacheKey, {
          data: jsonResponse,
          timestamp: Date.now()
        });
        console.log(`[CACHE STORE] Cached result for ${cacheKey}`);
      }
      
      return jsonResponse;
    } catch (error) {
      console.error(`Error calling ${serviceName} service:`, error);
      throw error;
    }
  }


  static async getFeeding(animalID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM FeedingSchedule WHERE animalID = :animalID`,
        { animalID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async getMedical(animalID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM MedicalHistory WHERE animalID = :animalID`,
        { animalID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async getRelations(animalID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Relations WHERE animalID = :animalID`,
        { animalID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }
}

module.exports = Animal;