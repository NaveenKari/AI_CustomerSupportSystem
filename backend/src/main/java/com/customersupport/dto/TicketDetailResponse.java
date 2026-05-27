package com.customersupport.dto;

import com.customersupport.model.TicketCategory;
import com.customersupport.model.TicketStatus;

import java.time.LocalDateTime;
import java.util.List;

public record TicketDetailResponse(
        Long id,
        String subject,
        String customerEmail,
        String customerName,
        String body,
        TicketStatus status,
        TicketCategory category,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<TicketMessageResponse> messages
) {}
