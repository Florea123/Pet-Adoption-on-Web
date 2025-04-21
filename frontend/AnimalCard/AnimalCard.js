const API_URL = 'http://localhost:3000';

export function showAnimalDetailsPopup(details) {
  // Remove any existing popups
  const existingPopup = document.getElementById('animal-detail-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Extract data
  console.log('Animal details:', details);
  const { animal, multimedia, owner, address, feedingSchedule, medicalHistory, relations } = details;
  
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
  
  // Generate relations HTML - update to handle simple text values
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
      </div>
      
      <button class="contact-button">Contact Owner</button>
    </div>
  `;
  
  // Append content to backdrop
  popupBackdrop.appendChild(popupContent);
  document.body.appendChild(popupBackdrop);
  
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
        mediaSource = `${API_URL}${mediaItem.pipeUrl}`;
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
  });
  
  // Close when clicking outside
  popupBackdrop.addEventListener('click', (e) => {
    if (e.target === popupBackdrop) {
      popupBackdrop.remove();
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