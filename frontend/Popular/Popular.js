import Sidebar from '../SideBar/Sidebar.js';
import { showAnimalDetailsPopup } from '../AnimalCard/AnimalCard.js';
import { showLoading, hideLoading } from '../utils/loadingUtils.js';

const API_URL = 'http://localhost:3000';
const token = localStorage.getItem('Token');

async function initialize() {
  // loading spinner
  const linkElement = document.createElement("link");
  linkElement.rel = "stylesheet";
  linkElement.href = "../utils/loadingUtils.css";
  document.head.appendChild(linkElement);

  // Render sidebar
  document.getElementById('sidebar-container').innerHTML = Sidebar.render('popular');
  new Sidebar('popular');

  // Fetch and display top animals
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
    container.innerHTML = '<div class="no-results">No popular animals found in your city.</div>';
    return;
  }

  animals.forEach((animal) => {
    const card = document.createElement('div');
    card.className = 'card';

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