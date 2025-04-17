import userModel from '../models/User.js'; 
import { requireAuth } from '../utils/authUtils.js'; 

const API_URL = 'http://localhost:3000'; 
const token = localStorage.getItem('Token');
let user; 

// Definește funcțiile ca globale pentru a fi accesibile din HTML
window.addMedicalHistoryEntry = function() {
    const container = document.getElementById('medical-history-container');

    // Creează o nouă intrare pentru Istoric Medical
    const newEntry = document.createElement('div');
    newEntry.className = 'medical-history-entry';
    newEntry.innerHTML = `
      <div class="form-group">
        <label for="recordDate">Dată Înregistrare</label>
        <input type="date" name="recordDate" value="2025-04-14" required>
      </div>
      <div class="form-group full-width">
        <label for="description">Descriere</label>
        <textarea name="description" placeholder="Introdu detalii despre vaccinuri, deparazitări etc." rows="3"></textarea>
      </div>
      <button type="button" class="btn delete-entry-btn" onclick="deleteMedicalHistoryEntry(this)">Șterge</button>
    `;

    // Adaugă noua intrare în container
    container.appendChild(newEntry);
};

window.deleteMedicalHistoryEntry = function(button) {
    const entry = button.parentElement; // Găsește elementul părinte al butonului
    entry.remove(); // Șterge intrarea
};

window.addMultimediaEntry = function() {
    const container = document.getElementById('multimedia-container');

    // Creează o nouă intrare pentru Multimedia
    const newEntry = document.createElement('div');
    newEntry.className = 'multimedia-entry';
    newEntry.innerHTML = `
      <div class="form-group">
        <label for="mediaType">Tip Media</label>
        <select name="mediaType" required>
          <option value="photo">Poză</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
        </select>
      </div>
      <div class="form-group">
        <label for="file">Încarcă Fișier</label>
        <input type="file" name="file" accept="image/*,video/*,audio/*" required>
      </div>
      <div class="form-group full-width">
        <label for="description">Descriere</label>
        <textarea name="description" placeholder="Introdu descrierea" rows="3"></textarea>
      </div>
      <button type="button" class="btn delete-entry-btn" onclick="deleteMultimediaEntry(this)">Șterge</button>
    `;

    // Adaugă noua intrare în container
    container.appendChild(newEntry);
};

window.deleteMultimediaEntry = function(button) {
    const entry = button.parentElement; // Găsește elementul părinte al butonului
    entry.remove(); // Șterge intrarea
};

window.updateBreedOptions = function() {
    const species = document.getElementById('species').value; // Preia specia selectată
    const breedSelect = document.getElementById('breed'); // Selectează dropdown-ul pentru rase

    // Șterge opțiunile existente
    breedSelect.innerHTML = '<option value="">Selectează o rasă</option>';

    // Definirea raselor pentru fiecare specie
    const breeds = {
        Câine: ['Labrador', 'Golden Retriever', 'Ciobănesc German', 'Bulldog'],
        Pisică: ['Siameză', 'Persană', 'Maine Coon', 'Bengaleză'],
        Papagal: ['Ara', 'Cacadu', 'Peruș', 'Nimfă'],
        Hamster: ['Sirian', 'Pitic Alb', 'Roborovski', 'Chinezesc'],
        Iepure: ['Olandez', 'Cap de Leu', 'Rex', 'Fluture'],
        Pește: ['Guppy', 'Neon', 'Betta', 'Scalar'],
        'Broască Țestoasă': ['Țestoasă de Florida', 'Țestoasă Grecească', 'Țestoasă de Apă'],
        Șarpe: ['Python Regal', 'Boa Constrictor', 'Șarpe de Porumb'],
        'Porcușor de Guineea': ['Abisinian', 'American', 'Peruvian', 'Texel']
    };

    // Verifică dacă specia selectată are rase definite
    if (breeds[species]) {
        breeds[species].forEach(breed => {
            const option = document.createElement('option');
            option.value = breed.toLowerCase(); // Setează valoarea opțiunii
            option.textContent = breed; // Textul afișat în dropdown
            breedSelect.appendChild(option); // Adaugă opțiunea în dropdown
        });
    }
};

// Funcție pentru a adăuga o nouă intrare în programul de hrănire
window.addFeedingScheduleEntry = function() {
    const container = document.getElementById('feeding-schedule-container');

    const newEntry = document.createElement('div');
    newEntry.className = 'feeding-schedule-entry';
    newEntry.innerHTML = `
      <div class="form-group">
        <label for="feedingTime">Ora Hrănire</label>
        <input type="time" name="feedingTime" required>
      </div>
      <div class="form-group full-width">
        <label for="foodType">Tip de Hrană</label>
        <textarea name="foodType" placeholder="Introdu tipurile de hrană" rows="2"></textarea>
      </div>
      <button type="button" class="btn delete-entry-btn" onclick="deleteFeedingScheduleEntry(this)">Șterge</button>
    `;

    container.appendChild(newEntry);
};

