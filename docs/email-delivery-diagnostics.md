# Authentication email delivery diagnostics

## November 6, 2026 investigation

Signup and resend for the affected Outlook test address completed successfully at the Auth layer, but SES bounce notifications established that Outlook rejected the message with SMTP 550 5.7.1: “Message lacks SPF/DKIM/DMARC Auth Records (AS9031519).” Auth HTTP 200 and `confirmation_sent_at` indicate submission, not inbox delivery.

At investigation time all three SES DKIM CNAMEs resolved publicly and SES reported signing enabled/SUCCESS. No public `_dmarc.insteadtry.com` TXT record was found. The root SPF record covered Namecheap forwarding, and SES used its default MAIL FROM domain. Do not replace existing forwarding or inbound-mail records when fixing SES authentication. DNS remediation and a subsequent successful delivery must be verified separately; this document does not claim they are complete.

The confirmation email template was corrected to say five minutes, matching the existing 300-second Auth expiry. No expiry, password, confirmation, or SMTP credential policy was weakened.

## Active diagnostic resources

With owner approval, delivery, bounce, and complaint notifications for the SES identity `insteadtry.com` in `us-east-1` publish to the private SNS topic `instead-email-delivery`, subscribed to the SQS queue of the same name. The queue has SSE-SQS encryption and 86,400-second retention. SNS permits the SES service only for this account's exact identity ARN; SQS accepts SNS delivery only from that topic. Headers are not included. Message bodies and OTP codes are not part of the diagnostic payload. Recipient addresses and SMTP diagnostic metadata are sensitive operational data; do not commit or publish raw events. No open/click tracking or paid deliverability add-on is enabled. Normal SNS/SQS usage charges apply.

Identity-level notifications were chosen because attaching a default configuration set requires additional SMTP IAM permissions. The attempted default was rolled back immediately after a test rejected that configuration-set permission; existing SMTP IAM sender/recipient restrictions remain unchanged. No default configuration set is attached.

Read current settings with `aws ses get-identity-notification-attributes --identities insteadtry.com --region us-east-1`. Obtain the queue URL using `aws sqs get-queue-url --queue-name instead-email-delivery --region us-east-1`, then receive events with bounded long polling. Interpret the SNS envelope's `Message` JSON. Correlate recipient, timestamp, and SES message ID. A Delivery event confirms receiving-server acceptance, not inbox placement; Bounce supplies the receiving server's diagnostic. Do not continuously poll or repeatedly resend codes.

Supabase logs now use the Management API `/analytics/endpoints/logs`, ClickHouse SQL against `logs` with `source='auth_logs'`, and a bounded time window. The retired `logs.all` endpoint returns 410. Never print access tokens, SMTP secrets, or OTPs while investigating.

## Client behavior

The pending-signup screen offers **Resend confirmation code** after 60 seconds. Resends use Supabase's signup resend endpoint and the pending address, preserve the username/bio draft, clear the old entered code only on success, and expose failures without pretending a code was delivered. Recovery keeps its separate recovery resend flow. Server rate limits remain authoritative.

References: [Supabase log queries](https://supabase.com/docs/guides/observability/advanced-log-filtering), [SES identity notifications](https://docs.aws.amazon.com/ses/latest/dg/configure-sns-notifications.html), [SES DMARC alignment](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html).
