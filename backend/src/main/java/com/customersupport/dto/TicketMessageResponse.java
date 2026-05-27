package com.customersupport.dto;

import com.customersupport.model.SenderType;

import java.time.LocalDateTime;

public record TicketMessageResponse(
        Long id,
        SenderType senderType,
        String body,
        LocalDateTime sentAt
) {}
