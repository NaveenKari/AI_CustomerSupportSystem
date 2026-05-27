package com.customersupport.dto;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * DTO returned by GET /api/tickets/stats.
 * Populated from the latest MetricSnapshot row in the DB.
 *
 * byStatus keys        — TicketStatus  enum names: NEW, AI_RESPONDED, PENDING_HUMAN, IN_PROGRESS, RESOLVED
 * byCategory keys      — TicketCategory enum names: BILLING, TECHNICAL, GENERAL_INQUIRY, OTHER
 * byResponseSender keys — SenderType enum names: AGENT, AI, CUSTOMER
 */
public record DashboardStatsResponse(
        long totalTickets,
        long ticketsToday,
        long ticketsThisWeek,
        long openOlderThan24h,
        LocalDateTime computedAt,
        Map<String, Long> byStatus,
        Map<String, Long> byCategory,
        Map<String, Long> byResponseSender
) {}
