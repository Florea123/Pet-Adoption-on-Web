package com.backend.controller;

import com.backend.dto.*;
import com.backend.service.AnimalService;
import com.backend.service.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AnimalController {
    
    private final AnimalService animalService;
    private final JwtService jwtService;
    
    // Node.js: GET /animals/all -> with auth
    @GetMapping("/animals/all")
    public ResponseEntity<?> getAllAnimals(HttpServletRequest httpRequest) {
        try {
            Long userId = extractUserIdFromToken(httpRequest);
            if (userId == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Authentication required");
                return ResponseEntity.status(401).body(error);
            }
            
            List<AnimalResponse> animals = animalService.getAllAnimals();
            return ResponseEntity.ok(animals);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Node.js: POST /animals/details -> with auth (Enhanced with full details)
    @PostMapping("/animals/details")
    public ResponseEntity<?> getAnimalDetailsById(@RequestBody Map<String, Object> request, HttpServletRequest httpRequest) {
        try {
            Long userId = extractUserIdFromToken(httpRequest);
            if (userId == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Authentication required");
                return ResponseEntity.status(401).body(error);
            }
            
            Long animalId = Long.valueOf(request.get("animalId").toString());
            
            // Increment views first
            animalService.incrementViews(animalId);
            
            // Get detailed animal information
            Optional<AnimalDetailResponse> animalDetail = animalService.getAnimalDetailById(animalId);
            if (animalDetail.isPresent()) {
                return ResponseEntity.ok(animalDetail.get());
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Animal not found");
                return ResponseEntity.status(404).body(error);
            }
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Node.js: POST /animals/species -> with auth (Enhanced with popular breeds)
    @PostMapping("/animals/species")
    public ResponseEntity<?> getAnimalsBySpecies(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        try {
            Long userId = extractUserIdFromToken(httpRequest);
            if (userId == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Authentication required");
                return ResponseEntity.status(401).body(error);
            }
            
            String species = request.get("species");
            if (species == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Species is required");
                return ResponseEntity.badRequest().body(error);
            }
            
            List<AnimalResponse> animals = animalService.getAnimalsBySpecies(species);
            List<Object[]> popularBreeds = animalService.getPopularBreedsBySpecies(species);
            
            Map<String, Object> response = new HashMap<>();
            response.put("animals", animals);
            response.put("popularBreeds", popularBreeds);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Node.js: POST /animals/create -> with auth
    @PostMapping("/animals/create")
    public ResponseEntity<?> createAnimal(@RequestBody AnimalRequest request, HttpServletRequest httpRequest) {
        try {
            Long userId = extractUserIdFromToken(httpRequest);
            if (userId == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Authentication required");
                return ResponseEntity.status(401).body(error);
            }

            AnimalResponse animal = animalService.createAnimal(userId, request);
            return ResponseEntity.ok(animal);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // Node.js: DELETE /animals/delete -> with auth
    @DeleteMapping("/animals/delete")
    public ResponseEntity<?> deleteAnimal(@RequestBody Map<String, Object> request, HttpServletRequest httpRequest) {
        try {
            Long userId = extractUserIdFromToken(httpRequest);
            if (userId == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Authentication required");
                return ResponseEntity.status(401).body(error);
            }
            
            Long animalId = Long.valueOf(request.get("animalId").toString());
            
            animalService.deleteAnimal(animalId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Animal deleted successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    // Node.js: GET /animals/top-by-city -> with auth
    @GetMapping("/animals/top-by-city")
    public ResponseEntity<?> getTopAnimalsByCity(@RequestParam Long userId, HttpServletRequest httpRequest) {
        try {
            // Check if user is authenticated
            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Access denied. Please log in.");
                return ResponseEntity.status(403).body(error);
            }

            String token = authHeader.substring(7);
            Long tokenUserId = jwtService.extractUserId(token);
            if (tokenUserId == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Invalid token");
                return ResponseEntity.status(401).body(error);
            }

            List<AnimalResponse> animals = animalService.getTopAnimalsByUserCity(userId);
            return ResponseEntity.ok(animals);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal Server Error");
            return ResponseEntity.status(500).body(error);
        }
    }
    
    private Long extractUserIdFromToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                return jwtService.extractUserId(token);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }
} 