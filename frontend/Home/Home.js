import userModel from '../models/User.js';
import { requireAuth } from '../utils/authUtils.js';
import { showAnimalDetailsPopup } from '../AnimalCard/AnimalCard.js'; 
import Sidebar from '../SideBar/Sidebar.js';

const API_URL = 'http://localhost:3000';
const token = localStorage.getItem('Token');

let user;
let allAnimals = [];
let uniqueSpecies = new Set();
let selectedSpecies = new Set();

async function initialize() {
  user = requireAuth();
  if (!user) return;
  
  // Render sidebar
  document.getElementById('sidebar-container').innerHTML = Sidebar.render('home');
  new Sidebar('home');
  
  await fetchAnimals();
  renderSpeciesFilters();
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
        imageSource = `data:${media.mimeType};base64,${media.fileData}`;
      } else if (media.URL) {
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