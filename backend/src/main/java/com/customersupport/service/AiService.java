package com.customersupport.service;

import com.customersupport.model.TicketCategory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Handles AI-powered ticket processing using Claude (Anthropic) via Spring AI.
 *
 * Two responsibilities:
 *  1. Auto-categorise inbound tickets (BILLING / TECHNICAL / GENERAL_INQUIRY / OTHER)
 *  2. Generate an empathetic auto-reply and deliver it via email
 *
 * {@link #processNewTicket} is annotated {@code @Async} so the webhook handler
 * returns 200 immediately — Claude API calls happen in a background thread,
 * preventing SendGrid from timing out and retrying the webhook.
 *
 * All Claude calls are wrapped in try/catch with sensible fallbacks so a
 * temporary API outage never prevents a ticket from being saved.
 */
@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    private final ChatClient chatClient;
    private final TicketService ticketService;
    private final EmailService emailService;

    public AiService(ChatClient.Builder chatClientBuilder,
                     TicketService ticketService,
                     EmailService emailService) {
        this.chatClient   = chatClientBuilder.build();
        this.ticketService = ticketService;
        this.emailService  = emailService;
    }

    // ── Async entry point ─────────────────────────────────────────────────────

    /**
     * Called by {@link com.customersupport.controller.EmailWebhookController} after
     * a new ticket is created. Runs in a background thread so the webhook returns
     * immediately without waiting for Claude.
     *
     * Steps:
     *  1. Categorise the ticket → update its category in the DB
     *  2. Generate an auto-reply → save as an AI message + set status AI_RESPONDED
     *  3. Email the auto-reply to the customer
     */
    @Async
    public void processNewTicket(Long ticketId, String subject, String body,
                                 String customerEmail, String customerName) {
        log.info("AiService: processing ticket #{}", ticketId);

        // 1. Categorise
        TicketCategory category = categorise(subject, body);
        try {
            ticketService.updateCategory(ticketId, category);
            log.info("AiService: ticket #{} categorised as {}", ticketId, category);
        } catch (Exception e) {
            log.warn("AiService: could not update category for ticket #{}: {}", ticketId, e.getMessage());
        }

        // 2. Auto-reply
        String aiReply = generateAutoReply(subject, body);
        try {
            ticketService.aiReplyToTicket(ticketId, aiReply);
            log.info("AiService: AI reply saved for ticket #{}", ticketId);
        } catch (Exception e) {
            log.warn("AiService: could not save AI reply for ticket #{}: {}", ticketId, e.getMessage());
            return; // don't email if we couldn't save the reply
        }

        // 3. Email
        emailService.sendReplyToCustomer(customerEmail, customerName, subject, aiReply, ticketId);
    }

    // ── Claude calls ──────────────────────────────────────────────────────────

    /**
     * Asks Claude to classify the ticket into one of four categories.
     * Falls back to GENERAL_INQUIRY on any API or parse error.
     */
    private TicketCategory categorise(String subject, String body) {
        String prompt = """
                Classify this customer support ticket into exactly one of the following categories.
                Respond with ONLY the category name — no explanation, no punctuation.
                Categories: BILLING, TECHNICAL, GENERAL_INQUIRY, OTHER

                Subject: %s
                Body: %s
                """.formatted(subject, truncate(body, 2000));
        try {
            String raw = chatClient.prompt(prompt).call().content();
            if (raw == null) return TicketCategory.GENERAL_INQUIRY;
            return TicketCategory.valueOf(raw.strip().toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("AiService: Claude returned an unrecognised category — defaulting to GENERAL_INQUIRY");
            return TicketCategory.GENERAL_INQUIRY;
        } catch (Exception e) {
            log.warn("AiService: categorisation failed for ticket — defaulting to GENERAL_INQUIRY: {}", e.getMessage());
            return TicketCategory.GENERAL_INQUIRY;
        }
    }

    /**
     * Asks Claude to draft an empathetic support reply.
     * Returns a safe fallback message on any API error.
     */
    private String generateAutoReply(String subject, String body) {
        String prompt = """
                You are a helpful customer support agent responding to a support ticket.
                Write a concise, empathetic, professional reply to the customer.
                - If the issue can be resolved or explained briefly, do so.
                - If more investigation is needed, acknowledge the request and let them know a team member will follow up.
                - Do not mention that you are an AI.
                - Keep the reply under 200 words.

                Subject: %s
                Customer message: %s
                """.formatted(subject, truncate(body, 2000));
        try {
            String reply = chatClient.prompt(prompt).call().content();
            return (reply != null && !reply.isBlank())
                    ? reply.strip()
                    : fallbackReply();
        } catch (Exception e) {
            log.warn("AiService: auto-reply generation failed: {}", e.getMessage());
            return fallbackReply();
        }
    }

    private String fallbackReply() {
        return "Thank you for reaching out to our support team. "
                + "We have received your message and a team member will get back to you as soon as possible.";
    }

    /** Prevents sending excessively long prompts to Claude. */
    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max) + "…";
    }
}
