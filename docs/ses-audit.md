# Instead SES setup audit

Initial read-only audit: October 16, 2026. The findings below describe the state before setup.

Setup completed later that day: insteadtry.com was registered at Namecheap, its SES identity and DKIM were verified in us-east-1, dedicated sender-scoped SMTP credentials were configured in Supabase, and code email templates were activated. The owner confirmed receipt of a test code email. AWS provides outgoing email delivery; Supabase provides authentication, database, and recipe photo storage.

## Findings

- Current AWS account (ending 4528): SES in us-east-1 has production access, sending enabled, and HEALTHY enforcement status. Current quota: 50,000 recipients per 24 hours and 14 per second; zero sent in the last 24 hours at audit time.
- SES in us-west-2 remains in the sandbox. Use us-east-1 for email even though Supabase is hosted in us-west-2. SES production approval, identities and SMTP credentials are regional; the application database does not need to share that region.
- No email identities were returned in either checked region. Goodbuy's repository uses the SES API, defaults to us-east-1, and configures no-reply@goodbuyapp.com. This confirms the intended integration, not that Goodbuy's sender is currently live in this account. Reuse the AWS account's production approval, not Goodbuy's credentials.
- IAM simulation reports allowed for SES identity creation, custom MAIL FROM configuration, and creation of an IAM user, access key, policy, and policy attachment. Simulation is not a guarantee of successful writes under every runtime constraint.
- No Route 53 zones matching Instead or Goodbuy were found in this account.
- insteadtry.com, currently referenced by Instead's support and mobile policy links, returns DNS NXDOMAIN. Domain ownership/registration was not established by this audit. Confirm the actual domain before creating any SES identity or changing links.
- goodbuyapp.com's public nameservers are dns1.registrar-servers.com and dns2.registrar-servers.com; that does not establish Instead's DNS provider.
- Supabase community migration and passwordless client flow are already implemented. Live community reads and private-profile denial were verified in the preceding setup work. Email codes are eight digits with 600-second expiry. Custom SMTP and the code email template are still pending.

## Proposed configuration

| Setting | Value |
| --- | --- |
| SES region | us-east-1 |
| Sender name | INSTEAD |
| Sender address | no-reply@<confirmed-owned-domain> |
| SMTP host | email-smtp.us-east-1.amazonaws.com |
| SMTP port | 587 with STARTTLS |
| SMTP username/password | Dedicated Instead SES SMTP credentials |
| Credential location | Supabase Authentication SMTP settings only |
| Code email | Subject: Your INSTEAD sign-in code; body includes `{{ .Token }}` |
| Code lifetime | 600 seconds |
| Code length | Keep eight digits |

Use a separate SMTP IAM user/group scoped to ses:SendRawEmail for Instead's verified identity and approved From address. Do not convert the local administrator's credentials or reuse Goodbuy's application keys. SMTP passwords differ from ordinary AWS secret access keys. Credentials must not be committed, placed in client environment variables, or pasted into chat.

## What the owner needs to do

1. Confirm the domain already owned for Instead and the DNS provider. If there is no domain, choose and register one; registration/purchase remains the owner's decision.
2. Sign into the domain's DNS provider when needed. The agent can prepare exact DKIM and other records and, with available access and authorization, add them. Otherwise the owner adds the supplied records.
3. Complete any required sensitive credential-entry/approval step when creating and storing the dedicated SMTP credential in Supabase. No administrator credential should be shared.
4. Choose a test inbox and enter its email code during end-to-end verification. Do not share sign-in codes in chat.

## What Codex can do

1. Create an SES domain identity in us-east-1 using Easy DKIM with 2048-bit signing, obtain its exact DNS records, and check verification after publication.
2. Prepare DKIM CNAMEs, DMARC, and an optional dedicated MAIL FROM subdomain with its SPF/MX records without replacing unrelated existing records. Outgoing SES mail does not require moving the existing mailbox provider.
3. Create dedicated, narrowly scoped SMTP access, store it only in Supabase through an authorized secure workflow, and configure TLS SMTP.
4. Update Supabase's sign-in and any applicable first-signup templates to show the code, check sending/verification limits, and preserve email confirmation.
5. Update app support/policy domain references if the confirmed domain differs; verify the policy URLs work before release.
6. Test delivery, expired/wrong codes, sign-out, session persistence, private saved-guide sync, recipe submission status, and independent recipe votes with authorized test accounts. Configure/check bounce and complaint handling plus suppression and review sending limits before wider release.

## Expected cost and dependencies

AWS's current a la carte SES outbound rate is $0.10 per 1,000 emails, plus applicable data charges; domain registration is separate. Avoid paid optional deliverability/IP add-ons for the initial setup. Do not rely on a free-tier credit or assume account quotas are a cost cap.

No Cognito migration, new auth backend, or Supabase paid upgrade is needed for SES SMTP. Email delivery uses AWS; authentication and community storage remain in Supabase.

Official references:

- https://docs.aws.amazon.com/ses/latest/dg/regions.html
- https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html
- https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html
- https://supabase.com/docs/guides/auth/auth-smtp
- https://aws.amazon.com/ses/pricing/
