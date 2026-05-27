package com.customersupport.dto;

import com.customersupport.model.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(
        @NotNull TicketStatus status
) {}
