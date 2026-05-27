package com.customersupport.controller;

import com.customersupport.dto.*;
import com.customersupport.model.TicketCategory;
import com.customersupport.model.TicketStatus;
import com.customersupport.service.TicketService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @GetMapping
    public ResponseEntity<List<TicketSummaryResponse>> list(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) TicketCategory category,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(ticketService.getAllTickets(status, category, keyword, from, to));
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
