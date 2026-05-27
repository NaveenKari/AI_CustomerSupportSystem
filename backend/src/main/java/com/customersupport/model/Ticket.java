package com.customersupport.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tickets", indexes = {
        @Index(name = "idx_tickets_status",         columnList = "status"),
        @Index(name = "idx_tickets_category",       columnList = "category"),
        @Index(name = "idx_tickets_created_at",     columnList = "createdAt"),
        @Index(name = "idx_tickets_customer_email", columnList = "customerEmail")
})
@Getter
@Setter
@NoArgsConstructor
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String subject;

    @Column(nullable = false, length = 254)   // RFC 5321 max email length
    private String customerEmail;

    @Column(nullable = false, length = 200)
    private String customerName;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketStatus status = TicketStatus.NEW;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketCategory category = TicketCategory.GENERAL_INQUIRY;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sentAt ASC")
    private List<TicketMessage> messages = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
