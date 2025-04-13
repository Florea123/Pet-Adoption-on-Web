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
        // Store the token in localStorage
        localStorage.setItem("Token", data.token);

        // Decode the token and save user details
        const decoded = decodeToken();
        if (decoded) {
          user.setUser(decoded);
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