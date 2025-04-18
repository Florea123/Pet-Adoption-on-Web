import userModel from '../models/User.js';
import { requireAuth } from '../utils/authUtils.js';

const API_URL = 'http://localhost:3000';
const token = localStorage.getItem('Token');

//const user = userModel.getUser();
let user;
let userAnimals = [];

async function initialize() {

    // Check if user is authenticated before loading page content
    user = requireAuth();
    if (!user) return; 
    
    displayUserInfo();
    await fetchUserAnimals();
  }
  

// Function to fetch animals belonging to the current user
async function fetchUserAnimals() {
    try {
        // Use the findByUserId endpoint to fetch all animals for the user
        const response = await fetch(`${API_URL}/animals/all`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
        if (!response.ok) {
            throw new Error('Failed to fetch animals');
        }
        const allAnimals = await response.json();
        
        // Filter to only show animals belonging to the current user
        userAnimals = allAnimals.filter(animal => animal.USERID === user.id);
        
        displayUserAnimals(userAnimals);
    } catch (error) {
        console.error('Error fetching user animals:', error);
        document.getElementById('my-animals-container').innerHTML = 
            '<div class="error-message">Failed to load your animals. Please try again later.</div>';
    }
}

// Function to display the user's animals
function displayUserAnimals(animals) {
    const container = document.getElementById('my-animals-container');
    container.innerHTML = '';

    if (animals.length === 0) {
        container.innerHTML = `
            <div class="no-animals">
                <h3>You don't have any animals yet</h3>
                <p>Your published animals will appear here.</p>
                <a href="../Publish/Publish.html" class="btn">Publish Animal</a>
            </div>
        `;
        return;
    }

    animals.forEach((animal) => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Check for piped media URL first, then fallbacks
        let imageSource = 'https://via.placeholder.com/300x200?text=No+Image';
        
        if (animal.multimedia && animal.multimedia.length > 0) {
            const media = animal.multimedia[0];
            if (media.pipeUrl) {
                // Use the media pipe URL
                imageSource = `${API_URL}${media.pipeUrl}`;
            } else if (media.fileData && media.mimeType) {
                // Fallback to base64 if available
                imageSource = `data:${media.mimeType};base64,${media.fileData}`;
            } else if (media.URL) {
                // Last resort: direct URL
                imageSource = media.URL;
            }
        }
        
        card.innerHTML = `
            <img src="${imageSource}" alt="${animal.NAME}">
            <div class="card-content">
                <h2>${animal.NAME}</h2>
                <p>Breed: ${animal.BREED}</p>
                <p>Species: ${animal.SPECIES}</p>
                <p>Age: ${animal.AGE}</p>
                <p>Gender: ${animal.GENDER === 'male' ? 'Male' : 'Female'}</p>
                <button class="delete-btn" data-animal-id="${animal.ANIMALID}">Delete Animal</button>
            </div>
        `;

        container.appendChild(card);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', handleDeleteAnimal);
    });
}

// Function to handle animal deletion
async function handleDeleteAnimal(event) {
    const animalId = event.target.dataset.animalId;
    
    if (!confirm('Are you sure you want to delete this animal?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/animals/delete`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
             },
            body: JSON.stringify({ animalId: parseInt(animalId) })
        });

        if (response.ok) {
            // Remove the deleted animal from the UI
            userAnimals = userAnimals.filter(animal => animal.ANIMALID !== parseInt(animalId));
            displayUserAnimals(userAnimals);
            alert('Animal deleted successfully');
        } else {
            const error = await response.json();
            alert(`Error: ${error.error || 'Failed to delete animal'}`);
        }
    } catch (error) {
        console.error('Error deleting animal:', error);
        alert('An error occurred while deleting the animal');
    }
}

// Generate a random color for the profile circle
function getRandomColor() {
    const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
        '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Display user information in the sidebar
function displayUserInfo() {
    const userInfoContainer = document.getElementById('user-info');
    
    if (user && user.firstName && user.email) {
        const firstInitial = user.firstName.charAt(0).toUpperCase();
        const fullName = `${user.firstName} ${user.lastName}`;
        const profileColor = getRandomColor();
        
        userInfoContainer.innerHTML = `
            <div class="user-info-container">
                <div class="user-profile">
                    <div class="profile-info">
                        <div class="profile-circle" style="background-color: ${profileColor}">
                            ${firstInitial}
                        </div>
                        <div>
                            <div class="user-name">${fullName}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                    <button id="disconnect-btn" class="disconnect-btn" title="Disconnect">D</button>
                </div>
            </div>
        `;
        
        
        document.getElementById('disconnect-btn').addEventListener('click', disconnectUser);
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
function disconnectUser() {
    userModel.clearUser();
    localStorage.removeItem('Token');
    window.location.href = '../Auth/SignIn.html';
}

// Initialize the page
initialize();