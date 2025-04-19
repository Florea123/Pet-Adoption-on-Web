import userModel from "../models/User.js";
import { requireAuth } from "../utils/authUtils.js";

const API_URL = "http://localhost:3000";
const token = localStorage.getItem("Token");
let user;

// Initialize the page
document.addEventListener("DOMContentLoaded", function () {
  console.log("Initializing Publish page...");

  user = requireAuth();
  if (!user) return;

  const feedingContainer = document.getElementById(
    "feeding-schedule-container"
  );
  if (
    feedingContainer &&
    feedingContainer.querySelectorAll(".feeding-schedule-entry").length === 0
  ) {
    console.log("No feeding entries found, adding initial entry");
    addInitialFeedingEntry();
  }

  updateDeleteButtons();

  // Set up photo input handler
  const photoInput = document.getElementById("photo");
  if (photoInput) {
    photoInput.addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (file) {
        console.log("Selected file:", file.name);
      } else {
        console.log("No file selected");
      }
    });
  }

  console.log("Publish.js loaded completely.");
});

// Add initial feeding entry
function addInitialFeedingEntry() {
  const container = document.getElementById("feeding-schedule-container");
  const initialEntry = document.createElement("div");
  initialEntry.className = "feeding-schedule-entry";
  initialEntry.innerHTML = `
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
  container.appendChild(initialEntry);
}

// Medical history entry functions
window.addMedicalHistoryEntry = function () {
  const container = document.getElementById("medical-history-container");

  const newEntry = document.createElement("div");
  newEntry.className = "medical-history-entry";
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

  container.appendChild(newEntry);
};

window.deleteMedicalHistoryEntry = function (button) {
  const entry = button.parentElement;
  entry.remove();
};

// Multimedia entry functions
window.addMultimediaEntry = function () {
  const container = document.getElementById("multimedia-container");

  const newEntry = document.createElement("div");
  newEntry.className = "multimedia-entry";
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

  container.appendChild(newEntry);
};

window.deleteMultimediaEntry = function (button) {
  const entry = button.parentElement;
  entry.remove();
};

// Breed selection options
window.updateBreedOptions = function () {
  const species = document.getElementById("species").value;
  const breedSelect = document.getElementById("breed");

  breedSelect.innerHTML = '<option value="">Selectează o rasă</option>';

  const breeds = {
    Câine: ["Labrador", "Golden Retriever", "Ciobănesc German", "Bulldog"],
    Pisică: ["Siameză", "Persană", "Maine Coon", "Bengaleză"],
    Papagal: ["Ara", "Cacadu", "Peruș", "Nimfă"],
    Hamster: ["Sirian", "Pitic Alb", "Roborovski", "Chinezesc"],
    Iepure: ["Olandez", "Cap de Leu", "Rex", "Fluture"],
    Pește: ["Guppy", "Neon", "Betta", "Scalar"],
    "Broască Țestoasă": [
      "Țestoasă de Florida",
      "Țestoasă Grecească",
      "Țestoasă de Apă",
    ],
    Șarpe: ["Python Regal", "Boa Constrictor", "Șarpe de Porumb"],
    "Porcușor de Guineea": ["Abisinian", "American", "Peruvian", "Texel"],
  };

  if (breeds[species]) {
    breeds[species].forEach((breed) => {
      const option = document.createElement("option");
      option.value = breed.toLowerCase();
      option.textContent = breed;
      breedSelect.appendChild(option);
    });
  }
};

// Feeding schedule functions
window.addFeedingScheduleEntry = function () {
  const container = document.getElementById("feeding-schedule-container");

  const newEntry = document.createElement("div");
  newEntry.className = "feeding-schedule-entry";
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
  updateDeleteButtons();
};

window.deleteFeedingScheduleEntry = function (button) {
  const container = document.getElementById("feeding-schedule-container");
  const entries = container.querySelectorAll(".feeding-schedule-entry");

  if (entries.length > 1) {
    const entry = button.parentElement;
    entry.remove();
    updateDeleteButtons();
  } else {
    alert("Prima intrare nu poate fi ștearsă.");
  }
};

function updateDeleteButtons() {
  const entries = document.querySelectorAll(".feeding-schedule-entry");
  entries.forEach((entry, index) => {
    const deleteButton = entry.querySelector(".delete-entry-btn");
    if (index === 0) {
      deleteButton.style.display = "none";
    } else {
      deleteButton.style.display = "inline-block";
    }
  });
}

// Form submission
window.submitPublishForm = async function (event) {
  event.preventDefault();
  console.log("Form submission started");

  const userID = user.id;
  const name = document.getElementById("name").value;
  const species = document.getElementById("species").value;
  const breed = document.getElementById("breed").value;
  const age = parseInt(document.getElementById("age").value, 10);
  const gender = document.getElementById("gender").value;

  // Collect feeding schedule entries with proper format
  const feedingSchedule = [];
  const feedingEntries = document.querySelectorAll(".feeding-schedule-entry");

  feedingEntries.forEach((entry) => {
    const timeInput = entry.querySelector('[name="feedingTime"]');
    const foodTypeInput = entry.querySelector('[name="foodType"]');

    if (timeInput && timeInput.value) {
      feedingSchedule.push({
        feedingTime: timeInput.value, // Format: "HH:MM"
        foodType: foodTypeInput ? foodTypeInput.value : "",
      });
    }
  });

  console.log("Collected feeding schedule:", feedingSchedule);

  // Medical History
  const medicalHistoryEntries = document.querySelectorAll(
    ".medical-history-entry"
  );
  const medicalHistory = [];

  medicalHistoryEntries.forEach((entry) => {
    const recordDateInput = entry.querySelector('[name="recordDate"]');
    const descriptionInput = entry.querySelector('[name="description"]');

    if (recordDateInput && recordDateInput.value) {
      medicalHistory.push({
        vetNumber: document.getElementById("vetNumber").value,
        recordDate: recordDateInput.value,
        description: descriptionInput ? descriptionInput.value : "",
        first_aid_noted: document.getElementById("firstAidNoted").value,
      });
    }
  });

  // If no entries were found, use the primary form fields
  if (medicalHistory.length === 0) {
    medicalHistory.push({
      vetNumber: document.getElementById("vetNumber").value,
      recordDate: document.getElementById("recordDate").value,
      description: document.getElementById("description").value,
      first_aid_noted: document.getElementById("firstAidNoted").value,
    });
  }

  // Collect multimedia entries
  const multimedia = [];
  const photoInput = document.getElementById("photo");
  if (photoInput && photoInput.files.length > 0) {
    const photoFile = photoInput.files[0];
    const fileName = `${Date.now()}_${photoFile.name.replace(/\s+/g, "_")}`;
    const mediaType = "photo";
    const serverPath = `/server/${mediaType}/${fileName}`;

    // Upload the file to server
    await uploadFileToServer(photoFile, mediaType, fileName);

    multimedia.push({
      mediaType: mediaType,
      url: serverPath,
      description: "Main photo",
    });
  }

  // Additional multimedia entries
  const multimediaEntries = document.querySelectorAll(".multimedia-entry");
  for (const entry of multimediaEntries) {
    const mediaTypeSelect = entry.querySelector('[name="mediaType"]');
    const fileInput = entry.querySelector('[name="file"]');
    const descriptionInput = entry.querySelector('[name="description"]');

    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const mediaType = mediaTypeSelect ? mediaTypeSelect.value : "photo";
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const serverPath = `/server/${mediaType}/${fileName}`;

      // Upload the file to server
      await uploadFileToServer(file, mediaType, fileName);

      multimedia.push({
        mediaType: mediaType,
        url: serverPath,
        description: descriptionInput ? descriptionInput.value : "",
      });
    }
  }

  // Helper function to upload files to the server
  async function uploadFileToServer(file, mediaType, fileName) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mediaType", mediaType);
    formData.append("fileName", fileName);

    try {
      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      return await uploadResponse.json();
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  }

  // Relations
  const relationsInput = document.getElementById("relations");
  const relations =
    relationsInput && relationsInput.value
      ? {
          friendWith: relationsInput.value
            .split(",")
            .map((name) => name.trim())
            .filter((name) => name) // Remove empty items
            .join(","),
        }
      : null;

  // Create final payload
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
    relations: relations && relations.friendWith ? relations : null,
  };

  console.log("Payload being sent to backend:", payload);

  // Send data to backend
  try {
    const response = await fetch(`${API_URL}/animals/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      alert("Animal publicat cu succes!");
      window.location.href = "../Home/Home.html";
    } else {
      const error = await response.json();
      console.error("Backend response:", error);
      alert(`Error: ${error.error || "An unknown error occurred"}`);
    }
  } catch (err) {
    console.error("Error sending data:", err);
    alert("A apărut o eroare. Te rugăm să încerci din nou.");
  }
};

// Navigation
window.redirectToHome = function () {
  window.location.href = "../Home/Home.html";
};
