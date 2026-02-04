import fs from 'node:fs';
import https from 'node:https';
import crypto from 'node:crypto';

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  // Windows tools sometimes write UTF-8 with BOM; JSON.parse will fail unless we strip it.
  const withoutBom = raw.replace(/^\uFEFF/, '');
  return JSON.parse(withoutBom);
}

function signAppJwt({ appId, privateKeyPem }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60, // max 10 minutes
    iss: String(appId)
  };

  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(data), privateKeyPem);
  return `${data}.${base64url(signature)}`;
}

function requestJson({ method, path, bearerToken, body }) {
  const bodyStr = body ? JSON.stringify(body) : null;

  const options = {
    hostname: 'api.github.com',
    port: 443,
    method,
    path,
    headers: {
      'User-Agent': 'mantasphere-gh-app-auth',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      ...(bodyStr
        ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyStr)
          }
        : {})
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (!ok) {
          return reject(
            new Error(
              `GitHub API ${method} ${path} failed: ${res.statusCode}\n${data.slice(0, 2000)}`
            )
          );
        }
        if (!data) return resolve(null);
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Failed to parse JSON response from ${method} ${path}`));
        }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function parseArgs(argv) {
  const args = { config: '.secrets/github-app.json', repo: null, raw: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') args.config = argv[++i];
    else if (a === '--repo') args.repo = argv[++i];
    else if (a === '--raw') args.raw = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.repo) {
    console.log(`Usage:
  node scripts/gh-app-auth.js --repo owner/name [--config .secrets/github-app.json] [--raw]

Prints a short-lived GitHub App installation token for the repo.
`);
    process.exit(args.help ? 0 : 1);
  }

  const cfg = readJson(args.config);
  if (!cfg?.appId || !cfg?.privateKeyPath) {
    throw new Error(
      `Invalid config at ${args.config}. Expected: { "appId": number, "privateKeyPath": string }`
    );
  }

  const privateKeyPem = fs.readFileSync(cfg.privateKeyPath, 'utf8');
  const appJwt = signAppJwt({ appId: cfg.appId, privateKeyPem });

  const [owner, repo] = args.repo.split('/');
  if (!owner || !repo) throw new Error(`Invalid --repo. Expected "owner/name", got "${args.repo}"`);

  // 1) Fetch installation info for this repo (tells us installation id)
  const install = await requestJson({
    method: 'GET',
    path: `/repos/${owner}/${repo}/installation`,
    bearerToken: appJwt
  });

  const installationId = install?.id;
  if (!installationId) throw new Error('Could not determine installation id for repo.');

  // 2) Exchange for installation token
  const tokenResp = await requestJson({
    method: 'POST',
    path: `/app/installations/${installationId}/access_tokens`,
    bearerToken: appJwt,
    body: {}
  });

  const token = tokenResp?.token;
  if (!token) throw new Error('No token returned from access_tokens.');

  process.stdout.write(args.raw ? token : `GH_TOKEN=${token}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

