package com.customersupport.controller;

import com.customersupport.dto.CreateTicketRequest;
import com.customersupport.model.TicketCategory;
import com.customersupport.service.TicketService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Receives inbound emails forwarded by SendGrid Inbound Parse as multipart/form-data.
 *
 * SendGrid configuration:
 *   - Set "Destination URL" to https://&lt;your-domain&gt;/api/webhook/email
 *   - Optionally set the custom header X-Webhook-Secret to the value of app.webhook.secret
 *
 * This endpoint is intentionally public (no session auth) since SendGrid calls it directly.
 * The /api/webhook/** path is allowed in SecurityConfig.
 *
 * Always returns 200 OK — SendGrid retries on any non-2xx response, causing duplicate tickets.
 */
@RestController
@RequestMapping("/api/webhook")
public class EmailWebhookController {

    // Matches "Display Name <email@example.com>" or bare "email@example.com"
    private static final Pattern SENDER_PATTERN =
            Pattern.compile("^(?:(.+?)\\s*<([^>]+)>|([^<]+))$");

    private final TicketService ticketService;

    /**
     * Optional shared secret. If set (non-blank), every inbound webhook request must supply
     * the matching value in the X-Webhook-Secret header. Leave empty to disable the check
     * during local development.
     */
    @Value("${app.webhook.secret:}")
    private String webhookSecret;

    public EmailWebhookController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping(value = "/email", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> receiveEmail(
            @RequestHeader(value = "X-Webhook-Secret", required = false) String secret,
            @RequestParam("from") String from,
            @RequestParam(value = "subject", defaultValue = "(No Subject)") String subject,
            @RequestParam(value = "text", required = false) String text,
            @RequestParam(value = "html", required = false) String html) {

        // Shared-secret check — reject silently (still 200) to avoid retry-induced duplicates
        if (webhookSecret != null && !webhookSecret.isBlank() && !webhookSecret.equals(secret)) {
            return ResponseEntity.ok().build();
        }

        String body = resolveBody(text, html);
        ParsedSender sender = parseSender(from);

        // Truncate to match Ticket entity column lengths (prevents DB overflow from malicious payloads)
        CreateTicketRequest req = new CreateTicketRequest(
                truncate(subject.isBlank() ? "(No Subject)" : subject, 500),
                truncate(sender.email(), 254),
                truncate(sender.name(), 200),
                body.isBlank() ? "(empty)" : body,
                TicketCategory.GENERAL_INQUIRY   // AI categorization added in a later phase
        );

        ticketService.createTicket(req);

        // Always return 200 — SendGrid will retry on non-2xx, causing duplicate tickets
        return ResponseEntity.ok().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Prefer plain-text body; fall back to HTML with tags stripped.
     */
    private String resolveBody(String text, String html) {
        if (text != null && !text.isBlank()) {
            return text.trim();
        }
        if (html != null && !html.isBlank()) {
            return stripHtml(html).trim();
        }
        return "";
    }

    /**
     * Strips HTML tags from a string, turning the content into readable plain text.
     * Entities are decoded FIRST so that encoded tags (e.g. &lt;script&gt;) are exposed
     * and then stripped along with regular tags — preventing encoded tag injection.
     */
    private String stripHtml(String html) {
        return html
                // 1. Decode HTML entities first so encoded tags become real tags and get stripped
                .replaceAll("&nbsp;", " ")
                .replaceAll("&amp;", "&")
                .replaceAll("&lt;", "<")
                .replaceAll("&gt;", ">")
                .replaceAll("&quot;", "\"")
                // 2. Replace block-level tags with newlines for readability
                .replaceAll("(?i)<br\\s*/?>", "\n")
                .replaceAll("(?i)<p[^>]*>", "\n")
                // 3. Strip all remaining tags
                .replaceAll("<[^>]+>", "")
                .trim();
    }

    /**
     * Parses a raw "From" header value into name + email.
     * Handles:
     *   "Jane Smith <jane@example.com>"  → name="Jane Smith", email="jane@example.com"
     *   "jane@example.com"               → name="jane@example.com", email="jane@example.com"
     */
    private ParsedSender parseSender(String from) {
        if (from == null || from.isBlank()) {
            return new ParsedSender("Unknown", "unknown@unknown.com");
        }
        Matcher m = SENDER_PATTERN.matcher(from.trim());
        if (m.matches()) {
            if (m.group(2) != null) {
                // "Name <email>" format
                String name = m.group(1) != null ? m.group(1).trim() : m.group(2).trim();
                return new ParsedSender(name, m.group(2).trim());
            } else {
                // bare email
                String email = m.group(3).trim();
                return new ParsedSender(email, email);
            }
        }
        // Fallback
        return new ParsedSender(from.trim(), from.trim());
    }

    private String truncate(String value, int maxLength) {
        if (value == null) return "";
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private record ParsedSender(String name, String email) {}
}
