package com.customersupport.controller;

import com.customersupport.dto.*;
import com.customersupport.model.TicketCategory;
import com.customersupport.model.TicketStatus;
import com.customersupport.service.MetricsService;
import com.customersupport.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;
    private final MetricsService metricsService;

    public TicketController(TicketService ticketService, MetricsService metricsService) {
        this.ticketService = ticketService;
        this.metricsService = metricsService;
    }

    /** Returns the latest pre-computed dashboard metrics snapshot. */
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> stats() {
        return ResponseEntity.ok(metricsService.getLatest());
    }

    @GetMapping
    public ResponseEntity<Page<TicketSummaryResponse>> list(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ticketService.getAllTickets(status, category, keyword, from, to, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketDetailResponse> get(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
    }

    @PostMapping
    public ResponseEntity<TicketDetailResponse> create(@Valid @RequestBody CreateTicketRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.createTicket(req));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<TicketDetailResponse> reply(
            @PathVariable Long id,
            @Valid @RequestBody ReplyRequest req) {
        // senderType is always AGENT — derived server-side in TicketService, not from request body
        return ResponseEntity.ok(ticketService.replyToTicket(id, req.body()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TicketSummaryResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStatusRequest req) {
        return ResponseEntity.ok(ticketService.updateTicketStatus(id, req));
    }
}
