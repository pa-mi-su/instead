# INSTEAD public policy website

AWS hosting created October 16, 2026 at the owner’s request; the certificate is issued and both custom aliases are attached; Namecheap website DNS cutover is complete and both public domain names are verified. This is the minimal public support/policy site, separate from the full recipe-directory web app under `web/`.

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

AWS inventory checked October 16, 2026: the accessible account has Sanctuary and GoodBuy distributions, but no Instead distribution or certificate. Hosting resources were subsequently created as documented below; Namecheap DNS has not been changed.

References: [AWS private S3 origins](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html), [Google account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111).

## Deployed AWS resources (October 16, 2026)

- Bucket: `insteadtry-website-160885294528` (private, encrypted, versioned)
- CloudFront distribution: `EMXS0LG36D5KE`
- Distribution hostname: `d29y6t7h1opcjp.cloudfront.net`
- Origin access control: `E10I4JGWB9FU9S`
- Published routing function: `insteadtry-policy-routes`
- ACM certificate: `arn:aws:acm:us-east-1:160885294528:certificate/b3dce139-8dcf-4cbe-be1d-d03470704b55`

ACM is ISSUED. CloudFront is configured with the certificate, TLS 1.2 minimum, and aliases insteadtry.com and www.insteadtry.com. The custom-domain configuration must finish deploying before DNS cutover. Replace only the parking/website redirect records: apex ALIAS host @ and www CNAME both point to d29y6t7h1opcjp.cloudfront.net. Preserve all validation and mail records.

Namecheap certificate-validation CNAME records (Automatic TTL):

| Host | Value |
| --- | --- |
| `_274fe85a251f333b3453bc3ff9eb7c72` | `_707950a19bfb103f8bf9118b715fc4fb.wzccmgtwzk.acm-validations.aws` |
| `_b9e9121c0c305e59f0463f0916edd7fb.www` | `_7cf91a69ee650f8677dbfbdf72416e22.wzccmgtwzk.acm-validations.aws` |

Leave these validation records in place for automatic certificate renewal. Public policy reachability is verified and its release attestation is complete. Support inbox receipt remains unverified and its attestation remains incomplete.

CloudFront-hostname validation: all six routes returned HTTP 200 over HTTPS, including trailing-slash policy/deletion URLs. Security headers include HSTS. Missing paths return an error rather than the home page. All six pages on both custom domain names returned HTTPS 200 after DNS cutover, and HTTP redirected to HTTPS (301). Inbox receipt remains unverified.

Namecheap apex ALIAS uses its available 5-minute TTL; this is acceptable. The www CNAME uses Automatic TTL. CloudFront global configuration deployment was still InProgress at verification, while both custom domains already passed HTTPS checks.

Support delivery verified October 16, 2026: the owner configured Namecheap forwarding for info@insteadtry.com and confirmed receipt of a test in the destination inbox. The supportInboxVerified release attestation is complete.
