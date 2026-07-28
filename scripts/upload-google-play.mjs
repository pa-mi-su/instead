import { createSign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const requiredEnvironment = [
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_PLAY_PACKAGE_NAME',
  'GOOGLE_PLAY_BUNDLE_PATH',
  'GOOGLE_PLAY_TRACK',
];

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
const bundlePath = process.env.GOOGLE_PLAY_BUNDLE_PATH;
const track = process.env.GOOGLE_PLAY_TRACK;
const status = process.env.GOOGLE_PLAY_RELEASE_STATUS ?? 'completed';
const releaseName =
  process.env.GOOGLE_PLAY_RELEASE_NAME ??
  `INSTEAD ${process.env.GITHUB_SHA?.slice(0, 7) ?? 'manual'}`;

if (!existsSync(credentialsPath)) {
  throw new Error(`Google Play credentials file not found: ${credentialsPath}`);
}

if (!existsSync(bundlePath)) {
  throw new Error(`Android App Bundle not found: ${bundlePath}`);
}

const supportedStatuses = new Set([
  'completed',
  'draft',
  'halted',
  'inProgress',
]);
if (!supportedStatuses.has(status)) {
  throw new Error(`Unsupported Google Play release status: ${status}`);
}

const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
if (!credentials.client_email || !credentials.private_key) {
  throw new Error('Google Play credentials are missing required fields.');
}

const tokenUri = credentials.token_uri ?? 'https://oauth2.googleapis.com/token';
const issuedAt = Math.floor(Date.now() / 1000);
const encode = value =>
  Buffer.from(JSON.stringify(value)).toString('base64url');
const unsignedToken = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
  iss: credentials.client_email,
  scope: 'https://www.googleapis.com/auth/androidpublisher',
  aud: tokenUri,
  iat: issuedAt,
  exp: issuedAt + 3600,
})}`;
const signer = createSign('RSA-SHA256');
signer.update(unsignedToken);
signer.end();
const assertion = `${unsignedToken}.${signer.sign(
  credentials.private_key,
  'base64url',
)}`;

const tokenResponse = await fetch(tokenUri, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  }),
});
if (!tokenResponse.ok) {
  throw new Error(
    `Google OAuth token request failed with HTTP ${tokenResponse.status}.`,
  );
}
const token = await tokenResponse.json();
if (!token.access_token) {
  throw new Error(
    'Google OAuth token response did not include an access token.',
  );
}

async function googleRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${token.access_token}`,
      ...options.headers,
    },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `Google Play request failed with HTTP ${response.status}: ${body.slice(
        0,
        500,
      )}`,
    );
  }
  return body ? JSON.parse(body) : {};
}

const encodedPackageName = encodeURIComponent(packageName);
const baseUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodedPackageName}`;
const edit = await googleRequest(`${baseUrl}/edits`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}',
});
const editId = edit.id;
if (!editId) {
  throw new Error('Google Play did not return an edit ID.');
}

try {
  const uploadUrl =
    `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/` +
    `${encodedPackageName}/edits/${encodeURIComponent(
      editId,
    )}/bundles?uploadType=media`;
  const uploaded = await googleRequest(uploadUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body: readFileSync(bundlePath),
  });
  const versionCode = uploaded.versionCode;
  if (!versionCode) {
    throw new Error('Google Play did not return the uploaded version code.');
  }

  await googleRequest(
    `${baseUrl}/edits/${encodeURIComponent(editId)}/tracks/${encodeURIComponent(
      track,
    )}`,
    {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        track,
        releases: [
          {
            name: releaseName,
            status,
            versionCodes: [String(versionCode)],
          },
        ],
      }),
    },
  );
  await googleRequest(`${baseUrl}/edits/${encodeURIComponent(editId)}:commit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  console.log(
    `Uploaded ${packageName} version ${versionCode} to ${track} with status ${status}.`,
  );
} catch (error) {
  await googleRequest(`${baseUrl}/edits/${encodeURIComponent(editId)}`, {
    method: 'DELETE',
  }).catch(() => undefined);
  throw error;
}
