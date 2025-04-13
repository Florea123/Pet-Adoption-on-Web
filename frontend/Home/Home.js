const API_URL = 'http://localhost:3000';

async function fetchAnimals() {
  try {
    const response = await fetch(`${API_URL}/animals/all`);
    if (!response.ok) {
      throw new Error('Failed to fetch animals');
    }
    const animals = await response.json();
    displayAnimals(animals);
  } catch (error) {
    console.error('Error fetching animals:', error);
  }
}

function displayAnimals(animals) {
  const container = document.getElementById('animal-cards-container');
  container.innerHTML = ''; 

  animals.forEach((animal) => {

    console.log(animal);
    
    const card = document.createElement('div');
    card.className = 'card';

    const imageUrl = animal.multimedia[0]?.URL 
    card.innerHTML = `
      <img src="${imageUrl}" alt="${animal.NAME}">
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ animalId }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch animal details');
    }

    const animalDetails = await response.json();
    showPopup(animalDetails);
  } catch (error) {
    console.error('Error fetching animal details:', error);
  }
}

function showPopup(details) {
  const popup = document.createElement('div');
  popup.className = 'popup';

  const multimedia = details.multimedia.map(
    (media) => `<img src="${media.URL}" alt="${media.DESCRIPTION}" />`
  ).join('');

  popup.innerHTML = `
    <div class="popup-content">
      <span class="close-btn">&times;</span>
      <h2>${details.animal.NAME}</h2>
      <p><strong>Breed:</strong> ${details.animal.BREED}</p>
      <p><strong>Species:</strong> ${details.animal.SPECIES}</p>
      <p><strong>Age:</strong> ${details.animal.AGE}</p>
      <p><strong>Gender:</strong> ${details.animal.GENDER}</p>
      <p><strong>Owner:</strong> ${details.owner.FIRSTNAME} ${details.owner.LASTNAME}</p>
      <p><strong>Address:</strong> ${details.address[0]?.STREET}, ${details.address[0]?.CITY}, ${details.address[0]?.STATE}, ${details.address[0]?.COUNTRY}</p>
      <h3>Multimedia</h3>
      <div class="multimedia">${multimedia}</div>
    </div>
  `;

  // Close popup on clicking the close button
  popup.querySelector('.close-btn').addEventListener('click', () => {
    popup.remove();
  });

  document.body.appendChild(popup);
}

// Fetch and display animals on page load
fetchAnimals();