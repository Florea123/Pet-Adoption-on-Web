import userModel from '../models/User.js';
import { requireAuth } from '../utils/authUtils.js';
import Sidebar from '../SideBar/Sidebar.js';
import { showLoading, hideLoading } from '../utils/loadingUtils.js';

const API_URL = 'http://localhost:3000';
const token = localStorage.getItem('Token');
let user;
let currentConversationUser = null;
let conversations = [];
let currentMessages = [];
let pollingInterval;

async function initialize() {
  // loading spinner
  const linkElement = document.createElement("link");
  linkElement.rel = "stylesheet";
  linkElement.href = "../utils/loadingUtils.css";
  document.head.appendChild(linkElement);

  user = requireAuth();
  if (!user) return;
  
  // Render sidebar
  document.getElementById('sidebar-container').innerHTML = Sidebar.render('messages');
  new Sidebar('messages');
  
  document.getElementById('send-message-form').addEventListener('submit', handleSendMessage);
  
  initializeMobileView();
  
  setupMobileNavigation();
  
  await loadConversations(true);
  
  // Set up polling for new messages (every 30 seconds)
  pollingInterval = setInterval(async () => {
    if (currentConversationUser) {
      await loadConversation(currentConversationUser.userId, false);
    }
    await loadConversations(false);
  }, 30000); 
  
  window.addEventListener('beforeunload', () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  });
}

// Initialize mobile view state
function initializeMobileView() {
  const isMobile = window.innerWidth <= 768;
  const conversationsList = document.querySelector('.conversations-list');
  const messagesContainer = document.querySelector('.messages-container');
  
  if (isMobile) {
    conversationsList.classList.add('active');
    messagesContainer.classList.remove('active');
    

    conversationsList.style.transform = 'translateX(0)';
    messagesContainer.style.transform = 'translateX(100%)';
  } else {
  
    messagesContainer.classList.add('active');
  }
}

