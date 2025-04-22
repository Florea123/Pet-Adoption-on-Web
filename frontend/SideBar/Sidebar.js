import userModel from '../models/User.js';
import { requireAuth } from '../utils/authUtils.js';

export default class Sidebar {
  constructor(activePage) {
    this.activePage = activePage; 
    this.user = requireAuth();
    
  
    if (!this.user) return;
    
    this.initialize();
  }
  
  initialize() {
    this.displayUserInfo();
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
          <button id="publish-btn" class="btn ${activePage === 'publish' ? 'active' : ''}" 
                  onclick="location.href='../Publish/Publish.html'">Publish</button>
          <button id="my-animals-btn" class="btn ${activePage === 'userAnimals' ? 'active' : ''}" 
                  onclick="location.href='../User_Animals/User_Animals.html'">My Animals</button>
          <button id="messages-btn" class="btn ${activePage === 'messages' ? 'active' : ''}" 
                  onclick="location.href='../Messages/Messages.html'">Messages</button>
          <button id="home-btn" class="btn ${activePage === 'home' ? 'active' : ''}" 
                  onclick="location.href='../Home/Home.html'">Home</button>
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