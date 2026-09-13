# Developer jobs

Open Developer / Jobs in the admin sidebar (`/developer`). Existing super-admin authentication protects both the page and API.

The page reads the existing PostgreSQL pg-boss queue, import runs and audit logs. It shows state filters, retry counts, hotel, creation time, import counts, queue output and saved execution events. It polls every five seconds.

Retry accepts failed or cancelled jobs only. For housekeeping it also resets the failed import run and removes its failure receipt so successful completion can produce a fresh notification. An already-completed import cannot be retried. Delete removes a finished queue record, preserving hotel data and audit history. Active and pending jobs are protected. Actions are transactionally audited for hotel jobs with the initiating super-admin ID in the audit metadata.

This dashboard manages jobs, not Docker containers. A startup crash occurs before a job handler runs and remains visible in `docker compose logs worker`. In this incident the worker dependency volume lacked fast-xml-parser; installing dependencies inside Docker and restarting the worker completed the pending import (109 reservations, 78 guests).

No database migrations are needed for this page. It uses the existing pg-boss v12 schema. Queue records have retention limits; audit events remain after queue-record deletion. The list is paginated at 50 records, and each log view is capped at 100 events. Global job management is deliberately confined to the separate platform admin application.
