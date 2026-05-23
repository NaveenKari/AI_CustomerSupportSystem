# Customer Support Management System — MVP Plan

## Problem
Customer emails are unorganized and hard to manage. Need a centralized system to track, categorize, and respond to customer support emails efficiently.

## Solution Overview
Customer emails arrive via webhook, get converted into tickets, and are handled by AI first. A single admin agent reviews, replies, and manages all tickets through a web UI.

---

## Core Features

### Email Ingestion
- Receive incoming customer emails via webhook
- Auto-create a ticket for each new email
- Attach email body, sender, subject, and timestamp to the ticket

### Ticket Management
- Each ticket displays the full email thread (customer + agent replies)
- Replies are sent directly from the ticket UI
- Tickets have the following statuses:
  - **New** — just arrived, not yet reviewed
  - **AI Responded** — AI sent an auto-reply, awaiting customer follow-up
  - **Pending Human** — AI could not resolve, needs agent attention
  - **In Progress** — admin is actively handling it
  - **Waiting on Customer** — reply sent, waiting for customer response
  - **Resolved** — issue closed

### AI Automation
- Auto-categorize each ticket on arrival (e.g. billing, technical, general inquiry)
- Auto-respond using a knowledge base for common questions
- If AI confidence is low or category is unknown, leave ticket as New for admin review

### Knowledge Base
- Admin can upload PDF documents as the knowledge base
- AI uses uploaded PDFs to generate responses
- Admin can delete PDFs that are no longer relevant

### Admin Dashboard — Metrics
- Total tickets today / this week
- Tickets by status (chart)
- Tickets by category (chart)
- Average first response time
- AI vs. human response ratio
- Open tickets older than 24 hours (backlog alert)

### Human Agent UI
- Ticket list view with filters by status, category, and date
- Click into any ticket to see the full email thread
- Reply to customer directly from the ticket thread
- Manually update ticket status from the ticket view
- Dashboard page with metrics and charts (see Admin Dashboard section)
- Navigation between ticket list, individual tickets, dashboard, and knowledge base

### Auth & Security
- Single admin login with email + password
- Session-based authentication
- All ticket data and emails accessible only to authenticated admin

---

## Out of Scope (MVP)

- Multiple agents or role-based access
- Customer-facing portal or login
- Mobile app
- SLA enforcement or auto-escalation rules
- Email attachments handling
- Bulk ticket actions
- Canned responses / response templates
- Customer satisfaction (CSAT) surveys
- Integrations with CRMs or third-party tools
- AI model fine-tuning or custom training
- Ticket assignment or routing between agents
- Audit logs
