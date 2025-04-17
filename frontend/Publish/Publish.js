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
    console.log('Specie selectată:', species); // Adaugă log pentru debugging

    const breedSelect = document.getElementById('breed'); // Selectează dropdown-ul pentru rase

    // Șterge opțiunile existente
    breedSelect.innerHTML = '<option value="">Selectează o rasă</option>';

    // Definirea raselor pentru fiecare specie
    const breeds = {
        Câine: ['Labrador', 'Golden Retriever', 'Ciobănesc German', 'Bulldog'],
        Pisică: ['Siameză', 'Persană', 'Maine Coon', 'Bengaleză']
    };

    // Verifică dacă specia selectată are rase definite
    if (breeds[species]) {
        console.log('Adaug rase pentru:', species); // Adaugă log pentru debugging
        breeds[species].forEach(breed => {
            console.log('Adaug rasă:', breed); // Adaugă log pentru debugging
            const option = document.createElement('option');
            option.value = breed.toLowerCase(); // Setează valoarea opțiunii
            option.textContent = breed; // Textul afișat în dropdown
            breedSelect.appendChild(option); // Adaugă opțiunea în dropdown
        });
    }
};

window.submitPublishForm = async function(event) {
    event.preventDefault(); 

    //const user = userModel.getUser();
  
    const userID = user.id;

    // Preia datele din formular
    const name = document.getElementById('name').value;
    const species = document.getElementById('species').value;
    const breed = document.getElementById('breed').value;
    const age = parseInt(document.getElementById('age').value, 10);
    const gender = document.getElementById('gender').value;

    // Feeding Schedule
    const feedingSchedule = {
        feeding_time: document.getElementById('feedingTime').value,
        food_type: document.getElementById('foodType').value,
        notes: document.getElementById('notes').value,
    };

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

    console.log('Payload:', payload); 

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
            alert(`Eroare: ${error.message}`);
        }
    } catch (err) {
        console.error('Eroare la trimiterea datelor:', err);
        alert('A apărut o eroare. Te rugăm să încerci din nou.');
    }
};

// Adaugă un eveniment când documentul este încărcat complet
document.addEventListener('DOMContentLoaded', function() {

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