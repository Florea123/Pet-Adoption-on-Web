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
            localStorage.removeItem('adminToken');
            window.location.href = 'Admin.html';
        });
        
        // Load dashboard data
        loadDashboardData();
        
    } catch (error) {
        console.error('Error decoding token:', error);
        localStorage.removeItem('adminToken');
        window.location.href = 'Admin.html';
    }
});

// Function to load dashboard data
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('adminToken');
 
        // mock data for 
        document.getElementById('totalUsers').textContent = '152';
        document.getElementById('totalPets').textContent = '47';
        document.getElementById('totalAdoptions').textContent = '28';
        document.getElementById('totalDonations').textContent = '$5,230';
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}