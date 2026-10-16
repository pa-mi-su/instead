import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const output = new URL('../website/dist/', import.meta.url);
const source = await fs.readFile(new URL('src/policies.ts', root), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { policyDocuments, POLICY_DATE } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const escape = value =>
  String(value).replace(
    /[&<>"']/g,
    char =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char]),
  );
const links = [
  ['/', 'INSTEAD'],
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
  ['/safety', 'Safety'],
  ['/support', 'Support'],
  ['/delete-account', 'Delete account'],
];
const section = (title, body) =>
  `<section><h2>${escape(title)}</h2><p>${escape(body)}</p></section>`;
const deletion = `${section(
  'Request deletion without the app',
  'Email info@insteadtry.com from the email address you used to sign in to INSTEAD. Use the subject “INSTEAD account deletion”. We will verify ownership before processing your request. Never send your sign-in code or password. You do not need to reinstall the app.',
)}
<p><a class="button" href="mailto:info@insteadtry.com?subject=INSTEAD%20account%20deletion">Email an account-deletion request</a></p>
${section(
  'Delete from the app',
  'Sign in, open any topic’s account controls, choose Delete account, and confirm. The request hides your public contributions and disables new contributions while deletion is attempted. If cleanup fails, retry or contact support.',
)}
${section(
  'What is deleted',
  'Account deletion removes your sign-in account, community comments, recipes, recipe photos, votes, reports, blocks, and account-linked agreements. Stored recipe photos are removed before the account. Failed cleanup keeps the request pending. Locally saved guides must be cleared separately on your device. Provider backups and operational logs may follow their retention schedules; see the Privacy Policy.',
)}
${section(
  'Request status',
  'We verify emailed requests and process them as promptly as reasonably possible. For status or a failed in-app request, email support from your account address. Support is not an emergency service.',
)}`;
const pages = [
  [
    '',
    'INSTEAD: Better Ways',
    '<p>Practical alternatives for everyday life. This website provides public information, policies, and support for the INSTEAD mobile apps.</p>' +
      section(
        'Educational information',
        'Natural does not automatically mean safe or effective. Recipes may be untested. Read the app’s safety information and recipe-specific cautions. Content is not medical or dental advice.',
      ),
  ],
  ...['privacy', 'terms'].map(key => [
    key,
    key === 'privacy' ? 'Privacy Policy' : 'Terms of Use',
    `<p>Updated ${escape(POLICY_DATE)}</p>` +
      policyDocuments[key]
        .map(
          item =>
            `<section><h2>${escape(item.title)}</h2>${(item.paragraphs ?? [])
              .map(p => `<p>${escape(p)}</p>`)
              .join('')}${
              item.bullets
                ? `<ul>${item.bullets
                    .map(p => `<li>${escape(p)}</li>`)
                    .join('')}</ul>`
                : ''
            }</section>`,
        )
        .join(''),
  ]),
  [
    'safety',
    'Safety information',
    section(
      'Not medical advice or emergency care',
      'INSTEAD is an educational directory, not a healthcare provider or medical device. It does not diagnose, treat, cure, or prevent medical conditions. Consult a qualified healthcare professional before making health decisions. Do not delay care or change prescribed treatment because of a recipe. In immediate danger, contact local emergency services.',
    ) +
      section(
        'Natural does not mean safe',
        'Ingredient strength, allergens, compatibility, preservation, and shelf life matter. Moderation and votes are not proof of safety or effectiveness. Follow ingredient labels and recipe cautions. Never mix cleaning products unless their labels expressly permit it.',
      ) +
      section(
        'Infants and honey',
        'Never give honey or honey-containing syrups to infants under 12 months because of infant botulism risk.',
      ) +
      section(
        'Pets and essential oils',
        'Essential oils, including peppermint, tea tree, and citrus oils, can be toxic to pets. Avoid ingestion, skin contact, and concentrated exposure; ventilation alone does not establish safety. Ask a veterinarian about exposures and product suitability.',
      ),
  ],
  [
    'support',
    'Support',
    '<p>For app problems, safety concerns, privacy requests, or account-deletion requests, email <a href="mailto:info@insteadtry.com">info@insteadtry.com</a>.</p>' +
      section(
        'What to include',
        'Include the app version, device, affected topic, and what happened. Remove private information from screenshots. Never send sign-in codes, passwords, or sensitive medical information. Support is not monitored for emergencies.',
      ) +
      '<p><a href="/delete-account">Request account and data deletion</a></p>',
  ],
  ['delete-account', 'Delete your INSTEAD account', deletion],
];
await fs.mkdir(output, { recursive: true });
await fs.writeFile(
  new URL('styles.css', output),
  'body{margin:0;background:#f6f3eb;color:#20201c;font:17px/1.65 system-ui,sans-serif}header,main,footer{max-width:780px;margin:auto;padding:24px}nav{display:flex;flex-wrap:wrap;gap:18px}a{color:#265f43;text-underline-offset:4px}h1{font-size:clamp(2rem,6vw,3rem);line-height:1.15}h2{font-size:1.2rem;margin-top:2rem}main{background:#fffdf7;border:1px solid #ddd8cb;border-radius:12px}footer{font-size:.9rem}.button{display:inline-block;border:2px solid;padding:10px 16px;border-radius:6px}a:focus-visible{outline:3px solid #265f43;outline-offset:5px}',
);
for (const [route, title, body] of pages) {
  const file = path.join(
    output.pathname,
    route ? `${route}/index.html` : 'index.html',
  );
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(
      title,
    )} — INSTEAD</title><link rel="canonical" href="https://insteadtry.com/${route}"><link rel="stylesheet" href="/styles.css"></head><body><header><nav aria-label="Main navigation">${links
      .map(([href, label]) => `<a href="${href}">${label}</a>`)
      .join('')}</nav></header><main id="main"><h1>${escape(
      title,
    )}</h1>${body}</main><footer>INSTEAD, USA · <a href="mailto:info@insteadtry.com">info@insteadtry.com</a></footer></body></html>`,
  );
}
console.log(
  'Built six public, script-free policy/support pages in website/dist.',
);
