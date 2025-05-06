import Sidebar from '../SideBar/Sidebar.js';
import { showAnimalDetailsPopup } from '../AnimalCard/AnimalCard.js';
import { requireAuth } from '../utils/authUtils.js';
import { showLoading, hideLoading } from '../utils/loadingUtils.js';

const API_URL = 'http://localhost:3000';
const token = localStorage.getItem('Token');
let animals = [];
const uniqueSpecies = [];
let filteredAnimals = [];
let user;

async function initialize() {
  
  user = requireAuth();
  if (!user) return;
  
  // Render sidebar
  document.getElementById('sidebar-container').innerHTML = Sidebar.render('home');
  new Sidebar('home');
  
  await fetchAnimals();
  renderSpeciesFilters();
}

async function fetchAnimals() {
  try {
    showLoading('Loading animals...');
    
    // Clear the static loader
    const container = document.getElementById('animal-cards-container');
    container.innerHTML = '';
    
    const response = await fetch(`${API_URL}/animals/all`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch animals');
    }
    
    animals = await response.json();
    
    // Extract unique species for filters
    animals.forEach(animal => {
      if (animal.SPECIES && !uniqueSpecies.includes(animal.SPECIES)) {
        uniqueSpecies.push(animal.SPECIES);
      }
    });
    
    filteredAnimals = [...animals];
    displayAnimals(filteredAnimals);
  } catch (error) {
    console.error('Error fetching animals:', error);
    document.getElementById('animal-cards-container').innerHTML = `
      <div class="error-message">Failed to load animals. Please try again later.</div>
    `;
  } finally {
    hideLoading();
  }
}

function renderSpeciesFilters() {
  const filtersContainer = document.getElementById('species-filters');
  filtersContainer.innerHTML = ''; 
  
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

function handleSpeciesFilterChange(event) {
  const species = event.target.value;
  
  if (event.target.checked) {
    filteredAnimals = animals.filter(animal => animal.SPECIES === species);
  } else {
    filteredAnimals = [...animals];
  }
  
  displayAnimals(filteredAnimals);
}

function displayAnimals(animals) {
  const container = document.getElementById('animal-cards-container');
  container.innerHTML = ''; 

  if (animals.length === 0) {
    container.innerHTML = '<div class="no-results">No animals match your filters</div>';
    return;
  }

  // Only process the first 6-8 animals immediately 
  const initialBatch = animals.slice(0, 6);
  const remainingBatch = animals.slice(6);
  
  // Render first batch immediately
  initialBatch.forEach(animal => renderAnimalCard(animal, container));
  
  // Render remaining animals after a slight delay
  if (remainingBatch.length > 0) {
    setTimeout(() => {
      remainingBatch.forEach(animal => renderAnimalCard(animal, container));
    }, 50);
  }
}

function renderAnimalCard(animal, container) {
  const card = document.createElement('div');
  card.className = 'card';
  
  // Choose loading strategy based on likely viewport position
  const lazyLoad = container.children.length > 6;
  
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
    <img src="${lazyLoad ? 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' : imageSource}" 
         ${lazyLoad ? `data-src="${imageSource}"` : ''}
         class="${lazyLoad ? 'lazy' : ''}"
         alt="${animal.NAME}">
    <div class="card-content">
      <h2>${animal.NAME}</h2>
      <p>Breed: ${animal.BREED}</p>
      <p>Species: ${animal.SPECIES}</p>
    </div>
  `;

  card.addEventListener('click', () => openAnimalDetailsPopup(animal.ANIMALID));
  container.appendChild(card);
  
  // Initialize lazy 
  if (lazyLoad) {
    observeImage(card.querySelector('img.lazy'));
  }
}

// Set up intersection observer for lazy loading
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      imageObserver.unobserve(img);
    }
  });
});

function observeImage(img) {
  imageObserver.observe(img);
}

async function openAnimalDetailsPopup(animalId) {
  try {
    showLoading('Loading animal details...');
    
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
  } finally {
    hideLoading();
  }
}

initialize();