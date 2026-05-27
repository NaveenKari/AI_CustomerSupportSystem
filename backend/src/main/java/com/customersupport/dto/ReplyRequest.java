package com.customersupport.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/tickets/{id}/messages.
 * senderType is always AGENT and is derived server-side — it is not accepted from the caller
 * to prevent impersonation (e.g. a caller claiming senderType=AGENT on a customer message).
 */
public record ReplyRequest(
        @NotBlank @Size(max = 50_000) String body
) {}
