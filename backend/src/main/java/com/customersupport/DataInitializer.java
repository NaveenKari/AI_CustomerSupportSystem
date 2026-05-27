package com.customersupport;

import com.customersupport.model.*;
import com.customersupport.repository.TicketRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Seeds the database with example tickets on startup — only if no tickets exist yet.
 * Safe to leave in place; it becomes a no-op once data is present.
 */
@Component
public class DataInitializer implements ApplicationRunner {

    private final TicketRepository ticketRepository;

    public DataInitializer(TicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (ticketRepository.count() > 0) {
            return; // already seeded
        }

        ticketRepository.saveAll(List.of(
                buildTicket(
                        "Cannot log in to my account",
                        "james.walker@gmail.com", "James Walker",
                        "Hi, I've been trying to log in since yesterday morning but keep getting 'Invalid credentials'. "
                                + "I reset my password twice and it still doesn't work. Please help ASAP.",
                        TicketStatus.NEW, TicketCategory.TECHNICAL,
                        LocalDateTime.now().minusHours(3),
                        List.of(
                                msg(SenderType.CUSTOMER,
                                        "Hi, I've been trying to log in since yesterday morning but keep getting 'Invalid credentials'. "
                                                + "I reset my password twice and it still doesn't work. Please help ASAP.",
                                        LocalDateTime.now().minusHours(3))
                        )
                ),

                buildTicket(
                        "Double charged on my April invoice",
                        "priya.sharma@outlook.com", "Priya Sharma",
                        "Hello, I noticed I was charged twice on April 14th — both charges are for $49.99. "
                                + "Please refund the duplicate. My order number is #INV-20240414-882.",
                        TicketStatus.IN_PROGRESS, TicketCategory.BILLING,
                        LocalDateTime.now().minusDays(1).minusHours(2),
                        List.of(
                                msg(SenderType.CUSTOMER,
                                        "Hello, I noticed I was charged twice on April 14th — both charges are for $49.99. "
                                                + "Please refund the duplicate. My order number is #INV-20240414-882.",
                                        LocalDateTime.now().minusDays(1).minusHours(2)),
                                msg(SenderType.AGENT,
                                        "Hi Priya, thanks for reaching out. I can confirm the duplicate charge and have raised a refund request. "
                                                + "You should see it back in 3–5 business days. I'll follow up once it's processed.",
                                        LocalDateTime.now().minusDays(1).minusHours(1))
                        )
                ),

                buildTicket(
                        "How do I export my data as CSV?",
                        "carlos.mendez@company.io", "Carlos Mendez",
                        "Hi team, is there a way to export all my records as a CSV file? "
                                + "I looked through the settings but couldn't find the option. Thanks.",
                        TicketStatus.RESOLVED, TicketCategory.GENERAL_INQUIRY,
                        LocalDateTime.now().minusDays(3),
                        List.of(
                                msg(SenderType.CUSTOMER,
                                        "Hi team, is there a way to export all my records as a CSV file? "
                                                + "I looked through the settings but couldn't find the option. Thanks.",
                                        LocalDateTime.now().minusDays(3)),
                                msg(SenderType.AGENT,
                                        "Hi Carlos! Yes — go to Settings → Data → Export, choose CSV format, and click Download. "
                                                + "You'll receive an email with the download link within a few minutes.",
                                        LocalDateTime.now().minusDays(3).plusHours(1)),
                                msg(SenderType.CUSTOMER,
                                        "Perfect, found it! Thank you so much.",
                                        LocalDateTime.now().minusDays(3).plusHours(2))
                        )
                ),

                buildTicket(
                        "API rate limit errors in production",
                        "dev-team@startupxyz.com", "StartupXYZ Dev Team",
                        "We're hitting 429 rate limit errors on the /v2/data endpoint starting around 10 AM UTC today. "
                                + "Our usage hasn't changed. Is there an incident on your end?",
                        TicketStatus.PENDING_HUMAN, TicketCategory.TECHNICAL,
                        LocalDateTime.now().minusHours(6),
                        List.of(
                                msg(SenderType.CUSTOMER,
                                        "We're hitting 429 rate limit errors on the /v2/data endpoint starting around 10 AM UTC today. "
                                                + "Our usage hasn't changed. Is there an incident on your end?",
                                        LocalDateTime.now().minusHours(6)),
                                msg(SenderType.AGENT,
                                        "Hi, thanks for flagging this. I've escalated to our infrastructure team and they're investigating. "
                                                + "I'll update you as soon as I have more information.",
                                        LocalDateTime.now().minusHours(5))
                        )
                ),

                buildTicket(
                        "Request to upgrade to Enterprise plan",
                        "sarah.johnson@bigcorp.com", "Sarah Johnson",
                        "Hi, our team has grown to 50+ users and we'd like to explore the Enterprise plan. "
                                + "Could someone reach out to discuss pricing and custom features?",
                        TicketStatus.NEW, TicketCategory.BILLING,
                        LocalDateTime.now().minusMinutes(45),
                        List.of(
                                msg(SenderType.CUSTOMER,
                                        "Hi, our team has grown to 50+ users and we'd like to explore the Enterprise plan. "
                                                + "Could someone reach out to discuss pricing and custom features?",
                                        LocalDateTime.now().minusMinutes(45))
                        )
                ),

                buildTicket(
                        "Mobile app keeps crashing on iOS 17",
                        "tomoki.nakamura@icloud.com", "Tomoki Nakamura",
                        "Since updating to iOS 17.4 the app crashes every time I try to open the Reports tab. "
                                + "I've reinstalled twice. Device is iPhone 14 Pro, app version 4.2.1.",
                        TicketStatus.AI_RESPONDED, TicketCategory.TECHNICAL,
                        LocalDateTime.now().minusDays(2),
                        List.of(
                                msg(SenderType.CUSTOMER,
                                        "Since updating to iOS 17.4 the app crashes every time I try to open the Reports tab. "
                                                + "I've reinstalled twice. Device is iPhone 14 Pro, app version 4.2.1.",
                                        LocalDateTime.now().minusDays(2)),
                                msg(SenderType.AGENT,
                                        "Hi Tomoki! We're aware of a compatibility issue with iOS 17.4 and the Reports tab. "
                                                + "A fix is included in version 4.2.2 which is currently in App Store review. "
                                                + "As a workaround, you can access Reports via our web app at app.example.com. "
                                                + "We expect the update to be available within 48 hours.",
                                        LocalDateTime.now().minusDays(2).plusHours(1))
                        )
                )
        ));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Ticket buildTicket(
            String subject, String email, String name, String body,
            TicketStatus status, TicketCategory category,
            LocalDateTime createdAt, List<TicketMessage> messages) {

        Ticket t = new Ticket();
        t.setSubject(subject);
        t.setCustomerEmail(email);
        t.setCustomerName(name);
        t.setBody(body);
        t.setStatus(status);
        t.setCategory(category);

        // Bypass @PrePersist so we can set realistic past timestamps
        setField(t, "createdAt", createdAt);
        setField(t, "updatedAt", createdAt);

        for (TicketMessage m : messages) {
            m.setTicket(t);
            t.getMessages().add(m);
        }
        return t;
    }

    private TicketMessage msg(SenderType sender, String body, LocalDateTime sentAt) {
        TicketMessage m = new TicketMessage();
        m.setSenderType(sender);
        m.setBody(body);
        // Bypass @PrePersist to set realistic past timestamps
        setField(m, "sentAt", sentAt);
        return m;
    }

    /** Reflectively sets a field that is normally managed by @PrePersist. */
    private void setField(Object target, String fieldName, Object value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException("Failed to set field " + fieldName, e);
        }
    }
}
