package com.customersupport.dto;

import com.customersupport.model.TicketCategory;
import com.customersupport.model.TicketStatus;

import java.time.LocalDateTime;

public record TicketSummaryResponse(
        Long id,
        String subject,
        String customerEmail,
        String customerName,
        TicketStatus status,
        TicketCategory category,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