// Funcție pentru a șterge o intrare din programul de hrănire
window.deleteFeedingScheduleEntry = function(button) {
    const container = document.getElementById('feeding-schedule-container');
    const entries = container.querySelectorAll('.feeding-schedule-entry');

    // Permite ștergerea doar dacă există mai mult de o intrare
    if (entries.length > 1) {
        const entry = button.parentElement;
        entry.remove();
        updateDeleteButtons(); // Actualizează starea butoanelor de ștergere
    } else {
        alert('Prima intrare nu poate fi ștearsă.');
    }
};

// Funcție pentru a actualiza starea butoanelor de ștergere
function updateDeleteButtons() {
    const entries = document.querySelectorAll('.feeding-schedule-entry');
    entries.forEach((entry, index) => {
        const deleteButton = entry.querySelector('.delete-entry-btn');
        if (index === 0) {
            deleteButton.style.display = 'none'; // Ascunde butonul pentru prima intrare
        } else {
            deleteButton.style.display = 'inline-block'; // Afișează butonul pentru celelalte intrări
        }
    });
}

// Medical History
window.submitPublishForm = async function(event) {
    event.preventDefault();

    const userID = user.id;
    const name = document.getElementById('name').value;
    const species = document.getElementById('species').value;
    const breed = document.getElementById('breed').value;
    const age = parseInt(document.getElementById('age').value, 10);
    const gender = document.getElementById('gender').value;

    // Colectează toate intrările din programul de hrănire
    const feedingSchedule = [];
    const feedingEntries = document.querySelectorAll('.feeding-schedule-entry');
    feedingEntries.forEach((entry) => {
        const feedingTime = entry.querySelector('[name="feedingTime"]').value;
        const foodType = entry.querySelector('[name="foodType"]').value;
        feedingSchedule.push({ feedingTime, foodType });
    });

    // Medical History
    const medicalHistory = {
        vetNumber: document.getElementById('vetNumber').value,
        recordDate: document.getElementById('recordDate').value,
        description: document.getElementById('description').value,
        first_aid_noted: document.getElementById('firstAidNoted').value,
    };

    // Multimedia (poza de sub Age și alte fișiere multimedia)
    const multimedia = [];
    const photoInput = document.getElementById('photo');
    if (photoInput.files.length > 0) {
        const photoFile = photoInput.files[0];
        multimedia.push({
            mediaType: 'photo',
            url: URL.createObjectURL(photoFile), // Simulează URL-ul (înlocuiește cu logica reală de upload)
            description: 'Poza atașată sub câmpul Age',
        });
    }

    // Adaugă alte intrări multimedia
    const multimediaEntries = document.querySelectorAll('.multimedia-entry');
    multimediaEntries.forEach((entry) => {
        const mediaType = entry.querySelector('[name="mediaType"]').value;
        const fileInput = entry.querySelector('[name="file"]');
        const description = entry.querySelector('[name="description"]').value;

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            multimedia.push({
                mediaType,
                url: URL.createObjectURL(file), 
                description,
            });
        }
    });

    // Relații
    const relations = {
        friendWith: document.getElementById('relations').value.split(',').map(name => name.trim()).join(','),
    };

    // Creează obiectul final
    const payload = {
        userID,
        name,
        breed,
        species,
        age,
        gender,
        feedingSchedule,
        medicalHistory,
        multimedia,
        relations,
    };

    console.log('Payload trimis către backend:', payload);

    // Trimite datele către backend
    try {
        const response = await fetch(`${API_URL}/animals/create`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            alert('Animal publicat cu succes!');
            window.location.href = '../Home/Home.html'; 
        } else {
            const error = await response.json();
            console.error('Răspuns din backend:', error);
            alert(`Eroare: ${error.error || 'A apărut o eroare necunoscută'}`);
        }
    } catch (err) {
        console.error('Eroare la trimiterea datelor:', err);
        alert('A apărut o eroare. Te rugăm să încerci din nou.');
    }
};

// Asigură-te că butonul de ștergere este ascuns pentru prima intrare la încărcarea paginii
document.addEventListener('DOMContentLoaded', function() {
    updateDeleteButtons();

    // Check if user is authenticated before loading page content
    user = requireAuth();
    if (!user) return;
    
    // Verifică dacă elementele există înainte de a adăuga event listeners
    const photoInput = document.getElementById('photo');
    if (photoInput) {
      photoInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
          console.log('Selected file:', file.name);
        } else {
          console.log('No file selected');
        }
      });
    }
  
    // Inițializează alte configurări dacă este necesar
    console.log('Publish.js încărcat complet.');
});

window.redirectToHome = function() {
    window.location.href = '../Home/Home.html';
};