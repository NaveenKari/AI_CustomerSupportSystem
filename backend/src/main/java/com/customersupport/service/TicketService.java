package com.customersupport.service;

import com.customersupport.dto.*;
import com.customersupport.model.*;
import com.customersupport.repository.TicketRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@Transactional
public class TicketService {

    private final TicketRepository ticketRepository;
    private final EmailService emailService;

    public TicketService(TicketRepository ticketRepository, EmailService emailService) {
        this.ticketRepository = ticketRepository;
        this.emailService = emailService;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<TicketSummaryResponse> getAllTickets(
            TicketStatus status,
            TicketCategory category,
            String keyword,
            LocalDate from,
            LocalDate to,
            int page,
            int size) {

        Specification<Ticket> spec = Specification.where(null);

        if (status != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), status));
        }
        if (category != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("category"), category));
        }
        if (keyword != null && !keyword.isBlank()) {
            // Use Locale.ROOT to avoid locale-sensitive case folding (e.g., Turkish İ/ı)
            String pattern = "%" + keyword.toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, q, cb) -> cb.or(
                    cb.like(cb.lower(root.get("subject")), pattern),
                    cb.like(cb.lower(root.get("customerEmail")), pattern)
            ));
        }
        if (from != null) {
            LocalDateTime fromStart = from.atStartOfDay();
            spec = spec.and((root, q, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), fromStart));
        }
        if (to != null) {
            LocalDateTime toEnd = to.atTime(23, 59, 59);
            spec = spec.and((root, q, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), toEnd));
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ticketRepository.findAll(spec, pageable).map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public TicketDetailResponse getTicketById(Long id) {
        // Fetch join ensures messages are loaded in the same query — no LazyInitializationException
        Ticket ticket = findOrThrowWithMessages(id);
        return toDetail(ticket);
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    @Transactional
    public TicketDetailResponse createTicket(CreateTicketRequest req) {
        Ticket ticket = new Ticket();
        ticket.setSubject(req.subject());
        ticket.setCustomerEmail(req.customerEmail());
        ticket.setCustomerName(req.customerName());
        ticket.setBody(req.body());
        ticket.setStatus(TicketStatus.NEW);
        ticket.setCategory(req.category() != null ? req.category() : TicketCategory.GENERAL_INQUIRY);

        // Initial message mirrors the ticket body
        TicketMessage initial = new TicketMessage();
        initial.setTicket(ticket);
        initial.setSenderType(SenderType.CUSTOMER);
        initial.setBody(req.body());
        ticket.getMessages().add(initial);

        ticketRepository.save(ticket);
        return toDetail(ticket);
    }

    /**
     * Adds an agent reply to the ticket thread.
     * senderType is always AGENT — derived server-side, never trusted from the caller.
     */
    @Transactional
    public TicketDetailResponse replyToTicket(Long id, String body) {
        // Fetch join avoids LazyInitializationException on messages collection
        Ticket ticket = findOrThrowWithMessages(id);

        TicketMessage msg = new TicketMessage();
        msg.setTicket(ticket);
        msg.setSenderType(SenderType.AGENT);
        msg.setBody(body);
        ticket.getMessages().add(msg);

        // Auto-advance status when an agent replies on a fresh ticket
        if (ticket.getStatus() == TicketStatus.NEW || ticket.getStatus() == TicketStatus.AI_RESPONDED) {
            ticket.setStatus(TicketStatus.IN_PROGRESS);
        }

        ticketRepository.save(ticket);

        // Email the customer — fires after the DB save so the reply is persisted
        // even if email delivery fails. EmailService never throws.
        emailService.sendReplyToCustomer(
                ticket.getCustomerEmail(), ticket.getCustomerName(),
                ticket.getSubject(), body, id);

        return toDetail(ticket);
    }

    /**
     * Updates the ticket's category. Called by AiService after async categorisation.
     */
    @Transactional
    public void updateCategory(Long id, TicketCategory category) {
        Ticket ticket = findOrThrow(id);
        ticket.setCategory(category);
        ticketRepository.save(ticket);
    }

    /**
     * Saves an AI-generated reply and transitions the ticket to AI_RESPONDED.
     * Called by AiService — never by the agent UI.
     */
    @Transactional
    public void aiReplyToTicket(Long id, String body) {
        Ticket ticket = findOrThrowWithMessages(id);

        TicketMessage msg = new TicketMessage();
        msg.setTicket(ticket);
        msg.setSenderType(SenderType.AI);
        msg.setBody(body);
        ticket.getMessages().add(msg);
        ticket.setStatus(TicketStatus.AI_RESPONDED);

        ticketRepository.save(ticket);
    }

    /**
     * Appends a customer reply (inbound email thread) to an existing ticket.
     * Status transitions:
     *   AI_RESPONDED → PENDING_HUMAN  (customer replied to AI, needs human attention)
     *   RESOLVED     → PENDING_HUMAN  (customer reopened a closed ticket)
     *   all others   → unchanged      (IN_PROGRESS / NEW / PENDING_HUMAN stay as-is)
     */
    @Transactional
    public void addCustomerReply(Long id, String body) {
        Ticket ticket = findOrThrowWithMessages(id);

        TicketMessage msg = new TicketMessage();
        msg.setTicket(ticket);
        msg.setSenderType(SenderType.CUSTOMER);
        msg.setBody(body);
        ticket.getMessages().add(msg);

        if (ticket.getStatus() == TicketStatus.AI_RESPONDED
                || ticket.getStatus() == TicketStatus.RESOLVED) {
            ticket.setStatus(TicketStatus.PENDING_HUMAN);
        }

        ticketRepository.save(ticket);
    }

    @Transactional
    public TicketSummaryResponse updateTicketStatus(Long id, UpdateStatusRequest req) {
        Ticket ticket = findOrThrow(id);
        ticket.setStatus(req.status());
        // saveAndFlush forces the flush so @PreUpdate fires before we call toSummary,
        // ensuring the returned updatedAt reflects the value actually written to the DB.
        Ticket saved = ticketRepository.saveAndFlush(ticket);
        return toSummary(saved);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Loads the ticket without messages — use for list/status-update paths. */
    private Ticket findOrThrow(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
    }

    /** Loads the ticket WITH messages in a single fetch-join query — use when thread is needed. */
    private Ticket findOrThrowWithMessages(Long id) {
        return ticketRepository.findByIdWithMessages(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
    }

    private TicketSummaryResponse toSummary(Ticket t) {
        return new TicketSummaryResponse(
                t.getId(), t.getSubject(), t.getCustomerEmail(),
                t.getCustomerName(), t.getStatus(), t.getCategory(),
                t.getCreatedAt(), t.getUpdatedAt()
        );
    }

    private TicketDetailResponse toDetail(Ticket t) {
        List<TicketMessageResponse> msgs = t.getMessages().stream()
                .map(m -> new TicketMessageResponse(m.getId(), m.getSenderType(), m.getBody(), m.getSentAt()))
                .toList();
        return new TicketDetailResponse(
                t.getId(), t.getSubject(), t.getCustomerEmail(),
                t.getCustomerName(), t.getBody(), t.getStatus(), t.getCategory(),
                t.getCreatedAt(), t.getUpdatedAt(), msgs
        );
    }
}
