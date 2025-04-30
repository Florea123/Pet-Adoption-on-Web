import userModel from '../models/User.js';
import { requireAuth } from '../utils/authUtils.js';

export default class Sidebar {
  constructor(activePage) {
    this.activePage = activePage; 
    this.user = requireAuth();
    this.unreadCount = 0;
    
    window.sidebarInstance = this;
    
    if (!this.user) return;
    
    this.initialize();
  }
  
  async initialize() {
    this.displayUserInfo();
    

    if (this.user) {
      await this.fetchUnreadMessageCount();
      
      // Set up polling for unread messages every 30 seconds
      this.unreadMessagesInterval = setInterval(() => {
        this.fetchUnreadMessageCount();
      }, 30000);
    }
  }
  
  async fetchUnreadMessageCount() {
    try {
      const token = localStorage.getItem('Token');
      if (!token) return;
      
      const response = await fetch('http://localhost:3000/messages/unread-count', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch unread message count');
      }
      
      const data = await response.json();
      this.unreadCount = data.count;
      
      // Update the badge in the DOM
      this.updateUnreadBadge();
    } catch (error) {
      console.error('Error fetching unread message count:', error);
    }
  }
  
  updateUnreadBadge() {
    const badge = document.getElementById('messages-badge');
    if (badge) {
      if (this.unreadCount > 0) {
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }
  
  getRandomColor() {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
      '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  // Display user information in the sidebar
  displayUserInfo() {
    const userInfoContainer = document.getElementById('user-info');
    
    if (this.user && this.user.firstName && this.user.email) {
      const firstInitial = this.user.firstName.charAt(0).toUpperCase();
      const fullName = `${this.user.firstName} ${this.user.lastName || ''}`;
      const profileColor = this.getRandomColor();
      
      userInfoContainer.innerHTML = `
        <div class="user-info-container">
          <div class="user-profile">
            <div class="profile-info">
              <div class="profile-circle" style="background-color: ${profileColor}">
                ${firstInitial}
              </div>
              <div>
                <div class="user-name">${fullName}</div>
                <div class="user-email">${this.user.email}</div>
              </div>
            </div>
            <button id="disconnect-btn" class="disconnect-btn" title="Disconnect">D</button>
          </div>
        </div>
      `;
      
      // disconnect 
      document.getElementById('disconnect-btn').addEventListener('click', this.disconnectUser);
    } else {
      userInfoContainer.innerHTML = `
        <div class="user-info-container">
          <p>Not logged in</p>
          <a href="../Auth/SignIn.html" class="btn">Sign In</a>
        </div>
      `;
    }
  }
  
  // Handle user disconnect
  disconnectUser() {
    // Clear intervals before disconnecting
    if (window.sidebarInstance && window.sidebarInstance.unreadMessagesInterval) {
      clearInterval(window.sidebarInstance.unreadMessagesInterval);
    }
    
    userModel.clearUser();
    localStorage.removeItem('Token');
    window.location.href = '../Auth/SignIn.html';
  }
  
  // Render sidebar
  static render(activePage) {
    return `
      <aside class="sidebar">
        <div class="sidebar-header">
          <h1>Pet Adoption</h1>
          <button id="home-btn" class="btn ${activePage === 'home' ? 'active' : ''}" 
                  onclick="location.href='../Home/Home.html'">Home</button>
          <button id="publish-btn" class="btn ${activePage === 'publish' ? 'active' : ''}" 
                  onclick="location.href='../Publish/Publish.html'">Publish</button>
          <button id="my-animals-btn" class="btn ${activePage === 'userAnimals' ? 'active' : ''}" 
                  onclick="location.href='../User_Animals/User_Animals.html'">My Animals</button>
          <div class="btn-container">
            <button id="messages-btn" class="btn ${activePage === 'messages' ? 'active' : ''}" 
                    onclick="location.href='../Messages/Messages.html'">Messages</button>
            <span id="messages-badge" class="messages-badge">0</span>
          </div>
                <button id="popular-btn" class="btn ${activePage === 'popular' ? 'active' : ''}"
                     onclick="location.href='../Popular/Popular.html'">Popular</button>
        </div>
        ${activePage === 'home' ? `
        <div class="filter-section">
          <h2>Filter by Species</h2>
          <div id="species-filters" class="filter-options">
            <div class="loader">Loading species...</div>
          </div>
        </div>` : ''}
        <div class="user-section">
          <div id="user-info">
            <div class="loader">Loading user info...</div>
          </div>
        </div>
      </aside>
    `;
  }
}