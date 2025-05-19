import { redirectIfLoggedIn } from '../utils/authUtils.js';
import config from '../config.js';

const API_URL = config.SERVICES.USER_SERVICE;
const REGISTER_ENDPOINT = config.ENDPOINTS.USER.REGISTER;


document.addEventListener('DOMContentLoaded', function() {
  // If user is already logged in, redirect to home page
  if (redirectIfLoggedIn()) return;
});


document.getElementById('signUpForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    phone: document.getElementById('phone').value,
    address: {
      street: document.getElementById('street').value,
      city: document.getElementById('city').value,
      state: document.getElementById('state').value,
      zipCode: document.getElementById('zipCode').value,
      country: document.getElementById('country').value,
    },
  };

  try {
    const response = await fetch(`${API_URL}${REGISTER_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      alert('Sign Up Successful! Redirecting to login page...');
      window.location.href = 'SignIn.html';
    } else {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      alert(`Error: ${error.message}`);
    }
  } catch (err) {
    console.error('Error during sign-up:', err);
    alert('An error occurred. Please try again.');
  }
});