package com.backend.repository;

import com.backend.model.FeedingSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedingScheduleRepository extends JpaRepository<FeedingSchedule, Long> {
    
    Optional<FeedingSchedule> findByAnimalAnimalId(Long animalId);
    
    void deleteByAnimalAnimalId(Long animalId);
    
    // Native query to extract VARRAY elements properly (VARCHAR2 values, not timestamps)
    @Query(value = """
        SELECT 
            fs.ID,
            fs.ANIMALID,
            LISTAGG(ft.COLUMN_VALUE, ',') AS FEEDING_TIME_STRING,
            fs.FOOD_TYPE,
            fs.NOTES
        FROM FEEDINGSCHEDULE fs,
             TABLE(fs.FEEDING_TIME) ft
        WHERE fs.ANIMALID = :animalId
        GROUP BY fs.ID, fs.ANIMALID, fs.FOOD_TYPE, fs.NOTES
        """, nativeQuery = true)
    List<Object[]> findFeedingScheduleWithExtractedTimes(@Param("animalId") Long animalId);
} 