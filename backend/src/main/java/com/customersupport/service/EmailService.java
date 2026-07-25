package com.customersupport.service;

import com.sendgrid.Method;
import com.sendgrid.Request;
import com.sendgrid.Response;
import com.sendgrid.SendGrid;
import com.sendgrid.helpers.mail.Mail;
import com.sendgrid.helpers.mail.objects.Content;
import com.sendgrid.helpers.mail.objects.Email;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * Sends transactional emails to customers via the SendGrid API.
 *
 * The "from" address must be a verified sender in your SendGrid account.
 * Configure in application.properties:
 *   app.sendgrid.api-key     — SendGrid API key (Settings → API Keys)
 *   app.email.from-address   — verified sender address
 *   app.email.from-name      — display name shown to recipient
 *
 * This service never throws — email send failures are logged as warnings so
 * that the calling transaction (ticket save) is never rolled back.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Value("${app.sendgrid.api-key}")
    private String apiKey;

    @Value("${app.email.from-address}")
    private String fromAddress;

    @Value("${app.email.from-name}")
    private String fromName;

    /**
     * Sends a reply email to the customer.
     *
     * Subject is formatted as: "Re: [Ticket #42] Original subject"
     * so that customer replies are threaded back to the correct ticket
     * by {@link com.customersupport.controller.EmailWebhookController}.
     *
     * @param toEmail         customer's email address
     * @param toName          customer's display name
     * @param originalSubject the ticket's original subject (without "Re:" prefix)
     * @param body            plain-text reply body
     * @param ticketId        used to embed the ticket reference in the subject
     */
    public void sendReplyToCustomer(String toEmail, String toName,
                                    String originalSubject, String body, Long ticketId) {
        if (isPlaceholderApiKey()) {
            log.warn("EmailService: SendGrid API key not configured — skipping email to {}", toEmail);
            return;
        }

        String subject = "Re: [Ticket #" + ticketId + "] " + originalSubject;

        Email from    = new Email(fromAddress, fromName);
        Email to      = new Email(toEmail, toName != null ? toName : toEmail);
        Content content = new Content("text/plain", body);
        Mail mail     = new Mail(from, subject, to, content);

        SendGrid sg = new SendGrid(apiKey);
        Request request = new Request();
        try {
            request.setMethod(Method.POST);
            request.setEndpoint("mail/send");
            request.setBody(mail.build());
            Response response = sg.api(request);

            if (response.getStatusCode() >= 400) {
                log.warn("EmailService: SendGrid returned {} for ticket #{} to {} — body: {}",
                        response.getStatusCode(), ticketId, toEmail, response.getBody());
            } else {
                log.info("EmailService: reply sent for ticket #{} to {} (status {})",
                        ticketId, toEmail, response.getStatusCode());
            }
        } catch (IOException e) {
            // Never propagate — a failed email must not roll back the saved ticket reply
            log.error("EmailService: failed to send email for ticket #{} to {}: {}",
                    ticketId, toEmail, e.getMessage(), e);
        }
    }

    /** Returns true if the API key is still the placeholder value from application.properties. */
    private boolean isPlaceholderApiKey() {
        return apiKey == null || apiKey.isBlank() || apiKey.equals("your_sendgrid_api_key");
    }
}
