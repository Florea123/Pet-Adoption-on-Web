import userModel from '../models/User.js';
import { requireAuth } from '../utils/authUtils.js';
import { showAnimalDetailsPopup } from '../AnimalCard/AnimalCard.js'; 

const API_URL = 'http://localhost:3000';
const token = localStorage.getItem('Token');

//const user = userModel.getUser();
let user;
// Store all animals and species data
let allAnimals = [];
let uniqueSpecies = new Set();
let selectedSpecies = new Set();

async function initialize() {
  user = requireAuth();
  if (!user) return;
  
  await fetchAnimals();
  renderSpeciesFilters();
  displayUserInfo();
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
    
    // Add disconnect functionality
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

// fetching animals
async function fetchAnimals() {
  try {
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
    allAnimals = await response.json();
    
    // Extract unique species
    allAnimals.forEach(animal => {
      if (animal.SPECIES) {
        uniqueSpecies.add(animal.SPECIES);
      }
    });
    
    displayAnimals(allAnimals);
  } catch (error) {
    console.error('Error fetching animals:', error);
    document.getElementById('animal-cards-container').innerHTML = 
      '<div class="error">Failed to load animals. Please try again later.</div>';
  }
}

// species filters
function renderSpeciesFilters() {
  const filtersContainer = document.getElementById('species-filters');
  filtersContainer.innerHTML = ''; // Clear loading message
  
  // Create checkboxes for each species
  uniqueSpecies.forEach(species => {
    const filterOption = document.createElement('div');
    filterOption.className = 'filter-option';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `species-${species}`;
    checkbox.value = species;
    checkbox.addEventListener('change', handleSpeciesFilterChange);
    
    const label = document.createElement('label');
    label.htmlFor = `species-${species}`;
    label.textContent = species;
    
    filterOption.appendChild(checkbox);
    filterOption.appendChild(label);
    filtersContainer.appendChild(filterOption);
  });
}

// species filtering, animal display, etc.
function handleSpeciesFilterChange(event) {
  const species = event.target.value;
  
  if (event.target.checked) {
    selectedSpecies.add(species);
  } else {
    selectedSpecies.delete(species);
  }
  
  filterAnimals();
}

function filterAnimals() {
  // If no filters selected, show all animals
  if (selectedSpecies.size === 0) {
    displayAnimals(allAnimals);
    return;
  }
  
  // Filter animals by selected species
  const filteredAnimals = allAnimals.filter(animal => 
    selectedSpecies.has(animal.SPECIES)
  );
  
  displayAnimals(filteredAnimals);
}

function displayAnimals(animals) {
  const container = document.getElementById('animal-cards-container');
  container.innerHTML = ''; 

  if (animals.length === 0) {
    container.innerHTML = '<div class="no-results">No animals match your filters</div>';
    return;
  }

  animals.forEach((animal) => {
    const card = document.createElement('div');
    card.className = 'card';
    
    // Check for piped media 
    let imageSource = 'https://via.placeholder.com/300x200?text=No+Image';
    
    if (animal.multimedia && animal.multimedia.length > 0) {
      const media = animal.multimedia[0];
      if (media.pipeUrl) {
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
      </div>
    `;

    card.addEventListener('click', () => openAnimalDetailsPopup(animal.ANIMALID));
    container.appendChild(card);
  });
}

async function openAnimalDetailsPopup(animalId) {
  try {
    const response = await fetch(`${API_URL}/animals/details`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ animalId }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch animal details');
    }

    const animalDetails = await response.json();
    
    showAnimalDetailsPopup(animalDetails);
  } catch (error) {
    console.error('Error fetching animal details:', error);
  }
}

// Initialize the page
initialize();