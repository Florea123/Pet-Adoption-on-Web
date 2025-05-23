package com.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "RELATIONS")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Relations {
    
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "seq_relations")
    @SequenceGenerator(name = "seq_relations", sequenceName = "seq_relations", allocationSize = 1)
    @Column(name = "ID")
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "ANIMALID", referencedColumnName = "ANIMALID")
    private Animal animal;
    
    @Column(name = "FRIENDWITH", length = 4000)
    private String friendWith;
} 