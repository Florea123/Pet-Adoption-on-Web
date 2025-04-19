/**
 * Shows a loading spinner overlay on the page
 * @param {string} message - Optional message to show with the spinner
 * @returns {HTMLElement} - The loading spinner element
 */
export function showLoading(message = "Loading...") {
    // Check if a spinner already exists
    const existingSpinner = document.getElementById("global-loading-spinner");
    if (existingSpinner) {
      return existingSpinner;
    }
    
    // Create spinner container
    const spinnerOverlay = document.createElement("div");
    spinnerOverlay.id = "global-loading-spinner";
    spinnerOverlay.className = "loading-overlay";
    
    // Create spinner
    const spinner = document.createElement("div");
    spinner.className = "loading-spinner";
    
    // Add message if provided
    const messageElement = document.createElement("div");
    messageElement.className = "loading-message";
    messageElement.textContent = message;
    
    // Add elements to DOM
    spinnerOverlay.appendChild(spinner);
    spinnerOverlay.appendChild(messageElement);
    document.body.appendChild(spinnerOverlay);
    
    return spinnerOverlay;
  }
  
  /**
   * Hides the loading spinner
   */
  export function hideLoading() {
    const spinner = document.getElementById("global-loading-spinner");
    if (spinner) {
      spinner.classList.add("fade-out");
      setTimeout(() => {
        if (spinner.parentNode) {
          spinner.parentNode.removeChild(spinner);
        }
      }, 300); // Match this with CSS transition duration
    }
  }