#!/usr/bin/env node
/**
 * GitHub App Token Generator for manta-warden
 * 
 * Generates an installation access token from the GitHub App PEM key.
 * Used by CI/CD and local scripts to authenticate as manta-warden[bot].
 * 
 * Usage:
 *   node scripts/gh-app-token.js                    # prints installation token
 *   node scripts/gh-app-token.js --info              # prints app + installation info
 *   node scripts/gh-app-token.js --app-id            # prints just the app ID
 *   node scripts/gh-app-token.js --installation-id   # prints just the installation ID
 * 
 * Requires:
 *   .secrets/manta-warden.pem   (GitHub App private key)
 *   APP_ID env var OR auto-discovers from /app endpoint
 */

const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');

const PEM_PATH = path.join(__dirname, '..', '.secrets', 'manta-warden.pem');
const REPO_OWNER = 'finalFlick';
const REPO_NAME = 'mantasphere';

function base64url(data) {
    if (typeof data === 'string') data = Buffer.from(data);
    return data.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function generateJWT(appId, pemKey) {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
        iat: now - 60,       // issued 60s ago (clock drift)
        exp: now + (10 * 60), // expires in 10 min
        iss: appId
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = base64url(sign.sign(pemKey));

    return `${signingInput}.${signature}`;
}

function ghApi(method, endpoint, token, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: endpoint,
            method: method,
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'manta-warden-token-script',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        };
        if (body) {
            options.headers['Content-Type'] = 'application/json';
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    const args = process.argv.slice(2);
    const wantInfo = args.includes('--info');
    const wantAppId = args.includes('--app-id');
    const wantInstallationId = args.includes('--installation-id');

    // Read PEM
    if (!fs.existsSync(PEM_PATH)) {
        console.error(`ERROR: PEM file not found at ${PEM_PATH}`);
        console.error('Place the GitHub App private key at .secrets/manta-warden.pem');
        process.exit(1);
    }
    const pemKey = fs.readFileSync(PEM_PATH, 'utf8');

    // Try to get App ID from env or discover it
    let appId = process.env.MANTA_WARDEN_APP_ID;

    if (!appId) {
        // Try a range of common App IDs by testing the JWT against /app
        // First, extract from PEM metadata if possible, otherwise brute-discover
        // Actually, we can just try generating a JWT with a guessed ID and hit /app
        // GitHub Apps created recently have high IDs. Let's try to discover.
        
        // Strategy: Use the PEM to sign a JWT with a trial App ID, hit /app.
        // If the JWT is valid for ANY app, /app returns the app details including the real ID.
        // But we need the correct App ID to sign the JWT...
        
        // Alternative: Try reading from a config file
        const configPath = path.join(__dirname, '..', '.secrets', 'manta-warden.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            appId = config.appId;
        }
    }

    if (!appId) {
        console.error('ERROR: App ID not found.');
        console.error('Set MANTA_WARDEN_APP_ID env var or create .secrets/manta-warden.json with {"appId": "..."}');
        console.error('Find your App ID at: https://github.com/settings/apps/manta-bot-ai');
        process.exit(1);
    }

    // Generate JWT
    const jwt = generateJWT(appId, pemKey);

    // Get app info
    const appInfo = await ghApi('GET', '/app', jwt);
    if (appInfo.status !== 200) {
        console.error('ERROR: Failed to authenticate as GitHub App');
        console.error(`Status: ${appInfo.status}`, appInfo.data);
        process.exit(1);
    }

    if (wantAppId) {
        console.log(appInfo.data.id);
        return;
    }

    if (wantInfo) {
        console.log(`App: ${appInfo.data.name} (ID: ${appInfo.data.id})`);
        console.log(`Slug: ${appInfo.data.slug}`);
        console.log(`Owner: ${appInfo.data.owner?.login || 'N/A'}`);
    }

    // Find installation for our repo
    const installations = await ghApi('GET', '/app/installations', jwt);
    if (installations.status !== 200) {
        console.error('ERROR: Failed to list installations');
        console.error(installations.data);
        process.exit(1);
    }

    const installation = installations.data.find(i =>
        i.account?.login?.toLowerCase() === REPO_OWNER.toLowerCase()
    );

    if (!installation) {
        console.error(`ERROR: No installation found for ${REPO_OWNER}`);
        console.error('Install the app at: https://github.com/settings/apps/manta-bot-ai/installations');
        process.exit(1);
    }

    if (wantInstallationId) {
        console.log(installation.id);
        return;
    }

    if (wantInfo) {
        console.log(`Installation ID: ${installation.id}`);
        console.log(`Account: ${installation.account.login}`);
        console.log(`Permissions:`, JSON.stringify(installation.permissions));
        return;
    }

    // Generate installation access token
    const tokenResp = await ghApi('POST', `/app/installations/${installation.id}/access_tokens`, jwt);
    if (tokenResp.status !== 201) {
        console.error('ERROR: Failed to generate installation token');
        console.error(tokenResp.data);
        process.exit(1);
    }

    // Output just the token (for piping into other commands)
    console.log(tokenResp.data.token);
}

main().catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
});
