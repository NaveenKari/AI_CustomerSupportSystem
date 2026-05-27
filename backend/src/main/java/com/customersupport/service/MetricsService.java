package com.customersupport.service;

import com.customersupport.dto.DashboardStatsResponse;
import com.customersupport.model.MetricSnapshot;
import com.customersupport.model.SenderType;
import com.customersupport.model.TicketCategory;
import com.customersupport.model.TicketStatus;
import com.customersupport.repository.MetricSnapshotRepository;
import com.customersupport.repository.TicketMessageRepository;
import com.customersupport.repository.TicketRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Computes dashboard metrics on a fixed hourly schedule and persists each run
 * as a new MetricSnapshot row. Old rows (> 7 days) are pruned in the same
 * transaction to keep the table bounded at ~168 rows.
 *
 * The /api/tickets/stats endpoint reads the latest snapshot — a cheap single-row
 * lookup rather than live aggregations on every request.
 */
@Service
public class MetricsService {

    private static final Logger log = LoggerFactory.getLogger(MetricsService.class);

    private final TicketRepository ticketRepo;
    private final TicketMessageRepository messageRepo;
    private final MetricSnapshotRepository snapshotRepo;

    public MetricsService(TicketRepository ticketRepo,
                          TicketMessageRepository messageRepo,
                          MetricSnapshotRepository snapshotRepo) {
        this.ticketRepo = ticketRepo;
        this.messageRepo = messageRepo;
        this.snapshotRepo = snapshotRepo;
    }

    // ── Scheduler ──────────────────────────────────────────────────────────────

    /**
     * Runs immediately on startup (initialDelay=0) so the first API request never
     * hits a missing-snapshot error, then repeats every hour (3,600,000 ms).
     */
    @Scheduled(initialDelay = 0, fixedRate = 3_600_000)
    @Transactional
    public void computeAndSave() {
        log.info("MetricsService: computing dashboard snapshot");

        MetricSnapshot snap = new MetricSnapshot();
        snap.setComputedAt(LocalDateTime.now());

        // ── Totals ────────────────────────────────────────────────────────────
        snap.setTotalTickets(ticketRepo.count());

        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        snap.setTicketsToday(ticketRepo.countCreatedAfter(todayStart));

        LocalDateTime weekStart = LocalDate.now().with(DayOfWeek.MONDAY).atStartOfDay();
        snap.setTicketsThisWeek(ticketRepo.countCreatedAfter(weekStart));

        LocalDateTime cutoff24h = LocalDateTime.now().minusHours(24);
        snap.setOpenOlderThan24h(ticketRepo.countOpenOlderThan(cutoff24h));

        // ── By status ─────────────────────────────────────────────────────────
        ticketRepo.countByStatus().forEach(row -> {
            TicketStatus status = (TicketStatus) row[0];
            long count = (Long) row[1];
            switch (status) {
                case NEW            -> snap.setStatusNew(count);
                case AI_RESPONDED   -> snap.setStatusAiResponded(count);
                case PENDING_HUMAN  -> snap.setStatusPendingHuman(count);
                case IN_PROGRESS    -> snap.setStatusInProgress(count);
                case RESOLVED       -> snap.setStatusResolved(count);
            }
        });

        // ── By category ───────────────────────────────────────────────────────
        ticketRepo.countByCategory().forEach(row -> {
            TicketCategory category = (TicketCategory) row[0];
            long count = (Long) row[1];
            switch (category) {
                case BILLING         -> snap.setCategoryBilling(count);
                case TECHNICAL       -> snap.setCategoryTechnical(count);
                case GENERAL_INQUIRY -> snap.setCategoryGeneralInquiry(count);
                case OTHER           -> snap.setCategoryOther(count);
            }
        });

        // ── By response sender (AI vs human vs customer) ──────────────────────
        messageRepo.countBySenderType().forEach(row -> {
            SenderType sender = (SenderType) row[0];
            long count = (Long) row[1];
            switch (sender) {
                case AGENT    -> snap.setResponsesByAgent(count);
                case AI       -> snap.setResponsesByAi(count);
                case CUSTOMER -> snap.setResponsesByCustomer(count);
            }
        });

        snapshotRepo.save(snap);

        // ── Prune rows older than 7 days (~168 rows max) ──────────────────────
        LocalDateTime pruneCutoff = LocalDateTime.now().minusDays(7);
        snapshotRepo.deleteOlderThan(pruneCutoff);

        log.info("MetricsService: snapshot saved (total={}, today={}, thisWeek={}, backlog={})",
                snap.getTotalTickets(), snap.getTicketsToday(),
                snap.getTicketsThisWeek(), snap.getOpenOlderThan24h());
    }

    // ── Query ──────────────────────────────────────────────────────────────────

    /**
     * Returns the most recently computed snapshot as a DTO.
     * Throws 503 if no snapshot exists yet (shouldn't happen after startup).
     */
    @Transactional(readOnly = true)
    public DashboardStatsResponse getLatest() {
        MetricSnapshot snap = snapshotRepo.findTopByOrderByComputedAtDesc()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Dashboard metrics are not yet available — please retry in a moment"));
        return toResponse(snap);
    }

    // ── Mapping ────────────────────────────────────────────────────────────────

    private DashboardStatsResponse toResponse(MetricSnapshot s) {
        // Preserve insertion order so the frontend receives a stable key sequence
        Map<String, Long> byStatus = new LinkedHashMap<>();
        byStatus.put("NEW",           s.getStatusNew());
        byStatus.put("AI_RESPONDED",  s.getStatusAiResponded());
        byStatus.put("PENDING_HUMAN", s.getStatusPendingHuman());
        byStatus.put("IN_PROGRESS",   s.getStatusInProgress());
        byStatus.put("RESOLVED",      s.getStatusResolved());

        Map<String, Long> byCategory = new LinkedHashMap<>();
        byCategory.put("BILLING",         s.getCategoryBilling());
        byCategory.put("TECHNICAL",       s.getCategoryTechnical());
        byCategory.put("GENERAL_INQUIRY", s.getCategoryGeneralInquiry());
        byCategory.put("OTHER",           s.getCategoryOther());

        // Excludes CUSTOMER messages — shows only who responded (agent vs AI)
        // Null-safe: older snapshot rows created before this column existed default to 0
        Map<String, Long> byResponseSender = new LinkedHashMap<>();
        byResponseSender.put("AGENT",    s.getResponsesByAgent()    != null ? s.getResponsesByAgent()    : 0L);
        byResponseSender.put("AI",       s.getResponsesByAi()       != null ? s.getResponsesByAi()       : 0L);
        byResponseSender.put("CUSTOMER", s.getResponsesByCustomer() != null ? s.getResponsesByCustomer() : 0L);

        return new DashboardStatsResponse(
                s.getTotalTickets(),
                s.getTicketsToday(),
                s.getTicketsThisWeek(),
                s.getOpenOlderThan24h(),
                s.getComputedAt(),
                byStatus,
                byCategory,
                byResponseSender
        );
    }
}
