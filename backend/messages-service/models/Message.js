const { getConnection } = require("../db");
const oracledb = require("oracledb");

class Message {
  static async create(senderId, receiverId, content) {
    const connection = await getConnection();
    try {
      const timestamp = new Date();
      
      const result = await connection.execute(
        `INSERT INTO Messages 
         (senderId, receiverId, content, timestamp, isRead) 
         VALUES 
         (:senderId, :receiverId, :content, :timestamp, :isRead)
         RETURNING messageId INTO :messageId`,
        {
          senderId,
          receiverId,
          content,
          timestamp,
          isRead: 0, // Default to unread
          messageId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true }
      );

      return {
        messageId: result.outBinds.messageId[0],
        senderId,
        receiverId,
        content,
        timestamp,
        isRead: 0
      };
    } finally {
      await connection.close();
    }
  }

  static async getConversation(userId1, userId2) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT m.*, 
          u1.firstName as senderFirstName, 
          u1.lastName as senderLastName,
          u2.firstName as receiverFirstName, 
          u2.lastName as receiverLastName
         FROM Messages m
         JOIN Users u1 ON m.senderId = u1.userId
         JOIN Users u2 ON m.receiverId = u2.userId
         WHERE (m.senderId = :userId1 AND m.receiverId = :userId2)
         OR (m.senderId = :userId2 AND m.receiverId = :userId1)
         ORDER BY m.timestamp ASC`,
        {
          userId1,
          userId2
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async getUserConversations(userId) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `WITH LatestMessages AS (
           SELECT 
             CASE 
               WHEN senderId = :userId THEN receiverId 
               ELSE senderId 
             END AS otherUserId,
             MAX(timestamp) as latestTime
           FROM Messages 
           WHERE senderId = :userId OR receiverId = :userId
           GROUP BY 
             CASE 
               WHEN senderId = :userId THEN receiverId 
               ELSE senderId 
             END
         )
         SELECT 
           u.userId, 
           u.firstName, 
           u.lastName, 
           u.email,
           m.messageId,
           m.content,
           m.timestamp,
           m.senderId,
           m.receiverId,
           m.isRead,
           (SELECT COUNT(*) FROM Messages 
            WHERE receiverId = :userId 
            AND senderId = u.userId 
            AND isRead = 0) as unreadCount
         FROM LatestMessages lm
         JOIN Users u ON u.userId = lm.otherUserId
         JOIN Messages m ON (
           (m.senderId = :userId AND m.receiverId = lm.otherUserId) OR
           (m.receiverId = :userId AND m.senderId = lm.otherUserId)
         ) AND m.timestamp = lm.latestTime
         ORDER BY m.timestamp DESC`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async markAsRead(senderId, receiverId) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `UPDATE Messages 
         SET isRead = 1
         WHERE senderId = :senderId AND receiverId = :receiverId AND isRead = 0`,
        {
          senderId,
          receiverId
        },
        { autoCommit: true }
      );
      
      return result.rowsAffected;
    } finally {
      await connection.close();
    }
  }

  static async getUnreadCount(userId) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT COUNT(*) as count FROM Messages 
         WHERE receiverId = :userId AND isRead = 0`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      return result.rows[0].COUNT;
    } finally {
      await connection.close();
    }
  }
}

module.exports = Message;