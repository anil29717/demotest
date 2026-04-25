# WhatsApp Cloud API (Meta) — operations runbook

## Environment

| Variable | Purpose |
|----------|---------|
| `WHATSAPP_WEBHOOK_SECRET` | HMAC `X-Hub-Signature-256` verification (raw body required in Nest bootstrap). |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Meta subscription GET challenge (`hub.verify_token`). |
| `WHATSAPP_CLOUD_API_TOKEN` | Graph API bearer for outbound messages. |
| `WHATSAPP_PHONE_NUMBER_ID` | Cloud API phone number id segment in `/v21.0/{id}/messages`. |
| `WHATSAPP_DEFAULT_ORGANIZATION_ID` | Optional: route inbound Meta messages to this org’s CRM when body does not include an org id hint. |
| `ALERT_WEBHOOK_URL` | Optional POST JSON on signature / delivery failures (minimal Phase 1 hook). |
| `FEATURE_WHATSAPP_OUTBOUND` | Set `false` to disable outbound sends (digest + admin test). |

## Meta Developer Console

1. Create / use a **Meta app** with **WhatsApp** product.
2. Configure **Webhook** URL: `https://<api-host>/webhooks/whatsapp` (POST + GET verify).
3. Subscribe to `messages` (and `message_template_status_update` when using templates).
4. Rotate **App Secret** / tokens on a schedule; update deployment secrets before expiring tokens.

## Inbound flow (this codebase)

- Webhook: [`apps/api/src/whatsapp/whatsapp.controller.ts`](../../apps/api/src/whatsapp/whatsapp.controller.ts).
- Payload parsing and intent mapping: [`apps/api/src/whatsapp/whatsapp-ingest.service.ts`](../../apps/api/src/whatsapp/whatsapp-ingest.service.ts) (`inquiry_text`, `button_reply`, `interactive_reply`, media types).
- Leads attach when `organizationId` is present on body, `WHATSAPP_DEFAULT_ORGANIZATION_ID` is set, or message text contains a valid **organization CUID** token.
- Dedupe: `WhatsAppIngest.dedupeKey` from Meta message id when available.

## Observability

- Structured logs: `WhatsappController` + digest cron logs in `NotificationsService`.
- In-process metrics: `GET /admin/whatsapp/metrics` (ADMIN JWT) — counts and average processing latency (last 100 webhooks).

## Outbound / digest

- User prefs: WhatsApp digest fields in notification settings; cron in `NotificationsDigestScheduler`.
- Feature flag: `FEATURE_WHATSAPP_OUTBOUND=false` disables Cloud API sends.

## Failure triage

| Symptom | Check |
|---------|--------|
| 403 on GET verify | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` mismatch with Meta console. |
| 401 on POST | Missing/invalid `X-Hub-Signature-256`; confirm `rawBody` in `main.ts`. |
| No lead created | Org resolution: set `WHATSAPP_DEFAULT_ORGANIZATION_ID` or include org CUID in inbound text; org must have an **ADMIN** or **AGENT** member. |
| Digest not on WhatsApp | User prefs + E.164 + Cloud API env vars; outbound feature flag. |
