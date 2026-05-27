package com.customersupport.repository;

import com.customersupport.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

    /**
     * Loads a ticket with its messages in a single query (no lazy-load risk).
     * Use this whenever the message thread is needed (detail view, reply).
     */
    @Query("SELECT t FROM Ticket t LEFT JOIN FETCH t.messages WHERE t.id = :id")
    Optional<Ticket> findByIdWithMessages(@Param("id") Long id);
}
