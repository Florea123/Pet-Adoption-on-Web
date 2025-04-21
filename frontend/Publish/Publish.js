import userModel from "../models/User.js";
import { requireAuth } from "../utils/authUtils.js";
import { showLoading, hideLoading } from "../utils/loadingUtils.js";

const API_URL = "http://localhost:3000";
const token = localStorage.getItem("Token");
let user;

// Initialize the page
document.addEventListener("DOMContentLoaded", function () {
  // Add link to CSS for loading spinner
  const linkElement = document.createElement("link");
  linkElement.rel = "stylesheet";
  linkElement.href = "../utils/loadingUtils.css"; 
  document.head.appendChild(linkElement);

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
    });
  }
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
  
  try {
    // Show loading spinner
    showLoading("Publicare în curs...");
    
    const userID = user.id;
    const name = document.getElementById("name").value;
    const species = document.getElementById("species").value;
    const breed = document.getElementById("breed").value;
    const age = parseInt(document.getElementById("age").value, 10);
    const gender = document.getElementById("gender").value;

    // Collect feeding schedule entries
    const feedingSchedule = [];
    const feedingEntries = document.querySelectorAll(".feeding-schedule-entry");

    feedingEntries.forEach((entry) => {
      const timeInput = entry.querySelector('[name="feedingTime"]');
      const foodTypeInput = entry.querySelector('[name="foodType"]');

      if (timeInput && timeInput.value) {
        feedingSchedule.push({
          feedingTime: timeInput.value,
          foodType: foodTypeInput ? foodTypeInput.value : "",
        });
      }
    });

    // Medical History
    const medicalHistoryEntries = document.querySelectorAll(".medical-history-entry");
    const medicalHistory = [];

    medicalHistoryEntries.forEach((entry) => {
      const recordDateInput = entry.querySelector('[name="recordDate"]');
      const descriptionInput = entry.querySelector('[name="description"]');

      if (recordDateInput && recordDateInput.value) {
        medicalHistory.push({
          recordDate: recordDateInput.value,
          description: descriptionInput ? descriptionInput.value : "",
          vetNumber: document.getElementById("vetNumber").value,
          first_aid_noted: document.getElementById("firstAidNoted").value
        });
      }
    });

    // Upload all files first
    const multimedia = [];
    const uploadPromises = [];

    // Main photo
    const photoInput = document.getElementById("photo");
    if (photoInput && photoInput.files.length > 0) {
      const photoFile = photoInput.files[0];
      const mediaType = "photo";

      try {
        const serverPath = await uploadFileToServer(photoFile, mediaType);
        multimedia.push({
          mediaType: mediaType,
          url: serverPath,
          description: "Main photo",
        });
      } catch (uploadError) {
        console.error("Error uploading main photo:", uploadError);
        throw new Error("Failed to upload main photo. Please check your connection.");
      }
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
        const description = descriptionInput ? descriptionInput.value : "";

        try {
          const serverPath = await uploadFileToServer(file, mediaType);
          multimedia.push({
            mediaType: mediaType,
            url: serverPath,
            description: description,
          });
        } catch (uploadError) {
          console.error("Error uploading additional media:", uploadError);
          // Continue with other files instead of failing completely
        }
      }
    }

    // Relations
    const relationsInput = document.getElementById("relations");
    const relations = relationsInput && relationsInput.value
      ? {
          friendWith: relationsInput.value
            .split(",")
            .map((name) => name.trim())
            .filter((name) => name)
            .join(","),
        }
      : null;

    // Prepare final payload
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

    console.log("Sending payload:", payload);
    
    // Send data to server with fetch API and timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      console.log(`Connecting to ${API_URL}/animals/create`);
      const response = await fetch(`${API_URL}/animals/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || `Server error: ${response.status}`;
        } catch (e) {
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      // Success path
      const responseData = await response.json();
      console.log("Server response complete:", responseData);
      
      // Add a deliberate delay to ensure backend processing completes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Hide loading spinner
      hideLoading();

      // Set a redirect flag in case direct redirection fails
      sessionStorage.setItem("redirect_after_publish", "true");
      
      // Now redirect only after complete server response and delay
      console.log("Server processing complete, redirecting...");
      window.location.href = "../Home/Home.html";
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error("Request timed out. Please check your server connection.");
      } else {
        throw fetchError;
      }
    }
    
  } catch (error) {
    console.error("Error during publication:", error);
    hideLoading();
    alert(`Error: ${error.message || "Failed to publish animal"}`);
  }
};

// Helper function to upload files to the server
async function uploadFileToServer(file, mediaType, fileName) {
  // Create FormData object for file upload
  const formData = new FormData();
  
  // Append the file with its original name to preserve the extension
  formData.append("file", file, file.name);
  formData.append("mediaType", mediaType);
  
  // Log file details for debugging
  console.log(`Uploading file: ${file.name}, type: ${file.type}, size: ${file.size}`);
  
  // Set a timeout for the upload
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for uploads
  
  try {
    console.log(`Sending to ${API_URL}/upload`);
    const uploadResponse = await fetch(`${API_URL}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed with status ${uploadResponse.status}`);
    }

    const responseData = await uploadResponse.json();
    console.log(`Upload successful: ${file.name}, server path: ${responseData.filePath}`);
    return responseData.filePath;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error("Upload timed out. Please try again with a smaller file or check your connection.");
    }
    throw error;
  }
}

// Navigation
window.redirectToHome = function() {
  window.location.replace("../Home/Home.html");
};