async function loadConversations(showLoader = true) {
  try {
    if (showLoader) {
      showLoading('Loading conversations...');
    }
    
    const response = await fetch(`${API_URL}/messages/conversations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load conversations');
    }
    
    conversations = await response.json();
    displayConversations(conversations);
  } catch (error) {
    console.error('Error loading conversations:', error);

    if (showLoader) {
      document.getElementById('conversation-list').innerHTML = 
        '<div class="error-message">Failed to load conversations</div>';
    }
  } finally {
    if (showLoader) {
      hideLoading();
    }
  }
}

function displayConversations(conversations) {
  const container = document.getElementById('conversation-list');
  
  if (conversations.length === 0) {
    container.innerHTML = `<div class="empty-state">No conversations yet</div>`;
    return;
  }
  
  container.innerHTML = conversations.map(conv => `
    <div class="conversation-item ${conv.unreadCount > 0 ? 'unread' : ''} ${currentConversationUser && currentConversationUser.userId === conv.OTHERUSERID ? 'selected' : ''}" data-user-id="${conv.OTHERUSERID}">
      <div class="conversation-avatar">${getInitials(conv.OTHERUSERNAME)}</div>
      <div class="conversation-info">
        <div class="conversation-name">${conv.OTHERUSERNAME}</div>
        <div class="conversation-preview">
          <span class="last-message-preview">${conv.LASTMESSAGECONTENT ? truncateMessage(conv.LASTMESSAGECONTENT) : ''}</span>
          <span class="last-message-time">${formatTimestamp(conv.LASTMESSAGETIME)}</span>
        </div>
      </div>
      ${conv.unreadCount > 0 ? `<div class="unread-badge">${conv.unreadCount}</div>` : ''}
    </div>
  `).join('');
  
  // Add event listeners to conversation items
  document.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      const userId = parseInt(item.dataset.userId);
      loadConversation(userId);
      
      // Update sidebar unread count after opening a conversation
      if (window.sidebarInstance) {
        setTimeout(() => {
          window.sidebarInstance.fetchUnreadMessageCount();
        }, 500);
      }
    });
  });
}

// Add this helper function to truncate long messages in the preview
function truncateMessage(message) {
  return message.length > 30 ? message.substring(0, 27) + '...' : message;
}

// Add mobile navigation setup
function setupMobileNavigation() {
  const backButton = document.querySelector('.back-button');
  const conversationsList = document.querySelector('.conversations-list');
  const messagesContainer = document.querySelector('.messages-container');
  
  // Make conversations list visible by default on mobile
  if (window.innerWidth <= 768) {
    conversationsList.classList.add('active');
    messagesContainer.classList.remove('active');
  }
  
  backButton.addEventListener('click', (e) => {
    e.preventDefault();
    conversationsList.classList.add('active');
    messagesContainer.classList.remove('active');
  });
  
  document.addEventListener('click', (e) => {
    const conversationItem = e.target.closest('.conversation-item');
    if (conversationItem && window.innerWidth <= 768) {
      conversationsList.classList.remove('active');
      messagesContainer.classList.add('active');
    }
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 768) {
      if (!currentConversationUser) {
        conversationsList.classList.add('active');
        messagesContainer.classList.remove('active');
      }
    } else {
      messagesContainer.classList.add('active');
    }
  });
}

async function loadConversation(otherUserId, showLoader = true) {
  try {
    if (showLoader) {
      showLoading('Loading messages...');
    }
    
    // Mark messages as read when opening conversation
    await fetch(`${API_URL}/messages/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ otherUserId })
    });
    
    // Fetch conversation
    const response = await fetch(`${API_URL}/messages/conversation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ otherUserId })
    });
    
    if (!response.ok) {
      throw new Error('Failed to load conversation');
    }
    
    currentMessages = await response.json();
    
    // Find user details from the messages
    if (currentMessages.length > 0) {
      const message = currentMessages[0];
      if (message.SENDERID === otherUserId) {
        currentConversationUser = {
          userId: otherUserId,
          name: `${message.SENDERFIRSTNAME} ${message.SENDERLASTNAME}`
        };
      } else {
        currentConversationUser = {
          userId: otherUserId,
          name: `${message.RECEIVERFIRSTNAME} ${message.RECEIVERLASTNAME}`
        };
      }
    }
    
    displayMessages(currentMessages, otherUserId);
    
    // Update conversation UI
    document.getElementById('conversation-title').textContent = currentConversationUser ? 
      currentConversationUser.name : 'Messages';
    
    const messagesContainer = document.querySelector('.messages-container');
    const conversationsList = document.querySelector('.conversations-list');
    
    if (window.innerWidth <= 768) {
      conversationsList.classList.remove('active');
      messagesContainer.classList.add('active');
      
      conversationsList.style.transform = 'translateX(-100%)';
      messagesContainer.style.transform = 'translateX(0)';
    } else {
      messagesContainer.classList.add('active');
    }
    
    // Mark the selected conversation in the list
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.toggle('selected', parseInt(item.dataset.userId) === otherUserId);
    });
    
    // Scroll to bottom of messages
    const messagesDiv = document.getElementById('messages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch (error) {
    console.error('Error loading conversation:', error);
    if (showLoader) {
      document.getElementById('messages').innerHTML = 
        '<div class="error-message">Failed to load messages</div>';
    }
  } finally {
    if (showLoader) {
      hideLoading();
    }
  }
}

// Update displayMessages function to ensure message visibility
function displayMessages(messages, otherUserId) {
  const container = document.getElementById('messages');
  
  if (messages.length === 0) {
    container.innerHTML = `<div class="empty-state">No messages yet. Start the conversation!</div>`;
    return;
  }
  
  container.innerHTML = messages.map(msg => {
    const isSentByMe = msg.SENDERID === user.id;
    
    const readStatus = isSentByMe ? `
      <span class="read-status ${msg.ISREAD ? 'read' : 'delivered'}">
        <span class="checkmark">✓</span><span class="checkmark">✓</span>
      </span>
    ` : '';
    
    return `
      <div class="message ${isSentByMe ? 'sent' : 'received'}">
        <div class="message-content">
          ${msg.CONTENT}
          <span class="message-time">
            ${formatTimestamp(msg.TIMESTAMP)} ${readStatus}
          </span>
        </div>
      </div>
    `;
  }).join('');
  
  setTimeout(() => {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, 100);
}

async function handleSendMessage(event) {
  event.preventDefault();
  
  if (!currentConversationUser) {
    alert('Please select a conversation first');
    return;
  }
  
  const messageInput = document.getElementById('message-input');
  const content = messageInput.value.trim();
  
  if (!content) {
    return;
  }
  
  try {
    await sendMessage(currentConversationUser.userId, content);
    
    messageInput.value = '';
    
    // Reload conversation to show new message
    await loadConversation(currentConversationUser.userId, true);
    
    await loadConversations(false);
  } catch (error) {
    console.error('Error sending message:', error);
    alert('Failed to send message. Please try again.');
  }
}

async function sendMessage(receiverId, content) {
  try {
    const token = localStorage.getItem('Token');
    
    if (!token) {
      console.error('No authentication token found');
      return false;
    }
    
    const response = await fetch(`${API_URL}/messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        receiverId,
        content
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send message');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// "Contact Owner" button 
export function setupContactButton(ownerId, ownerName) {
  const contactButton = document.querySelector('.contact-button');
  if (contactButton) {
    contactButton.addEventListener('click', () => {
      window.location.href = `../Messages/Messages.html?userId=${ownerId}&name=${encodeURIComponent(ownerName)}`;
    });
  }
}

// Helper functions
function getInitials(name) {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // Today - show time
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    // Yesterday
    return 'Yesterday';
  } else if (diffDays < 7) {
    // This week - show day name
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    // Older - show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

// Check URL for direct conversation opening
function checkUrlForDirectMessage() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('userId');
  const name = urlParams.get('name');
  
  if (userId) {
    currentConversationUser = {
      userId: parseInt(userId),
      name: name || 'User'
    };
    loadConversation(parseInt(userId));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initialize();
  
  // Check for direct message parameter in URL
  setTimeout(checkUrlForDirectMessage, 500);
});