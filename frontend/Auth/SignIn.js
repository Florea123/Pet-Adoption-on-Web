import { decodeToken } from "./Auth.js"; 
import user from "../models/User.js";

const API_URL = "http://localhost:3000";

document
  .getElementById("signInForm")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Login successful, received token");
        
        // Store the token in localStorage
        localStorage.setItem("Token", data.token);
        console.log("Token saved to localStorage");

        // Decode the token and save user details
        const decoded = decodeToken();
        if (decoded) {
          console.log("Token decoded successfully:", decoded);
          user.setUser(decoded);
          console.log("User saved to localStorage:", user.getUser());
        } else {
          console.error("Failed to decode token");
        }

        // Redirect to the home page
        window.location.href = "../Home/Home.html";
        
      } else {
        const error = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        alert(`Error: ${error.message}`);
      }
    } catch (err) {
      console.error("Error during sign-in:", err);
      alert("An error occurred. Please try again.");
    }
  });


const imageFolder = './images/';
const imageFiles = ['Imagine1.webp', 'Imagine2.jpg', 'Imagine3.webp','Imagine4.jpg']; // Numele fișierelor din folder
const imageSlider = document.getElementById('imageSlider');

imageFiles.forEach((fileName, index) => {
  const img = document.createElement('img');
  img.src = `${imageFolder}${fileName}`;
  img.alt = `Image ${index + 1}`;
  img.onerror = () => console.error(`Image not found: ${img.src}`);
  if (index === 0) img.classList.add('active'); // Prima imagine este activă
  imageSlider.appendChild(img);
});

// Script pentru schimbarea imaginilor
const images = document.querySelectorAll('.photo-section img');
let currentIndex = 0;

setInterval(() => {
  images[currentIndex].classList.remove('active');
  currentIndex = (currentIndex + 1) % images.length;
  images[currentIndex].classList.add('active');
}, 15000); // Interval de 15 secunde