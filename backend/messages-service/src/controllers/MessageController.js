const Message = require('../models/Message');

exports.sendMessage = async (req, res) => {
  try {

    const { senderId, receiverId, content } = req.body;

    if (!senderId || !receiverId || !content) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing required fields' }));
      return;
    }

    console.log('Sending message with:', { senderId, receiverId, content });
    
    const messageId = await Message.create(senderId, receiverId, content);
    
    res.statusCode = 201;
    res.end(JSON.stringify({ 
      message: 'Message sent successfully',
      messageId 
    }));
  } catch (err) {
    console.error('Error sending message:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { userId, otherUserId } = req.body || req.query;

    if (!userId || !otherUserId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing user IDs' }));
      return;
    }

    const messages = await Message.getConversation(userId, otherUserId);
    
    res.statusCode = 200;
    res.end(JSON.stringify(messages));
  } catch (err) {
    console.error('Error retrieving conversation:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};

exports.getConversations = async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing user ID' }));
      return;
    }
    
    const conversations = await Message.getConversations(userId);
    
    res.statusCode = 200;
    res.end(JSON.stringify(conversations));
  } catch (err) {
    console.error('Error retrieving conversations:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};

exports.markMessagesAsRead = async (req, res) => {
  try {
    const { userId, otherUserId } = req.body;

    if (!userId || !otherUserId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing user IDs' }));
      return;
    }

    await Message.markAsRead(userId, otherUserId);
    
    res.statusCode = 200;
    res.end(JSON.stringify({ message: 'Messages marked as read' }));
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Missing user ID' }));
      return;
    }
    
    const unreadCount = await Message.countUnreadMessages(userId);
    
    res.statusCode = 200;
    res.end(JSON.stringify({ count: unreadCount }));
  } catch (err) {
    console.error('Error retrieving unread message count:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
};