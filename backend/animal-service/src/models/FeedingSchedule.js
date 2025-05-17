const { getConnection } = require('../../db');
const oracledb = require('oracledb'); 

class FeedingSchedule {
  static async create(animalID, feeding_times, food_type, notes) {
    const connection = await getConnection();
    try {
      if (!Array.isArray(feeding_times)) {
        throw new Error('feeding_times must be an array of time strings');
      }
      
      // Ensure each time is properly formatted 
      const validatedTimes = feeding_times.map(time => {
        // If time doesn't match HH:MM format, try to parse and format it
        if (!/^\d{2}:\d{2}$/.test(time)) {
          try {
            const parts = time.split(':');
            const hours = parts[0].padStart(2, '0');
            const minutes = parts[1].padStart(2, '0');
            return `${hours}:${minutes}`;
          } catch (e) {
            console.warn(`Invalid time format: ${time}, using as-is`);
            return time;
          }
        }
        return time;
      });
      
      // Create the Oracle array constructor syntax with proper timestamps
      const feedingTimeSQL = `feeding_time_array(${
        validatedTimes.map(time => `'${time}'`).join(',')
      })`;
      
      const result = await connection.execute(
        `INSERT INTO FeedingSchedule (animalID, feeding_time, food_type, notes) 
         VALUES (:animalID, ${feedingTimeSQL}, :food_type, :notes)`,
        { animalID, food_type, notes },
        { autoCommit: true }
      );
      return result;
    } catch (error) {
      console.error('Error creating feeding schedule:', error);
      throw error;
    } finally {
      await connection.close();
    }
  }

  static async findByAnimalId(animalID) {
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

  static async deleteByAnimalId(animalID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `DELETE FROM FeedingSchedule WHERE animalID = :animalID`,
        { animalID },
        { autoCommit: true }
      );
      return result.rowsAffected > 0;
    } finally {
      await connection.close();
    }
  }
}

module.exports = FeedingSchedule;