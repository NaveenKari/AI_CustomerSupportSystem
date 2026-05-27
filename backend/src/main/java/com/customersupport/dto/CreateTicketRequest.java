package com.customersupport.dto;

import com.customersupport.model.TicketCategory;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateTicketRequest(
        @NotBlank @Size(max = 500) String subject,
        @NotBlank @Email @Size(max = 254) String customerEmail,
        @NotBlank @Size(max = 200) String customerName,
        @NotBlank @Size(max = 50_000) String body,
        TicketCategory category   // nullable — defaults to GENERAL_INQUIRY in service
) {}
