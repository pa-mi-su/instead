import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateWebsite(directory, sha) {
  if (!/^[a-f0-9]{40}$/.test(sha ?? ''))
    throw new Error('Website deployment requires an exact commit SHA');
  for (const file of [
    'index.html',
    'privacy/index.html',
    'terms/index.html',
    'safety/index.html',
    'support/index.html',
    'delete-account/index.html',
    'admin/index.html',
    'admin/admin.mjs',
    'admin/config.mjs',
    'admin/builtin-recipes.json',
    'deployment.json',
  ]) {
    const target = path.join(directory, file);
    if (!existsSync(target) || readFileSync(target).length === 0)
      throw new Error(`Missing or empty website output: ${file}`);
  }
  if (
    JSON.parse(readFileSync(path.join(directory, 'deployment.json'), 'utf8'))
      .sha !== sha
  )
    throw new Error('Website output is from a different commit');
}

export async function deployWebsite({
  directory,
  sha,
  run = args => execFileSync('aws', args, { encoding: 'utf8' }),
  fetcher = fetch,
  pause = ms => new Promise(resolve => setTimeout(resolve, ms)),
  maxAttempts = 30,
}) {
  validateWebsite(directory, sha);
  // Complete uploads before invalidating. Revalidate unversioned admin/config
  // files rather than allowing a browser to retain an old authentication shell.
  run([
    's3',
    'cp',
    directory,
    's3://insteadtry-website-160885294528/',
    '--recursive',
    '--cache-control',
    'no-cache',
    '--no-cli-pager',
  ]);
  const result = JSON.parse(
    run([
      'cloudfront',
      'create-invalidation',
      '--distribution-id',
      'EMXS0LG36D5KE',
      '--paths',
      '/*',
      '--output',
      'json',
      '--no-cli-pager',
    ]),
  );
  const id = result.Invalidation?.Id;
  if (!id) throw new Error('CloudFront did not return an invalidation ID');
  // The existing deployment role can create invalidations but cannot read
  // their status. Verify the actual public files without expanding IAM access.
  // No cache-busting query: readers must receive the new unversioned URLs.
  const checks = [
    ['deployment.json', '/deployment.json'],
    ['privacy/index.html', '/privacy'],
    ['terms/index.html', '/terms'],
    ['support/index.html', '/support'],
    ['delete-account/index.html', '/delete-account'],
    ['admin/index.html', '/admin/'],
    ['admin/config.mjs', '/admin/config.mjs'],
    ['admin/admin.mjs', '/admin/admin.mjs'],
  ];
  const deadline = Date.now() + 600000;
  let problem = 'Public website verification did not complete';
  for (
    let attempt = 0;
    attempt < maxAttempts && Date.now() < deadline;
    attempt++
  ) {
    try {
      for (const [file, route] of checks) {
        const remaining = deadline - Date.now();
        if (remaining <= 0)
          throw new Error('Public website verification timed out');
        const page = await fetcher(`https://insteadtry.com${route}`, {
          signal: AbortSignal.timeout(Math.min(30000, remaining)),
          cache: 'no-store',
        });
        if (
          !page.ok ||
          (await page.text()) !==
            readFileSync(path.join(directory, file), 'utf8')
        )
          throw new Error(
            `Public website does not serve this commit: ${route}`,
          );
      }
      return id;
    } catch (error) {
      problem = error.message;
      if (attempt + 1 < maxAttempts && Date.now() < deadline)
        await pause(Math.min(10000, Math.max(0, deadline - Date.now())));
    }
  }
  throw new Error(problem);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await deployWebsite({
    directory: 'website/dist',
    sha: process.env.GITHUB_SHA,
  });
  console.log(
    'Website uploaded, invalidation requested, public commit and critical files verified.',
  );
}
