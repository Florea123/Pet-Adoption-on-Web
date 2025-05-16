const { getConnection } = require('../../db');
const oracledb = require('oracledb');

class Message {

  static async create(senderId, receiverId, content) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `INSERT INTO Messages (senderId, receiverId, content) 
         VALUES (:senderId, :receiverId, :content)
         RETURNING messageId INTO :messageId`,
        { 
          senderId, 
          receiverId: parseInt(receiverId), 
          content,
          messageId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true }
      );
      return result.outBinds.messageId[0];
    } finally {
      await connection.close();
    }
  }

  static async getConversation(userId, otherUserId) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Messages
         WHERE (senderId = :userId AND receiverId = :otherUserId)
         OR (senderId = :otherUserId AND receiverId = :userId)
         ORDER BY timestamp ASC`,
        { 
          userId, 
          otherUserId: parseInt(otherUserId)
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  // Returns a list of conversation partners (otherUserId), last message time, and unread count
  static async getConversations(userId) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT 
          CASE WHEN senderId = :userId THEN receiverId ELSE senderId END AS OTHERUSERID,
          MAX(timestamp) AS LASTMESSAGETIME,
          SUM(CASE WHEN senderId = CASE WHEN senderId = :userId THEN receiverId ELSE senderId END AND receiverId = :userId AND isRead = 0 THEN 1 ELSE 0 END) AS UNREADCOUNT
         FROM Messages
         WHERE senderId = :userId OR receiverId = :userId
         GROUP BY CASE WHEN senderId = :userId THEN receiverId ELSE senderId END
         ORDER BY LASTMESSAGETIME DESC`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async markAsRead(receiverId, senderId) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `UPDATE Messages 
         SET isRead = 1
         WHERE senderId = :senderId AND receiverId = :receiverId AND isRead = 0`,
        { 
          receiverId, 
          senderId: parseInt(senderId)
        },
        { autoCommit: true }
      );
      return result.rowsAffected;
    } finally {
      await connection.close();
    }
  }

  static async countUnreadMessages(userId) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT COUNT(*) as count
         FROM Messages
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