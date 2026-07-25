package com.customersupport.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * One row per hourly scheduler run. Stores pre-computed dashboard metrics so
 * the dashboard endpoint is a cheap single-row read instead of live aggregations.
 *
 * Retention: the scheduler keeps only the last 7 days (~168 rows) and prunes
 * older rows in the same transaction after each insert.
 */
@Entity
@Table(name = "metric_snapshots",
       indexes = @Index(name = "idx_metric_snapshots_computed_at", columnList = "computedAt"))
public class MetricSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime computedAt;

    // ── Totals ────────────────────────────────────────────────────────────────
    private long totalTickets;
    private long ticketsToday;
    private long ticketsThisWeek;
    private long openOlderThan24h;

    // ── By status (one column per TicketStatus value) ─────────────────────────
    private long statusNew;
    private long statusAiResponded;
    private long statusPendingHuman;
    private long statusInProgress;
    private long statusResolved;

    // ── By category (one column per TicketCategory value) ─────────────────────
    private long categoryBilling;
    private long categoryTechnical;
    private long categoryGeneralInquiry;
    private long categoryOther;

    // ── Response sender breakdown (AGENT = human, AI = bot, CUSTOMER = inbound) ─
    // Nullable Long (not primitive) so Hibernate can ALTER TABLE ADD COLUMN without NOT NULL,
    // which allows adding these columns to a table that already has rows.
    private Long responsesByAgent;
    private Long responsesByAi;
    private Long responsesByCustomer;

    // ── Getters & Setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }

    public LocalDateTime getComputedAt() { return computedAt; }
    public void setComputedAt(LocalDateTime computedAt) { this.computedAt = computedAt; }

    public long getTotalTickets() { return totalTickets; }
    public void setTotalTickets(long totalTickets) { this.totalTickets = totalTickets; }

    public long getTicketsToday() { return ticketsToday; }
    public void setTicketsToday(long ticketsToday) { this.ticketsToday = ticketsToday; }

    public long getTicketsThisWeek() { return ticketsThisWeek; }
    public void setTicketsThisWeek(long ticketsThisWeek) { this.ticketsThisWeek = ticketsThisWeek; }

    public long getOpenOlderThan24h() { return openOlderThan24h; }
    public void setOpenOlderThan24h(long openOlderThan24h) { this.openOlderThan24h = openOlderThan24h; }

    public long getStatusNew() { return statusNew; }
    public void setStatusNew(long statusNew) { this.statusNew = statusNew; }

    public long getStatusAiResponded() { return statusAiResponded; }
    public void setStatusAiResponded(long statusAiResponded) { this.statusAiResponded = statusAiResponded; }

    public long getStatusPendingHuman() { return statusPendingHuman; }
    public void setStatusPendingHuman(long statusPendingHuman) { this.statusPendingHuman = statusPendingHuman; }

    public long getStatusInProgress() { return statusInProgress; }
    public void setStatusInProgress(long statusInProgress) { this.statusInProgress = statusInProgress; }

    public long getStatusResolved() { return statusResolved; }
    public void setStatusResolved(long statusResolved) { this.statusResolved = statusResolved; }

    public long getCategoryBilling() { return categoryBilling; }
    public void setCategoryBilling(long categoryBilling) { this.categoryBilling = categoryBilling; }

    public long getCategoryTechnical() { return categoryTechnical; }
    public void setCategoryTechnical(long categoryTechnical) { this.categoryTechnical = categoryTechnical; }

    public long getCategoryGeneralInquiry() { return categoryGeneralInquiry; }
    public void setCategoryGeneralInquiry(long categoryGeneralInquiry) { this.categoryGeneralInquiry = categoryGeneralInquiry; }

    public long getCategoryOther() { return categoryOther; }
    public void setCategoryOther(long categoryOther) { this.categoryOther = categoryOther; }

    public Long getResponsesByAgent() { return responsesByAgent; }
    public void setResponsesByAgent(Long responsesByAgent) { this.responsesByAgent = responsesByAgent; }

    public Long getResponsesByAi() { return responsesByAi; }
    public void setResponsesByAi(Long responsesByAi) { this.responsesByAi = responsesByAi; }

    public Long getResponsesByCustomer() { return responsesByCustomer; }
    public void setResponsesByCustomer(Long responsesByCustomer) { this.responsesByCustomer = responsesByCustomer; }
}
