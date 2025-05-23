package com.backend.service;

import com.backend.dto.*;
import com.backend.model.*;
import com.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
@Transactional
public class AnimalService {
    
    private final AnimalRepository animalRepository;
    private final UserService userService;
    private final MedicalHistoryRepository medicalHistoryRepository;
    private final FeedingScheduleRepository feedingScheduleRepository;
    private final RelationsRepository relationsRepository;
    private final MultiMediaRepository multiMediaRepository;
    
    public AnimalResponse createAnimal(Long userId, AnimalRequest request) {
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        
        Animal animal = new Animal();
        animal.setName(request.getName());
        animal.setBreed(request.getBreed());
        animal.setSpecies(request.getSpecies());
        animal.setAge(request.getAge());
        animal.setGender(request.getGender());
        animal.setUser(userOpt.get());
        animal.setViews(0);
        
        Animal savedAnimal = animalRepository.save(animal);
        return convertToAnimalResponse(savedAnimal);
    }
    
    public List<AnimalResponse> getAllAnimals() {
        return animalRepository.findAll()
                .stream()
                .map(this::convertToAnimalResponse)
                .collect(Collectors.toList());
    }
    
    public Optional<AnimalResponse> getAnimalById(Long animalId) {
        return animalRepository.findById(animalId)
                .map(this::convertToAnimalResponse);
    }
    
    public Optional<AnimalDetailResponse> getAnimalDetailById(Long animalId) {
        Optional<Animal> animalOpt = animalRepository.findById(animalId);
        if (animalOpt.isEmpty()) {
            return Optional.empty();
        }
        
        Animal animal = animalOpt.get();
        
        // Get all related data
        List<MultiMedia> multimedia = multiMediaRepository.findByAnimalAnimalId(animalId);
        List<MedicalHistory> medicalHistories = medicalHistoryRepository.findByAnimalAnimalId(animalId);
        
        // Use custom query to extract VARRAY data properly
        List<Object[]> feedingScheduleData = feedingScheduleRepository.findFeedingScheduleWithExtractedTimes(animalId);
        Optional<Relations> relations = relationsRepository.findByAnimalAnimalId(animalId);
        
        // Convert to DTOs
        AnimalDetailResponse response = new AnimalDetailResponse();
        response.setAnimal(convertToAnimalResponse(animal));
        
        response.setMultimedia(multimedia.stream()
                .map(this::convertToMultiMediaResponse)
                .collect(Collectors.toList()));
        
        response.setMedicalHistory(medicalHistories.stream()
                .map(this::convertToMedicalHistoryResponse)
                .collect(Collectors.toList()));
        
        // Convert feeding schedule using extracted VARRAY data
        if (!feedingScheduleData.isEmpty()) {
            Object[] data = feedingScheduleData.get(0);
            FeedingScheduleResponse feedingResponse = new FeedingScheduleResponse();
            feedingResponse.setId(((Number) data[0]).longValue());
            
            // Parse the concatenated feeding times and extract just the time portion
            String feedingTimesString = (String) data[2];
            if (feedingTimesString != null && !feedingTimesString.isEmpty()) {
                List<String> feedingTimes = Arrays.stream(feedingTimesString.split(","))
                        .map(String::trim)
                        .map(this::extractTimeFromTimestamp)
                        .filter(time -> !time.isEmpty())
                        .collect(Collectors.toList());
                feedingResponse.setFeedingTime(feedingTimes);
            } else {
                feedingResponse.setFeedingTime(List.of());
            }
            
            feedingResponse.setFoodType((String) data[3]);
            feedingResponse.setNotes((String) data[4]);
            
            response.setFeedingSchedule(List.of(feedingResponse));
        } else {
            response.setFeedingSchedule(List.of());
        }
        
        // Convert relations to List
        if (relations.isPresent()) {
            List<RelationsResponse> relationsList = List.of(convertToRelationsResponse(relations.get()));
            response.setRelations(relationsList);
        } else {
            response.setRelations(List.of());
        }
        
        // Owner and address info
        if (animal.getUser() != null) {
            response.setOwner(convertToUserResponse(animal.getUser()));
            if (animal.getUser().getAddress() != null) {
                // Convert address to List
                List<AddressResponse> addressList = List.of(convertToAddressResponse(animal.getUser().getAddress()));
                response.setAddress(addressList);
            } else {
                response.setAddress(List.of());
            }
        }
        
        return Optional.of(response);
    }
    
    public List<AnimalResponse> getAnimalsBySpecies(String species) {
        return animalRepository.findBySpecies(species)
                .stream()
                .map(this::convertToAnimalResponse)
                .collect(Collectors.toList());
    }
    
    public void incrementViews(Long animalId) {
        animalRepository.incrementViews(animalId);
    }
    
    public void deleteAnimal(Long animalId) {
        if (!animalRepository.existsById(animalId)) {
            throw new RuntimeException("Animal not found");
        }
        animalRepository.deleteById(animalId);
    }
    
    public List<AnimalResponse> getTopAnimalsByUserCity(Long userId) {
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty() || userOpt.get().getAddress() == null) {
            return List.of();
        }
        
