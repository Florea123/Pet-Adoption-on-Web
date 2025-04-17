import userModel from '../models/User.js';

const API_URL = 'http://localhost:3000';
const user = userModel.getUser();

// Store all animals and species data
let allAnimals = [];
let uniqueSpecies = new Set();
let selectedSpecies = new Set();

// Initial data loading
async function initialize() {
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

// Existing code for fetching animals
async function fetchAnimals() {
  try {
    const response = await fetch(`${API_URL}/animals/all`);
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

// Existing code for species filters
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

// Rest of your existing code for species filtering, animal display, etc.
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

    const imageUrl = animal.multimedia && animal.multimedia[0]?.URL || 'https://via.placeholder.com/300x200?text=No+Image';
    card.innerHTML = `
      <img src="${imageUrl}" alt="${animal.NAME}">
      <div class="card-content">
        <h2>${animal.NAME}</h2>
        <p>Breed: ${animal.BREED}</p>
        <p>Species: ${animal.SPECIES}</p>
      </div>
    `;

    card.addEventListener('click', () => {
      console.log('Card clicked:', animal.ANIMALID); // Log pentru a verifica dacă evenimentul este declanșat
      openAnimalDetailsPopup(animal.ANIMALID);
    });

    container.appendChild(card);
  });
}

async function openAnimalDetailsPopup(animalId) {
  console.log('Animal ID:', animalId); // Log pentru a verifica dacă funcția este apelată
  try {
    const response = await fetch(`${API_URL}/animals/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animalId }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch animal details');
    }

    const animalDetails = await response.json();
    console.log('Animal Details:', animalDetails); // Log pentru a verifica datele primite
    showPopup(animalDetails);
  } catch (error) {
    console.error('Error fetching animal details:', error);
  }
}

function showPopup(details) {
  console.log('Popup details:', details); // Log pentru a verifica datele primite
  const popup = document.createElement('div');
  popup.className = 'popup';

  // Prima multimedia este poza principală
  const mainImage = details.multimedia[0]?.URL || 'https://via.placeholder.com/300x200?text=No+Image';

  // Generare HTML pentru medicalHistory
  const medicalHistory = details.medicalHistory.length > 0
    ? details.medicalHistory.map((entry) => `
        <li><strong>Date:</strong> ${entry.recordDate || 'N/A'} - <strong>Description:</strong> ${entry.description || 'N/A'}</li>
      `).join('')
    : '<li>No medical history available</li>';

  // Generare HTML pentru feedingSchedule
  const feedingSchedule = details.feedingSchedule.length > 0
    ? details.feedingSchedule.map((entry) => `
        <li><strong>Time:</strong> ${entry.feedingTime || 'N/A'} - <strong>Food:</strong> ${entry.foodType || 'N/A'}</li>
      `).join('')
    : '<li>No feeding schedule available</li>';

  // Generare HTML pentru relations
  const relations = details.relations?.friendWith
    ? `<p>${details.relations.friendWith}</p>`
    : '<p>No relations available</p>';

  popup.innerHTML = `
    <div class="popup-content">
      <span class="close-btn">&times;</span>
      <div class="popup-left">
        <img src="${mainImage}" alt="${details.animal.NAME}" class="main-image">
        <div class="additional-info">
          <h3>Medical History</h3>
          <ul>${medicalHistory}</ul>
          <h3>Feeding Schedule</h3>
          <ul>${feedingSchedule}</ul>
          <h3>Relations</h3>
          ${relations}
        </div>
      </div>
      <div class="popup-right">
        <h2>${details.animal.NAME}</h2>
        <p><strong>Breed:</strong> ${details.animal.BREED}</p>
        <p><strong>Species:</strong> ${details.animal.SPECIES}</p>
        <p><strong>Age:</strong> ${details.animal.AGE}</p>
        <p><strong>Gender:</strong> ${details.animal.GENDER === 'male' ? 'Male' : 'Female'}</p>
        <p><strong>Owner:</strong> ${details.owner.FIRSTNAME} ${details.owner.LASTNAME}</p>
        <p><strong>City:</strong> ${details.address[0]?.CITY || 'Unknown'}</p>
      </div>
    </div>
  `;

  // Închide popup-ul la clic pe butonul de închidere
  popup.querySelector('.close-btn').addEventListener('click', () => {
    popup.remove();
  });

  document.body.appendChild(popup);
  console.log('Popup added to DOM'); // Log pentru a verifica dacă popup-ul este adăugat
}

async function getAnimalDetailsById(req, res) {
  try {
    const body = await parseRequestBody(req);
    console.log('Request body:', body); // Log pentru a verifica datele primite
    const { animalId } = body;

    if (!animalId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Animal ID is required" }));
      return;
    }

    const animal = await Animal.findById(animalId);
    if (!animal) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Animal not found" }));
      return;
    }

    const multimedia = await MultiMedia.findByAnimalId(animalId);
    const feedingSchedule = await FeedingSchedule.findByAnimalId(animalId);
    const medicalHistory = await MedicalHistory.findByAnimalId(animalId);
    const owner = await User.findById(animal.USERID);
    const address = await Address.findByUserId(animal.USERID);

    const response = {
      animal,
      multimedia,
      feedingSchedule,
      medicalHistory,
      owner,
      address,
    };

    console.log('Animal details response:', response); // Log pentru a verifica răspunsul
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(response));
  } catch (err) {
    console.error("Error fetching animal details:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}

// Initialize the page
initialize();