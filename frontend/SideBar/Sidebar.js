import userModel from '../models/User.js';
import { requireAuth } from '../utils/authUtils.js';

export default class Sidebar {
  constructor(activePage) {
    this.activePage = activePage; 
    this.user = requireAuth();
    this.unreadCount = 0;
    this.isMobile = window.innerWidth < 768;
    
    window.sidebarInstance = this;
    
    if (!this.user) return;
    
    this.initialize();
    
    // Listen for viewport changes
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;
      
      if (wasMobile !== this.isMobile) {
        console.log("Viewport changed to:", this.isMobile ? "mobile" : "desktop");
        this.updateNavigation();
      }
    });
    
    if (!this.isMobile) {
      this.enforceSidebarBehavior();
    }
  }
  
  enforceSidebarBehavior() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.style.position = 'fixed';
      sidebar.style.top = '0';
      sidebar.style.left = '0';
      sidebar.style.bottom = '0';
      sidebar.style.height = '100%';
      sidebar.style.overflowY = 'hidden';
      sidebar.style.zIndex = '1001';
      
      const sidebarContent = document.querySelector('.sidebar-content');
      if (sidebarContent) {
        sidebarContent.style.overflowY = 'auto';
        sidebarContent.style.maxHeight = 'calc(100vh - 290px)';
      }
      
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
      
      // Make main content scrollable
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.style.overflowY = 'auto';
        mainContent.style.height = '100vh';
      }
    }
  }
  
  async initialize() {
    this.displayUserInfo();
    this.updateNavigation();

    if (this.user) {
      await this.fetchUnreadMessageCount();
      
      // Set up polling for unread messages every 30 seconds
      this.unreadMessagesInterval = setInterval(() => {
        this.fetchUnreadMessageCount();
      }, 30000);
    }
  }
  
  // Update navigation based on viewport
  updateNavigation() {
    const sidebarContainer = document.getElementById('sidebar-container');
    
    sidebarContainer.innerHTML = Sidebar.render(this.activePage);
    
    if (this.isMobile) {
      const appContainer = sidebarContainer.closest('.app-container');
      const sidebar = sidebarContainer.querySelector('.sidebar');
      
      if (sidebar) {
        sidebar.innerHTML = '';
        
        // Create mobile navigation
        const mobileNav = document.createElement('div');
        mobileNav.className = 'mobile-nav';
        
        // Navigation items with circular icons
        const navItems = [
          { id: 'home', initial: 'H', title: 'Home', path: '../Home/Home.html', color: '#3b82f6' },
          { id: 'publish', initial: 'P', title: 'Publish', path: '../Publish/Publish.html', color: '#f59e0b' },
          { id: 'my-animals', initial: 'M', title: 'My Animals', path: '../User_Animals/User_Animals.html', color: '#10b981' },
          { id: 'messages', initial: 'M', title: 'Messages', path: '../Messages/Messages.html', color: '#ef4444' },
          { id: 'newsletter', initial: 'N', title: 'Newsletter', path: '../Newsletter/Newsletter.html', color: '#6366f1' },
          { id: 'popular', initial: 'P', title: 'Popular', path: '../Popular/Popular.html', color: '#8b5cf6' }
        ];
        
        navItems.forEach(item => {
          const navItem = document.createElement('a');
          navItem.href = item.path;
          navItem.className = `mobile-nav-item${item.id === this.activePage ? ' active' : ''}`;
          navItem.setAttribute('aria-label', item.title);
          
          // Circular icon with initial
          const circle = document.createElement('div');
          circle.className = 'profile-circle';
          circle.style.backgroundColor = item.color;
          circle.textContent = item.initial;
          
          // Add badge for messages if needed
          if (item.id === 'messages' && this.unreadCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'mobile-badge';
            badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            circle.appendChild(badge);
          }
          
          navItem.appendChild(circle);
          
          // Label below the icon
          const label = document.createElement('span');
          label.textContent = item.title;
          label.style.fontSize = '0.7rem';
          label.style.marginTop = '2px';
          navItem.appendChild(label);
          mobileNav.appendChild(navItem);
        });
        
        sidebar.appendChild(mobileNav);
        
        // If sidebarContainer is inside appContainer, move sidebar to body
        if (appContainer) {
          const placeholder = document.createElement('div');
          placeholder.style.display = 'none';
          sidebarContainer.appendChild(placeholder);
          
          // Move the sidebar to the body
          document.body.appendChild(sidebar);
          
          // Store reference to restore on desktop
          sidebarContainer._mobileSidebar = sidebar;
        }
        
        // Adjust main content for mobile
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
          mainContent.style.margin = '0';
          mainContent.style.width = '100%';
          mainContent.style.paddingBottom = '70px';
        }
      }
    } else {
      // On desktop, ensure sidebar is back in its container
      const mobileSidebar = sidebarContainer._mobileSidebar;
      if (mobileSidebar && document.body.contains(mobileSidebar)) {
        sidebarContainer.appendChild(mobileSidebar);
        sidebarContainer._mobileSidebar = null;
      }
      
      // Display user info for desktop
      this.displayUserInfo();
      
      this.enforceSidebarBehavior();
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
          <button id="newsletter-btn" class="btn ${activePage === 'newsletter' ? 'active' : ''}"
                  onclick="location.href='../Newsletter/Newsletter.html'">Newsletter</button>
          <button id="popular-btn" class="btn ${activePage === 'popular' ? 'active' : ''}"
                  onclick="location.href='../Popular/Popular.html'">Popular</button>
        </div>
        <div class="sidebar-content">
          ${activePage === 'home' ? `
          <div class="filter-section">
            <h2>Filter by Species</h2>
            <div id="sidebar-species-filters" class="filter-options">
              <div class="loader">Loading species...</div>
            </div>
          </div>` : ''}
        </div>
        <div class="user-section">
          <div id="user-info">
            <div class="loader">Loading user info...</div>
          </div>
        </div>
      </aside>
    `;
  }
}