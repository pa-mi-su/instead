# INSTEAD public policy website

Prepared for deployment after the remaining app work, as requested by the owner. This is the minimal public support/policy site, separate from the full recipe-directory web app under `web/`.

Build with `npm run website:build`. Upload only `website/dist/`; never upload the repository, environment files, or Supabase credentials. The output is six plain HTML pages and one stylesheet, with no JavaScript, sign-in, cookies, analytics, or server runtime. Terms and Privacy come directly from `src/policies.ts`.

## Public URLs

- `https://insteadtry.com/` — app information
- `https://insteadtry.com/privacy` — store privacy-policy URL
- `https://insteadtry.com/support` — Apple support URL
- `https://insteadtry.com/delete-account` — Google Play account-deletion URL
- `https://insteadtry.com/terms` — Terms of Use
- `https://insteadtry.com/safety` — safety information

These are target URLs, not verified live pages yet. Do not submit them to the stores until deployment and external reachability checks pass. Google's deletion page permits an email request without reinstalling the app. Verify that `info@insteadtry.com` receives mail and establish a process for handling requests before launch. SES outbound sending does not provide an inbound inbox.

## AWS deployment after app work

1. Request an ACM certificate in us-east-1 for insteadtry.com and www.insteadtry.com. Add only its DNS validation CNAME records in Namecheap and wait for issuance.
2. Create a dedicated S3 bucket with Block Public Access enabled, encryption, and versioning. Use its regional REST endpoint as the origin, not the HTTP-only S3 website endpoint.
3. Create a CloudFront distribution using Origin Access Control, the issued certificate, both domain aliases, HTTPS redirection, and index.html as the default root. Restrict the bucket policy to this distribution's ARN. Use a security response-headers policy. Do not alter Sanctuary or GoodBuy resources.
4. Attach a viewer-request CloudFront Function to resolve extensionless paths to their index files:

   ```js
   function handler(event) {
     var request = event.request;
     var uri = request.uri;
     if (uri.endsWith('/')) request.uri += 'index.html';
     else if (uri.split('/').pop().indexOf('.') === -1) request.uri += '/index.html';
     return request;
   }
   ```

   Keep real 404s; do not map all missing pages to a successful home page.
5. Build and sync website/dist to the dedicated bucket; invalidate CloudFront after updates. Verify all six pages and their navigation at the distribution domain before DNS cutover.
6. Point Namecheap's apex ALIAS and www CNAME at the distribution domain, replacing only the parking/website redirect records. Preserve SES DKIM, email, and certificate-validation records.
7. Verify HTTPS and HTTP-to-HTTPS redirects for both domains, policy text, deletion email link, mobile layout, and no-login accessibility. Verify inbox receipt with the owner. Then enter the URLs in App Store Connect and Google Play and update only the release attestations actually verified.

AWS inventory checked October 16, 2026: the accessible account has Sanctuary and GoodBuy distributions, but no Instead distribution or certificate. No hosting resources or DNS records were changed during preparation.

References: [AWS private S3 origins](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html), [Google account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111).
