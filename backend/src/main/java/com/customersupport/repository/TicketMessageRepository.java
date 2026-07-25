package com.customersupport.repository;

import com.customersupport.model.TicketMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketMessageRepository extends JpaRepository<TicketMessage, Long> {

    List<TicketMessage> findByTicketIdOrderBySentAtAsc(Long ticketId);

    /**
     * Returns [SenderType, count] rows for every sender type that has at least one message.
     * Used by MetricsService to compute the AI vs. human response breakdown.
     */
    @Query("SELECT m.senderType, COUNT(m) FROM TicketMessage m GROUP BY m.senderType")
    List<Object[]> countBySenderType();
}
