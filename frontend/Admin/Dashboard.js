document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'Admin.html';
        return;
    }
    
    try {
        // Decode token to get admin info
        const decodedToken = jwt_decode(token);
        
        // Check if token is for admin
        if (!decodedToken.isAdmin) {
            console.error('Token does not contain admin privileges');
            localStorage.removeItem('adminToken');
            window.location.href = 'Admin.html';
            return;
        }
        
        // Display admin email
        document.getElementById('adminEmail').textContent = decodedToken.email || 'Admin';
        
        // Navigation between sections
        const navLinks = document.querySelectorAll('.nav-menu a');
        const sections = document.querySelectorAll('.content-section');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all links and sections
                navLinks.forEach(l => l.parentElement.classList.remove('active'));
                sections.forEach(s => s.classList.remove('active'));
                
                // Add active class to current link and section
                this.parentElement.classList.add('active');
                const targetSection = document.getElementById(this.dataset.section);
                if (targetSection) {
                    targetSection.classList.add('active');
                }
            });
        });
        
        // Handle logout
        document.getElementById('logoutBtn').addEventListener('click', function() {
            // Clear all cache on logout
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminDashboardData');
            localStorage.removeItem('adminDashboardLastFetch');
            window.location.href = 'Admin.html';
        });
        
        // Load dashboard data with caching
        loadDashboardDataWithCache();
        
    } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminDashboardData');
        localStorage.removeItem('adminDashboardLastFetch');
        window.location.href = 'Admin.html';
    }
});

// Function to load dashboard data with caching
async function loadDashboardDataWithCache(forceRefresh = false) {
    try {
        const cacheMaxAge = 5 * 60 * 1000; // 5 minutes cache lifetime
        const now = new Date().getTime();
        const lastFetch = localStorage.getItem('adminDashboardLastFetch');
        const cachedData = localStorage.getItem('adminDashboardData');
        
        // Use cache if available and not expired, and not forcing refresh
        if (!forceRefresh && cachedData && lastFetch && (now - parseInt(lastFetch) < cacheMaxAge)) {
            console.log('Using cached dashboard data');
            const dashboardData = JSON.parse(cachedData);
            updateDashboardUI(dashboardData);
            return;
        }
        
        // If cache is expired or not available or forcing refresh, fetch new data
        console.log('Fetching fresh dashboard data');
        
        const token = localStorage.getItem('adminToken');
        if (!token) {
            throw new Error('No authentication token');
        }
        
        // Fetch users data from the API
        const response = await fetch('http://localhost:3000/users/all/details', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        
        const usersData = await response.json();
        
        // Process the data to get summary information
        const dashboardData = processApiData(usersData);
        
        // Update the UI
        updateDashboardUI(dashboardData);
        
        // Save to cache
        localStorage.setItem('adminDashboardData', JSON.stringify(dashboardData));
        localStorage.setItem('adminDashboardLastFetch', now.toString());
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        
        // Try to use cached data even if expired as fallback
        const cachedData = localStorage.getItem('adminDashboardData');
        if (cachedData) {
            console.log('Using expired cache as fallback');
            const dashboardData = JSON.parse(cachedData);
            updateDashboardUI(dashboardData);
        } else {
            // Use mock data if no cache is available
            updateDashboardUI({
                totalUsers: 0,
                totalPets: 0,
                users: []
            });
        }
    }
}

// Process API data to get summary information
function processApiData(usersData) {
    let totalUsers = usersData.length;
    let totalPets = 0;
    
    // Calculate total pets and other stats
    usersData.forEach(user => {
        if (user.animals && Array.isArray(user.animals)) {
            totalPets += user.animals.length;
        }
    });
    
    return {
        totalUsers,
        totalPets,
        users: usersData // Store the full user data for detailed views
    };
}

// Update the dashboard UI with the data
function updateDashboardUI(data) {
    // Update statistics
    document.getElementById('totalUsers').textContent = data.totalUsers;
    document.getElementById('totalPets').textContent = data.totalPets;
    
    // If users section is available, populate user table
    const usersSection = document.getElementById('users');
    if (usersSection && data.users) {
        populateUsersTable(data.users, usersSection);
    }
    
    // If pets section is available, could populate pet data similarly
}

// Populate users table with data
function populateUsersTable(users, container) {
    const tableContainer = container.querySelector('.table-container');
    if (!tableContainer) return;
    
    // Create table if it doesn't exist
    let table = tableContainer.querySelector('table');
    if (!table) {
        table = document.createElement('table');
        table.className = 'users-table';
        tableContainer.innerHTML = ''; // Clear any placeholder
        tableContainer.appendChild(table);
    }
    
    // Generate table content
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Created At</th>
                <th>Pets</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${users.map(user => `
                <tr>
                    <td>${user.USERID}</td>
                    <td>${user.FIRSTNAME} ${user.LASTNAME}</td>
                    <td>${user.EMAIL}</td>
                    <td>${user.PHONE || 'N/A'}</td>
                    <td>${formatDate(user.CREATEDAT)}</td>
                    <td>${user.animals ? user.animals.length : 0}</td>
                    <td>
                        <button class="view-btn" data-user-id="${user.USERID}">View</button>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    // Add event listeners to view buttons
    table.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            showUserDetails(users.find(u => u.USERID == userId));
        });
    });
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Show user details in a modal or detail view
function showUserDetails(user) {
    // This function would show detailed user information including pets
    console.log('Showing details for user:', user);
    // Implementation depends on your UI needs
}

// Add a refresh button event handler
document.addEventListener('DOMContentLoaded', function() {
    const refreshButton = document.getElementById('refreshData');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            loadDashboardDataWithCache(true); // Force refresh
        });
    }
});