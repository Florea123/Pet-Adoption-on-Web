import config from '../config.js';
import { getResponsiveImageUrl, generatePlaceholder, getOptimalImageSize, generateSrcSet } from '../utils/imageOptimizer.js';

const API_URL = config.API_URL;

let currentMapInstance = null;

function loadGoogleMapsScript() {
  if (window.google && window.google.maps) return Promise.resolve();
  
  const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (existingScript) {
    return new Promise(resolve => {
      if (window.initMap) {
        const originalInitMap = window.initMap;
        window.initMap = () => {
          originalInitMap();
          resolve();
        };
      } else {
        window.initMap = () => resolve();
      }
    });
  }
  
  return new Promise(resolve => {
    window.initMap = () => resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.GOOGLE_MAPS_API_KEY}&callback=initMap&loading=async`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

const mapStyles = `
  .map-error {
    color: #d32f2f;
    text-align: center;
    padding: 20px;
  }
`;

// Optimized image helper function
function getOptimizedImageUrl(media, apiUrl, width = null) {
  if (!width) {
    width = getOptimalImageSize();
  }
  
  let imageSource = 'https://via.placeholder.com/400x300?text=No+Image';
  
  if (media && media.pipeUrl) {
    // Get properly sized image based on viewport
    return getResponsiveImageUrl(`${apiUrl}${media.pipeUrl}`, width);
  } else if (media && media.fileData && media.mimeType) {
    return `data:${media.mimeType};base64,${media.fileData}`;
  } else if (media && media.URL) {
    return media.URL;
  }
  
  return imageSource;
}

export function showAnimalDetailsPopup(details) {
  console.log('Opening animal popup with details:', details);
  
  // Start debugging observer
  const debugObserver = debugPopupClosure();
  
  // Add error boundaries to critical operations
  try {
    // Validate required data is present before proceeding
    if (!details || !details.animal) {  // ← FIX: Check details object first
      console.error('Missing animal data in details object');
      return;
    }
    
    const { animal, multimedia, owner, address, feedingSchedule, medicalHistory, relations } = details;
    
    

    // Check if we're on mobile
    const isMobile = window.innerWidth < 768;

    // Create popup elements
    const popupBackdrop = document.createElement('div');
    popupBackdrop.id = 'animal-detail-popup';
    popupBackdrop.className = 'animal-popup-backdrop';

    // Filter valid images for slideshow
    const media = multimedia && multimedia.length > 0 
      ? multimedia.filter(media => 
          media.pipeUrl || (media.fileData && media.mimeType) || media.URL
        ) 
      : [];
    
    // Preload the first image to improve LCP
    if (media.length > 0) {
      const firstMediaItem = media[0];
      const preloadImage = new Image();
      if (firstMediaItem.pipeUrl) {
        const optimizedUrl = getOptimizedImageUrl(firstMediaItem, API_URL, isMobile ? 600 : 1200);
        preloadImage.src = optimizedUrl;
      }
    }

    // Set up HTML structure
    const popupContent = document.createElement('div');
    popupContent.className = 'animal-popup-content';
    
    // Determine owner name
    let ownerName = 'N/A';
    if (owner && owner.FIRSTNAME) {
      ownerName = owner.LASTNAME ? `${owner.FIRSTNAME} ${owner.LASTNAME}` : owner.FIRSTNAME;
    }
    
    // Determine location
    let location = 'N/A';
    if (address && address.length > 0) {
      const addr = address[0];
      location = addr.CITY ? 
        (addr.COUNTY ? `${addr.CITY}, ${addr.COUNTY}` : addr.CITY) : 'N/A';
    }
    
    // Generate feeding schedule HTML
    let feedingScheduleHtml = '<p>No feeding schedule available.</p>';
    if (feedingSchedule && feedingSchedule.length > 0) {
      feedingScheduleHtml = `
        <div class="feeding-schedule-list">
          ${feedingSchedule.map(schedule => `
            <div class="feeding-schedule-item">
              <div class="feeding-time">
                <strong>Feeding Time:</strong> ${formatTime(schedule.FEEDING_TIME)}
              </div>
              <div class="food-type">
                <strong>Food Type:</strong> ${schedule.FOOD_TYPE || 'Not specified'}
              </div>
              ${schedule.NOTES ? `<div class="feeding-notes">${schedule.NOTES}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }
    
    // Generate medical history HTML
    let medicalHistoryHtml = '<p>No medical records available.</p>';
    if (medicalHistory && medicalHistory.length > 0) {
      medicalHistoryHtml = `
        <div class="medical-history-list">
          ${medicalHistory.map(record => `
            <div class="medical-record">
              <div class="record-header">
                <strong>Date:</strong> ${formatDate(record.RECORDDATE)}
                ${record.VETNUMBER ? `<span class="vet-number">Vet #${record.VETNUMBER}</span>` : ''}
              </div>
              <div class="record-description">${record.DESCRIPTION || 'No details provided'}</div>
              ${record.FIRST_AID_NOTED ? 
                `<div class="first-aid-notes"><strong>First Aid Notes:</strong> ${record.FIRST_AID_NOTED}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }
    
    // Generate relations HTML
    let relationsHtml = '<p>No relations available.</p>';
    if (relations && relations.length > 0) {
      relationsHtml = `
        <div class="relations-list">
          ${relations.map(relation => `
            <div class="relation-item">
              <div class="relation-name">
                <strong>Friend:</strong> ${relation.FRIENDWITH}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    // Set up modal content HTML
    popupContent.innerHTML = `
      <button class="popup-close-button" aria-label="Close">&times;</button>
      
      <div class="popup-image-container">
        ${media.length > 0 ? `
          <div class="slideshow-container">
            <div id="media-display" class="media-display"></div>
            <button class="slideshow-nav prev" id="prev-button" ${media.length <= 1 ? 'style="display:none"' : ''}>&#10094;</button>
            <button class="slideshow-nav next" id="next-button" ${media.length <= 1 ? 'style="display:none"' : ''}>&#10095;</button>
            <div class="slideshow-dots" id="slideshow-dots">
              ${media.map((item, i) => `<span class="dot" data-index="${i}"></span>`).join('')}
            </div>
          </div>
        ` : `
          <div class="no-image-placeholder">
            <img src="https://via.placeholder.com/400x300?text=No+Media+Available" alt="No media available">
          </div>
        `}
      </div>
      
      <div class="popup-details">
        <h2>${animal.NAME || 'Unnamed Animal'}</h2>
        
        <div class="animal-specs">
          <p><strong>Breed:</strong> ${animal.BREED || 'N/A'}</p>
          <p><strong>Species:</strong> ${animal.SPECIES || 'N/A'}</p>
          <p><strong>Age:</strong> ${animal.AGE || 'N/A'}</p>
          <p><strong>Gender:</strong> ${animal.GENDER || 'N/A'}</p>
        </div>

        <div class="animal-feeding-schedule">
          <h3>Feeding Schedule</h3>
          ${feedingScheduleHtml}
        </div>
        
        <div class="animal-medical-history">
          <h3>Medical History</h3>
          ${medicalHistoryHtml}
        </div>

        <div class="animal-relations">
          <h3>Friends With</h3>
          ${relationsHtml}
        </div>
        
        <div class="animal-owner">
          <h3>Owner Information</h3>
          <p><strong>Name:</strong> ${ownerName}</p>
          <p><strong>Location:</strong> ${location}</p>
          <div id="owner-location-map" style="height: 300px; width: 100%; margin-top: 15px; border-radius: 8px;"></div>
        </div>
        
        <button class="contact-button">Contact Owner</button>
      </div>
    `;
    
    // Append content to backdrop
    popupBackdrop.appendChild(popupContent);
    document.body.appendChild(popupBackdrop);
    
    initializeOwnerLocationMap(address);
    
    // Set up slideshow functionality 
    if (media.length > 0) {
      let currentMediaIndex = 0;
      const mediaDisplay = document.getElementById('media-display');
      const dots = document.querySelectorAll('.dot');
      
      // Function to update media display
      const showMedia = (index) => {
        currentMediaIndex = index;
        const mediaItem = media[index];
        
        // Clear previous media
        mediaDisplay.innerHTML = '';
        
        // Determine media source
        let mediaSource;
        if (mediaItem.pipeUrl) {
          mediaSource = getOptimizedImageUrl(mediaItem, API_URL, isMobile ? 600 : 1200);
        } else if (mediaItem.fileData && mediaItem.mimeType) {
          mediaSource = `data:${mediaItem.mimeType};base64,${mediaItem.fileData}`;
        } else if (mediaItem.URL) {
          mediaSource = mediaItem.URL;
        }
        
        // Determine media type based on URL or mime type
        let mediaType = detectMediaType(mediaItem);
        
       
        if (mediaType === 'video') {
          const videoElement = document.createElement('video');
          videoElement.className = 'popup-animal-video';
          videoElement.src = mediaSource;
          videoElement.controls = true;
          videoElement.controlsList = 'nodownload';
          videoElement.preload = 'metadata';
          mediaDisplay.appendChild(videoElement);
        } else if (mediaType === 'audio') {
          
          const audioContainer = document.createElement('div');
          audioContainer.className = 'audio-container';
          
          //  audio element
          const audioElement = document.createElement('audio');
          audioElement.className = 'popup-animal-audio';
          audioElement.src = mediaSource;
          audioElement.controls = true;
          audioElement.controlsList = 'nodownload';
          audioElement.preload = 'metadata';
          
         
          audioContainer.appendChild(audioElement);
          mediaDisplay.appendChild(audioContainer);
          
          
          const prevButton = document.getElementById('prev-button');
          const nextButton = document.getElementById('next-button');
          if (prevButton) prevButton.style.zIndex = '20';
          if (nextButton) nextButton.style.zIndex = '20';
        } else {
          // Default to image display
          const imgElement = document.createElement('img');
          imgElement.className = 'popup-animal-image';
          imgElement.src = mediaSource;
          imgElement.alt = animal.NAME || 'Animal';
          mediaDisplay.appendChild(imgElement);
        }
        
        // Update active dot indicator
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
      };
      
      // Show first media item
      showMedia(0);
      
      // Set up event listeners for navigation
      const prevButton = document.getElementById('prev-button');
      const nextButton = document.getElementById('next-button');
      
      prevButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent backdrop click
        const newIndex = (currentMediaIndex - 1 + media.length) % media.length;
        showMedia(newIndex);
      });
      
      nextButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent backdrop click
        const newIndex = (currentMediaIndex + 1) % media.length;
        showMedia(newIndex);
      });
      
      // Add dot navigation
      dots.forEach((dot) => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation(); 
          const index = parseInt(dot.getAttribute('data-index'));
          showMedia(index);
        });
      });
    }
    
    // Close functionality
    const closeButton = popupContent.querySelector('.popup-close-button');
    closeButton.addEventListener('click', () => {
      popupBackdrop.remove();
      cleanupMap(); 
    });
    
    // Close when clicking outside
    popupBackdrop.addEventListener('click', (e) => {
      if (e.target === popupBackdrop) {
        popupBackdrop.remove();
        cleanupMap(); 
      }
    });
    
    // Prevent scrolling on body
    document.body.style.overflow = 'hidden';
    
    // Restore scrolling when popup is closed
    const restoreScrolling = () => {
      document.body.style.overflow = '';
    };
    
    closeButton.addEventListener('click', restoreScrolling);
    popupBackdrop.addEventListener('click', (e) => {
      if (e.target === popupBackdrop) {
        restoreScrolling();
      }
    });

    // Set up contact owner button
    const contactButton = popupContent.querySelector('.contact-button');
    if (contactButton && owner && owner.USERID) {
      contactButton.addEventListener('click', () => {
        window.location.href = `../Messages/Messages.html?userId=${owner.USERID}&name=${encodeURIComponent(ownerName)}`;
      });
    }
    
    // Add a console log when the popup is successfully rendered
    console.log('Popup fully rendered and attached to DOM');
    
    // Add protection from any race conditions by ensuring the popup stays visible
    setTimeout(() => {
      const popup = document.getElementById('animal-detail-popup');
      if (popup) {
        console.log('Popup still exists after timeout');
      } else {
        console.error('Popup was removed unexpectedly');
      }
    }, 2000);
    
  } catch (err) {
    console.error('Error rendering animal popup:', err);
    // Clean up any partial DOM elements
    const popup = document.getElementById('animal-detail-popup');
    if (popup) popup.remove();
    
    // Display fallback popup with error info
    showErrorPopup(details, err);
    
  } finally {
    // Stop the debug observer after a reasonable time
    setTimeout(() => debugObserver.disconnect(), 5000);
  }
}

function cleanupMap() {
  if (currentMapInstance) {
    currentMapInstance = null;
  }
}

//Detect media type 
function detectMediaType(mediaItem) {
  // Check based on mediaType property if available
  if (mediaItem.mediaType) {
    if (mediaItem.mediaType.toLowerCase() === 'video') return 'video';
    if (mediaItem.mediaType.toLowerCase() === 'audio') return 'audio';
    if (mediaItem.mediaType.toLowerCase() === 'photo') return 'image';
  }
  
  // Check based on MIME type
  if (mediaItem.mimeType) {
    if (mediaItem.mimeType.startsWith('video/')) return 'video';
    if (mediaItem.mimeType.startsWith('audio/')) return 'audio';
    if (mediaItem.mimeType.startsWith('image/')) return 'image';
  }
  
  // Check based on URL extension
  if (mediaItem.URL || mediaItem.pipeUrl) {
    const url = mediaItem.URL || mediaItem.pipeUrl;
    const extension = url.split('.').pop().toLowerCase();
    
    // Common video formats
    if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'mkv'].includes(extension)) {
      return 'video';
    }
    
    // Common audio formats
    if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(extension)) {
      return 'audio';
    }
    
    // Common image formats
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
  }
  
 
  return 'image';
}

function formatDate(dateValue) {
  if (!dateValue) return 'N/A';
  
  try {
    // Handle ISO date format (2025-04-24T00:00:00.000Z)
    const date = new Date(dateValue);
    if (!isNaN(date)) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    return dateValue.toString();
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateValue.toString();
  }
}

function formatTime(timeValue) {
  if (!timeValue) return 'N/A';
  
  try {
    // Handle Oracle date/time format: "01-APR-25 02.22.00.000000000 PM"
    const oracleDateTimeRegex = /\d{2}-[A-Z]{3}-\d{2}\s+(\d{2}[.:]\d{2}[.:]\d{2}(?:\.\d+)?)\s+(AM|PM)/i;
    const match = timeValue.toString().match(oracleDateTimeRegex);
    
    if (match) {
      // Extract time and AM/PM
      const timeStr = match[1].replace(/[.:]/g, ':');  
      const ampm = match[2];
      // Format as HH:MM AM/PM by removing seconds
      const timeParts = timeStr.split(':');
      return `${timeParts[0]}:${timeParts[1]} ${ampm}`;
    }
    
    // Check if it's a full timestamp with 'T'
    if (timeValue.includes('T')) {
      const date = new Date(timeValue);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Handle time-only strings
    return timeValue;
  } catch (e) {
    console.error('Error formatting time:', e);
    return timeValue.toString();
  }
}

async function initializeOwnerLocationMap(address) {
  if (!address || address.length === 0) return;
  
  try {
    await loadGoogleMapsScript();
    
    const mapElement = document.getElementById('owner-location-map');
    if (!mapElement) return;
    
    // Get address components
    const addr = address[0];
    const city = addr.CITY || '';
    const state = addr.STATE || '';
    const country = addr.COUNTRY || '';
    const street = addr.STREET || '';
    
    // Create a full address string for geocoding
    const fullAddress = [street, city, state, country].filter(Boolean).join(', ');
    
    // Default to city center if we have at least a city
    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({ address: fullAddress }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        
        // Create map centered on the location
        const mapInstance = new google.maps.Map(mapElement, {
          center: location,
          zoom: 12,
          mapTypeId: 'roadmap',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        });
        
        // Store the map instance for cleanup
        currentMapInstance = mapInstance;
        
        // Add a circle overlay
        const circle = new google.maps.Circle({
          strokeColor: '#4285F4',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#4285F4',
          fillOpacity: 0.2,
          map: mapInstance,
          center: location,
          radius: 5000 // 5km radius
        });
        
        // Add a marker at the center
        new google.maps.Marker({
          position: location,
          map: mapInstance,
          title: city
        });
      } else {
        console.error('Geocode was not successful:', status);
        mapElement.innerHTML = '<p class="map-error">Could not load location map</p>';
      }
    });
  } catch (error) {
    console.error('Error initializing map:', error);
  }
}

class AnimalCard {
  static render(animal) {
    // Check if animal has multimedia and it's an array
    const multimedia = Array.isArray(animal.multimedia) ? animal.multimedia : [];
    const hasMultimedia = multimedia.length > 0;
    
    // Get the first image or use a placeholder
    const primaryImage = hasMultimedia ? multimedia[0].URL : 'path/to/placeholder.jpg';
    
    // Render the card with the image
    return `
      <div class="card" data-id="${animal.ANIMALID}">
        <div class="card-img-container">
          <img src="${primaryImage}" alt="${animal.NAME}" loading="lazy" />
        </div>
        <div class="card-content">
          <h2>${animal.NAME}</h2>
          <p>${animal.BREED} · ${animal.AGE} years</p>
          <p>${animal.SPECIES} · ${animal.GENDER}</p>
        </div>
      </div>
    `;
  }
  
  static renderPopup(animalData) {
    const animal = animalData.animal;
    const multimedia = animalData.multimedia || [];
    
    // Create image slideshow from multimedia array
    const slideshowHtml = multimedia.length > 0 
      ? `<div class="popup-slideshow">
          ${multimedia.map((item, index) => 
            `<div class="slide ${index === 0 ? 'active' : ''}">
              <img src="${item.URL}" alt="${animal.NAME} image ${index + 1}" />
            </div>`
          ).join('')}
          ${multimedia.length > 1 ? `
            <button class="slideshow-nav prev">❮</button>
            <button class="slideshow-nav next">❯</button>
            <div class="slideshow-dots">
              ${multimedia.map((_, index) => 
                `<span class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`
              ).join('')}
            </div>
          ` : ''}
        </div>`
      : `<div class="no-image-placeholder">
          <img src="../assets/pet-placeholder.svg" alt="No image available" />
        </div>`;
    
    // Rest of popup rendering...
  }
}

// Add a simple error popup to show when the main popup fails
function showErrorPopup(details, error) {
  const errorPopup = document.createElement('div');
  errorPopup.className = 'animal-popup-backdrop';
  errorPopup.innerHTML = `
    <div class="animal-popup-content" style="max-width: 500px;">
      <button class="popup-close-button" aria-label="Close">&times;</button>
      <div style="padding: 20px;">
        <h2>Error Displaying Animal</h2>
        <p>There was a problem displaying this animal's details.</p>
        <pre style="background: #f8f8f8; padding: 10px; overflow: auto; max-height: 200px;">
        ${error.toString()}
        </pre>
        <div style="margin-top: 15px;">
          <strong>Animal ID:</strong> ${details.animal?.ANIMALID || 'Unknown'}
          <br>
          <strong>Name:</strong> ${details.animal?.NAME || 'Unknown'}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(errorPopup);
  
  // Add close functionality
  const closeBtn = errorPopup.querySelector('.popup-close-button');
  closeBtn.addEventListener('click', () => errorPopup.remove());
  
  errorPopup.addEventListener('click', (e) => {
    if (e.target === errorPopup) errorPopup.remove();
  });
}

// Add this function at the bottom of the file
function debugPopupClosure() {
  // Capture when the popup is removed from the DOM
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.removedNodes.length > 0) {
        Array.from(mutation.removedNodes).forEach(node => {
          if (node.id === 'animal-detail-popup') {
            console.log('Animal popup was removed from DOM', new Error().stack);
          }
        });
      }
    });
  });

  // Start observing the document body
  observer.observe(document.body, { childList: true });
  
  return observer;
}