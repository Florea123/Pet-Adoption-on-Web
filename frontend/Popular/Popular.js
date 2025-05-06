import Sidebar from '../SideBar/Sidebar.js';
import { showAnimalDetailsPopup } from '../AnimalCard/AnimalCard.js';
import { showLoading, hideLoading } from '../utils/loadingUtils.js';

const API_URL = 'http://localhost:3000';
const token = localStorage.getItem('Token');

async function initialize() {
  
  // Render sidebar
  document.getElementById('sidebar-container').innerHTML = Sidebar.render('popular');
  new Sidebar('popular');

  await fetchTopAnimals();
}

async function fetchTopAnimals() {
  try {
    showLoading('Loading popular animals...');
    
    const userString = localStorage.getItem('User');
    if (!userString) {
      throw new Error('User is missing. Please log in again.');
    }
    const user = JSON.parse(userString);
    const userId = user.id;

    const response = await fetch(`${API_URL}/animals/top-by-city?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch top animals');
    }

    const topAnimals = await response.json();
    displayAnimals(topAnimals);
  } catch (error) {
    console.error('Error fetching top animals:', error);
    document.getElementById('animal-cards-container').innerHTML =
      '<div class="error">Failed to load top animals. Please try again later.</div>';
  } finally {
    hideLoading();
  }
}

function displayAnimals(animals) {
  const container = document.getElementById('animal-cards-container');
  container.innerHTML = '';

  if (animals.length === 0) {
    container.innerHTML = '<div class="no-results">No popular animals found in your area.</div>';
    return;
  }

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
        'Authorization': `Bearer ${token}`,
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