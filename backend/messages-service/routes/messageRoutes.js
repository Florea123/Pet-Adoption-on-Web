const Message = require("../models/Message");

async function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    
    req.on("end", () => {
      try {
        if (body) {
          resolve(JSON.parse(body));
        } else {
          resolve({});
        }
      } catch (error) {
        reject(error);
      }
    });
    
    req.on("error", (error) => {
      reject(error);
    });
  });
}

async function sendMessage(req, res) {
  try {
    const data = await parseRequestBody(req);
    const { senderId, receiverId, content } = data;
    
    if (!senderId || !receiverId || !content) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing required fields" }));
      return;
    }

    const message = await Message.create(senderId, receiverId, content);
    
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(message));
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

async function getConversation(req, res) {
  try {
    const data = await parseRequestBody(req);
    const { userId1, userId2 } = data;
    
    if (!userId1 || !userId2) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Both user IDs are required" }));
      return;
    }

    const messages = await Message.getConversation(userId1, userId2);
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(messages));
  } catch (error) {
    console.error("Error in getConversation:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

async function getConversations(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = parseInt(url.searchParams.get('userId'));
    
    if (!userId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "User ID is required" }));
      return;
    }

    const conversations = await Message.getUserConversations(userId);
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(conversations));
  } catch (error) {
    console.error("Error in getConversations:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

async function markMessagesAsRead(req, res) {
  try {
    const data = await parseRequestBody(req);
    const { senderId, receiverId } = data;
    
    if (!senderId || !receiverId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Both sender and receiver IDs are required" }));
      return;
    }

    const updatedCount = await Message.markAsRead(senderId, receiverId);
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, updatedCount }));
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

async function getUnreadCount(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = parseInt(url.searchParams.get('userId'));
    
    if (!userId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "User ID is required" }));
      return;
    }

    const count = await Message.getUnreadCount(userId);
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ count }));
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

module.exports = {
  sendMessage,
  getConversation,
  getConversations,
  markMessagesAsRead,
  getUnreadCount
};