        String city = userOpt.get().getAddress().getCity();
        return animalRepository.findTopAnimalsByCity(city)
                .stream()
                .map(this::convertToAnimalResponse)
                .collect(Collectors.toList());
    }
    
    public List<Object[]> getPopularBreedsBySpecies(String species) {
        return animalRepository.findPopularBreedsBySpecies(species);
    }
    
    private AnimalResponse convertToAnimalResponse(Animal animal) {
        AnimalResponse response = new AnimalResponse();
        response.setAnimalId(animal.getAnimalId());
        response.setName(animal.getName());
        response.setBreed(animal.getBreed());
        response.setSpecies(animal.getSpecies());
        response.setAge(animal.getAge());
        response.setViews(animal.getViews());
        response.setGender(animal.getGender());
        response.setCreatedAt(animal.getCreatedAt());
        
        // Set userId field that frontend expects
        if (animal.getUser() != null) {
            response.setUserId(animal.getUser().getUserId());
            response.setUser(convertToUserResponse(animal.getUser()));
        }
        
        // Convert multimedia (if needed)
        if (animal.getMultimedia() != null) {
            List<MultiMediaResponse> multimediaResponses = animal.getMultimedia().stream()
                    .map(this::convertToMultiMediaResponse)
                    .collect(Collectors.toList());
            response.setMultimedia(multimediaResponses);
        }
        
        return response;
    }
    
    private UserResponse convertToUserResponse(User user) {
        UserResponse userResponse = new UserResponse();
        userResponse.setUserId(user.getUserId());
        userResponse.setFirstName(user.getFirstName());
        userResponse.setLastName(user.getLastName());
        userResponse.setEmail(user.getEmail());
        userResponse.setPhone(user.getPhone());
        userResponse.setCreatedAt(user.getCreatedAt());
        return userResponse;
    }
    
    private AddressResponse convertToAddressResponse(Address address) {
        AddressResponse response = new AddressResponse();
        response.setAddressId(address.getAddressId());
        response.setStreet(address.getStreet());
        response.setCity(address.getCity());
        response.setState(address.getState());
        response.setZipCode(address.getZipCode());
        response.setCountry(address.getCountry());
        return response;
    }
    
    private MultiMediaResponse convertToMultiMediaResponse(MultiMedia multiMedia) {
        MultiMediaResponse response = new MultiMediaResponse();
        response.setId(multiMedia.getId());
        response.setMedia(multiMedia.getMedia());
        response.setUrl(multiMedia.getUrl());
        response.setDescription(multiMedia.getDescription());
        response.setUploadDate(multiMedia.getUploadDate());
        return response;
    }
    
    private MedicalHistoryResponse convertToMedicalHistoryResponse(MedicalHistory medicalHistory) {
        MedicalHistoryResponse response = new MedicalHistoryResponse();
        response.setId(medicalHistory.getId());
        response.setVetNumber(medicalHistory.getVetNumber());
        response.setRecordDate(medicalHistory.getRecordDate());
        response.setDescription(medicalHistory.getDescription());
        response.setFirstAidNoted(medicalHistory.getFirstAidNoted());
        return response;
    }
    
    private FeedingScheduleResponse convertToFeedingScheduleResponse(FeedingSchedule feedingSchedule) {
        FeedingScheduleResponse response = new FeedingScheduleResponse();
        response.setId(feedingSchedule.getId());
        response.setFeedingTime(feedingSchedule.getFeedingTimes());
        response.setFoodType(feedingSchedule.getFoodType());
        response.setNotes(feedingSchedule.getNotes());
        return response;
    }
    
    private RelationsResponse convertToRelationsResponse(Relations relations) {
        RelationsResponse response = new RelationsResponse();
        response.setId(relations.getId());
        response.setFriendWith(relations.getFriendWith());
        return response;
    }
    
    private String extractTimeFromTimestamp(String timestampOrTime) {
        if (timestampOrTime == null || timestampOrTime.isEmpty()) {
            return "";
        }
        
        // If it's already in HH:MM:SS format, return as is
        if (timestampOrTime.matches("\\d{1,2}:\\d{2}:\\d{2}")) {
            return timestampOrTime;
        }
        
        // Handle Oracle timestamp format: "01/05/25 07:30:00.000000000"
        if (timestampOrTime.contains(" ")) {
            String[] parts = timestampOrTime.split(" ");
            if (parts.length > 1) {
                String timePart = parts[1];
                // Extract HH:MM:SS from HH:MM:SS.nnnnnnnnn
                if (timePart.contains(".")) {
                    timePart = timePart.substring(0, timePart.indexOf("."));
                }
                if (timePart.matches("\\d{1,2}:\\d{2}:\\d{2}")) {
                    return timePart;
                }
            }
        }
        
        // Try to extract time pattern from any format
        String timePattern = timestampOrTime.replaceAll(".*?(\\d{1,2}:\\d{2}:\\d{2}).*", "$1");
        if (timePattern.matches("\\d{1,2}:\\d{2}:\\d{2}")) {
            return timePattern;
        }
        
        return timestampOrTime; // Return as is if no pattern found
    }
} 