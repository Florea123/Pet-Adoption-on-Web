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
  const images = multimedia && multimedia.length > 0 
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
      ${images.length > 0 ? `
        <div class="slideshow-container">
          <img id="slideshow-image" class="popup-animal-image" src="" alt="${animal.NAME || 'Animal'}">
          <button class="slideshow-nav prev" id="prev-button" ${images.length <= 1 ? 'style="display:none"' : ''}>&#10094;</button>
          <button class="slideshow-nav next" id="next-button" ${images.length <= 1 ? 'style="display:none"' : ''}>&#10095;</button>
          <div class="slideshow-dots" id="slideshow-dots">
            ${images.map((_, i) => `<span class="dot" data-index="${i}"></span>`).join('')}
          </div>
        </div>
      ` : `
        <div class="no-image-placeholder">
          <img src="https://via.placeholder.com/400x300?text=No+Images+Available" alt="No images available">
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
  if (images.length > 0) {
    let currentImageIndex = 0;
    const slideshowImage = document.getElementById('slideshow-image');
    const dots = document.querySelectorAll('.dot');
    
    // Function to update image display
    const showImage = (index) => {
      currentImageIndex = index;
      const media = images[index];
      
      // Determine image source
      let imageSource;
      if (media.pipeUrl) {
        window.open(`${API_URL}${media.pipeUrl}`, '_blank');
        imageSource = `${API_URL}${media.pipeUrl}`;
      } else if (media.fileData && media.mimeType) {
        imageSource = `data:${media.mimeType};base64,${media.fileData}`;
      } else if (media.URL) {
        imageSource = media.URL;
      }
      
      // Set image source and update active dot
      slideshowImage.src = imageSource;
      
      
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    };
    

    showImage(0);
    
    // event listeners for navigation
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    
    prevButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent backdrop click
      const newIndex = (currentImageIndex - 1 + images.length) % images.length;
      showImage(newIndex);
    });
    
    nextButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent backdrop click
      const newIndex = (currentImageIndex + 1) % images.length;
      showImage(newIndex);
    });
    
    // Add dot navigation
    dots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const index = parseInt(dot.getAttribute('data-index'));
        showImage(index);
      });
    });
  }
  
  // close functionality
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