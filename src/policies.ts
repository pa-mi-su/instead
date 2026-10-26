// Shared policy text for offline mobile reading and the website.
export const POLICY_VERSION = '2026-10-19.1';
export const POLICY_DATE = 'October 19, 2026';
export const policyDocuments = {
  terms: [
    {
      title: '1. Accepting these terms',
      paragraphs: [
        'INSTEAD, USA. Contact: info@insteadtry.com.',
        'By accessing or using the INSTEAD website or mobile applications (the “Services”), you agree to these Terms of Use. If you do not agree, do not use the Services.',
        'The first-use acknowledgement asks you to agree to these Terms and acknowledge the Safety information and Privacy Policy before browsing recipes. Material revisions to that acknowledgement require a new confirmation. You may decline and stop using the directory. Nothing in the acknowledgement waives rights that cannot legally be waived.',
      ],
    },
    {
      title: '2. What INSTEAD provides',
      paragraphs: [
        'INSTEAD is a reference tool. INSTEAD publishes practical, educational guides about alternatives for everyday products and tasks. Verified-email accounts can submit recipes with optional photos and vote on recipes. Recipe submissions and photos are held for moderation before publication. Moderation is not proof of safety, efficacy, or professional approval. We do not offer paid subscriptions or purchases. The app no longer accepts or displays community comments; comment records submitted in earlier versions remain subject to the Privacy Policy.',
      ],
    },
    {
      title: '3. Informational use and safety',
      paragraphs: [
        'Guides are general information and may not account for your health, property, equipment, location, local laws, product instructions, or other circumstances. They are not medical, legal, engineering, financial, environmental, pest-control, or other professional advice.',
        'You are responsible for evaluating whether a guide is appropriate, following manufacturer instructions and applicable laws, and using a qualified professional when a task is hazardous, regulated, destructive, uncertain, or beyond your skill. The Safety page is part of these terms.',
      ],
    },
    {
      title: 'Medical and health information',
      paragraphs: [
        'INSTEAD is not a healthcare provider. Content is educational information, not medical or dental advice, diagnosis, treatment, or an individualized recommendation. Using the app, submitting content, or interacting with contributors does not create a clinician–patient relationship. Do not disregard professional advice, delay care, change prescribed treatment, or substitute homemade remedies for necessary care because of content here. Consult a qualified healthcare professional before making health decisions.',
        'Recipes, ingredient grades, concentrations, dosing, preservation, shelf life, and compatibility may be untested. Natural does not mean safe. Moderation, publication, email verification, and votes do not verify credentials, establish safety or effectiveness, or represent professional approval. This app is not for emergencies. Contact local emergency services for urgent symptoms or immediate danger.',
      ],
    },
    {
      title: '4. Permitted use',
      paragraphs: [
        'We grant you a limited, personal, non-exclusive, non-transferable, revocable right to use the Services for lawful purposes. You may not:',
        'interfere with or attempt to bypass service security;',
        'access the Services through abusive, automated, or excessive means;',
        'copy, sell, repackage, or commercially exploit substantial portions of the Services without permission;',
        'use the Services to violate law or the rights or safety of others;',
        'misrepresent INSTEAD content as professional certification.',
      ],
    },
    {
      title: 'Community participation',
      paragraphs: [
        'Keep your password and recovery codes private. Your public profile uses a username and optional short bio; do not impersonate others or include private information. Do not submit spam, abuse, or dangerous instructions. Do not create multiple accounts to manipulate votes. Email verification does not verify identity or expertise, and votes do not establish safety or effectiveness.',
        'You retain ownership of recipes and photos you submit and permit INSTEAD to store, display, and moderate them as part of the Services. Only submit content and photos you have permission to share. Recipe submissions and photos require approval before publication. Approved recipes display your username and optional bio; your email address is never public. Do not request or provide individualized diagnosis, dosing, treatment, advice to stop prescribed care, unsupported cure claims, or dangerous ingredient substitutions. You can withdraw your recipes; moderators may hide or remove content. Use the Report control to flag concerns. Signed-in users can request account deletion in My INSTEAD; support is also available. Requests hide public contributions and disable contributions while permanent deletion is processed.',
      ],
    },
    {
      title: '5. Content and intellectual property',
      paragraphs: [
        'The Services, branding, design, and original guide content are owned by INSTEAD or its licensors and are protected by applicable intellectual-property laws. Product names and third-party marks belong to their respective owners. Mentioning a product or service does not transfer ownership or imply sponsorship.',
      ],
    },
    {
      title: '6. Third-party products and services',
      paragraphs: [
        'Guides may discuss third-party products, manufacturers, service providers, or external resources. Barcode lookup uses product information from Open Food Facts and connected product databases. The Open Food Facts database is available under the Open Database License (ODbL), and its individual contents are available under the Database Contents License. Product records may be incomplete, incorrect, or out of date. Availability, formulation, instructions, pricing, safety information, and claims can change. Unless expressly stated, a mention is not an endorsement, partnership, warranty, or paid placement. Third parties have their own terms and privacy practices.',
      ],
    },
    {
      title: '7. Changes and availability',
      paragraphs: [
        'We may correct, add, remove, or update guides and service features. We do not promise that every guide is complete, current, available, or suitable for every user or location. The Services may occasionally be interrupted for maintenance, security, or reasons outside our control.',
      ],
    },
    {
      title: '8. Disclaimers',
      paragraphs: [
        'To the fullest extent permitted by applicable law, the Services are provided “as is” and “as available,” without warranties of any kind, whether express, implied, or statutory, including warranties of accuracy, fitness for a particular purpose, non-infringement, or uninterrupted availability. Some jurisdictions do not allow certain warranty exclusions, so those exclusions may not apply to you.',
      ],
    },
    {
      title: '9. Limitation of liability',
      paragraphs: [
        'To the fullest extent permitted by applicable law, INSTEAD and its contributors will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for losses arising from reliance on a guide, use of a third-party product or service, property damage, data loss, or service interruption. Nothing in these terms excludes liability that cannot lawfully be excluded.',
      ],
    },
    {
      title: '10. Ending access',
      paragraphs: [
        'You may stop using the Services at any time. We may restrict access when reasonably necessary to protect the Services, users, safety, or legal rights, or when these terms are materially violated.',
      ],
    },
    {
      title: '11. Changes to these terms',
      paragraphs: [
        'We may revise these terms as the Services develop. The revised terms will display a new “Last updated” date. Continued use after revised terms take effect means you accept them where permitted by law.',
      ],
    },
    {
      title: '12. Contact',
      paragraphs: [
        'Questions and requests: info@insteadtry.com. For account deletion, contact support from your account email so the request can be verified.',
      ],
    },
  ],
  privacy: [
    {
      title: '1. Scope',
      paragraphs: [
        'INSTEAD, USA. Contact: info@insteadtry.com.',
        'This policy applies to the INSTEAD website and INSTEAD mobile applications for iOS and Android (together, the “Services”). It does not apply to third-party websites, products, or services that may be mentioned in a guide.',
      ],
    },
    {
      title: '2. Information you provide',
      paragraphs: [
        'Browsing needs no account. An optional email-and-password account lets you sync saved guides, submit and manage recipes, and vote. Supabase Auth processes your email address and stores password credentials securely; INSTEAD never receives or stores plaintext passwords. Email codes are used only to confirm a new address or set/reset a password. We store your username, optional bio, saved-guide identifiers, recipe submissions, optional photos, votes, and reports. Approved profiles and recipes are public; your email address, pending submissions, and saved guides are private. Comments submitted in earlier app versions are retained until removed through account deletion or moderation; new comments are no longer accepted or displayed. Do not include private information in your profile, recipe submissions, or photos.',
        'If you contact support, we receive the information you choose to send, such as your email address, message, device type, or screenshots. Do not include sensitive personal information that is not needed to answer your request.',
      ],
    },
    {
      title: '3. Information used by the Services',
      paragraphs: [
        'Saved guides and cached content',
        'Saved-guide identifiers are stored on your device or in your browser so they remain available offline. If you sign in, the same identifiers are also stored in your private account and synced across your signed-in devices. Signing out removes the local session; account-synced saves remain with your account. Signed-in sessions are stored locally so you can stay signed in.',
        'Network and service information',
        'Supabase provides authentication and the shared community database. Public responses include community content, dates, and vote totals; they do not include email addresses or account identifiers. Reports and account information are not public. As with ordinary internet traffic, the service provider may process technical request information such as an IP address, user agent, timestamps, and diagnostic or security logs to deliver content, prevent abuse, and maintain the service.',
        'Information we do not request',
        'If you choose “Scan a product,” the mobile app uses the platform’s barcode-scanning interface to read a product barcode. The scan is not recorded by INSTEAD, and camera images or video are not uploaded or stored by INSTEAD. The barcode is sent directly from your device to Open Food Facts to request product name and category information. Open Food Facts and its connected product databases receive the barcode and ordinary request data such as your IP address and may handle or log requests under their own privacy practices. INSTEAD does not store the barcode, lookup result, or scan history. Product lookup is optional; you can browse and search without scanning. The current Services do not request access to precise location, contacts, microphone, health records, or advertising identifiers. We do not use advertising SDKs or behavioral tracking tools. You can optionally select up to three recipe photos through the system photo picker or browser. Only selected images are uploaded. Photos are stored privately in Supabase until publication. Temporary photo links may remain usable for up to five minutes after content is hidden.',
        'We store the safety acknowledgement version and acceptance date locally on your device or browser. The first-use device record is not uploaded. Signed-in contributors explicitly accept the current community terms separately; Supabase stores the account ID, policy version, and server-recorded acceptance time for each accepted version. Clearing storage, reinstalling, using another device, or a new acknowledgement version may show the notice again.',
      ],
    },
    {
      title: '4. How information is used',
      paragraphs: [
        'Information is used only as reasonably necessary to:',
        'deliver guides and operate email sign-in, recipe votes, and moderation;',
        'operate, secure, troubleshoot, and improve the Services;',
        'respond to support, privacy, accessibility, or safety reports;',
        'comply with law and protect users, INSTEAD, and others.',
      ],
    },
    {
      title: '5. Service providers and disclosure',
      paragraphs: [
        'Supabase provides authentication, database, and recipe photo storage. Amazon Web Services SES sends sign-in emails through Supabase. Open Food Facts provides external product data when you request a barcode lookup; that request goes directly from your device to its service. These providers may process information to operate and protect their services under their applicable terms and privacy practices.',
        'We do not sell personal information or share it for cross-context behavioral advertising. Information may be disclosed if reasonably necessary to comply with law, address fraud or security, protect safety or legal rights, or complete a business reorganization subject to appropriate protections.',
      ],
    },
    {
      title: '6. Retention and deletion',
      paragraphs: [
        'Local saved guides and cached content remain on your device until you remove them, clear the app or browser storage, or uninstall the app. Account-synced saved guides remain in your account until you unsave them or delete your account. Support messages may be kept while a request is handled and as reasonably necessary for security, recordkeeping, or legal obligations. Infrastructure logs are retained only as reasonably necessary for service operation, security, and provider requirements.',
        'Account, saved-guide, recipe, vote, and report records remain until deleted or removed through moderation. Comments submitted in earlier app versions are no longer displayed and remain until removed through account deletion or moderation; contact support from the account email to request removal of historical comments. You can withdraw your recipes; they disappear from the directory, and the app attempts to remove their photo files. Withdrawn text and failed photo cleanups remain available to administrators until purged. Blocked-contributor records are private to the blocking account and include a short content excerpt for identifying the block; removing the block removes that record. To request account deletion, use My INSTEAD or contact support from your account email. Requests hide your public content and disable contributions while permanent deletion is attempted. If automatic deletion fails, the request remains pending for retry or support assistance. Deleting an account removes its saved guides, legacy comments, recipes, votes, and reports. Stored recipe photos are removed before the account is deleted. Failed cleanup keeps the deletion request pending. See the Support page for help. Clearing local storage does not delete server records.',
      ],
    },
    {
      title: '7. Security',
      paragraphs: [
        'We use reasonable technical and organizational safeguards appropriate to the current Services. No internet transmission or storage system can be guaranteed completely secure.',
      ],
    },
    {
      title: '8. Children',
      paragraphs: [
        'The Services are intended for a general audience and are not directed to children under 13. We do not knowingly collect personal information from children through the current Services. Contact us if you believe a child has provided personal information.',
      ],
    },
    {
      title: '9. Community contributions',
      paragraphs: [
        'Approved community contributions are public. Pending or rejected content is visible only to its author and administrators. Moderation does not establish professional approval or safety. Other people may copy public content before you delete it. Reports are available to moderators, and content may be hidden or removed for safety, abuse, or other service concerns. Email verification establishes access to an inbox; it does not verify a person’s identity or expertise.',
      ],
    },
    {
      title: '10. Changes to this policy',
      paragraphs: [
        'We may update this policy as the Services change. The revised policy will show a new “Last updated” date. If a change materially affects how personal information is handled, we will provide additional notice where appropriate.',
      ],
    },
    {
      title: '11. Contact',
      paragraphs: [
        'Questions and requests: info@insteadtry.com. For account deletion, contact support from your account email so the request can be verified.',
      ],
    },
  ],
} as const;
