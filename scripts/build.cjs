#!/usr/bin/env node
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse .env file
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        console.warn('⚠ No .env file found. Copy .env.example to .env and fill in values.');
        return {};
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
        // Remove carriage returns and trim
        const cleanLine = line.replace(/\r$/, '').trim();
        // Skip empty lines and comments
        if (!cleanLine || cleanLine.startsWith('#')) continue;
        
        const match = cleanLine.match(/^([^#=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            env[key] = value;
        }
    }
    return env;
}

function getCommitHash() {
    try {
        return execSync('git rev-parse --short HEAD', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return 'unknown';
    }
}

function getCommitTimeIso() {
    try {
        return execSync('git show -s --format=%cI HEAD', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return 'unknown';
    }
}

function getBuildTimeIso() {
    return new Date().toISOString();
}

const env = loadEnv();
const isProd = process.argv.includes('--prod');
const isWatch = process.argv.includes('--watch');
const isServe = process.argv.includes('--serve');

// Ensure dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
}

const config = {
    entryPoints: ['js/main.js'],
    bundle: true,
    outfile: 'dist/bundle.js',
    format: 'esm',
    minify: isProd,
    sourcemap: !isProd,
    define: {
        'ENV_DEBUG_SECRET': isProd ? 'false' : 'true',
        'ENV_PLAYTEST_URL': JSON.stringify(env.PLAYTEST_URL || ''),
        'ENV_PLAYTEST_TOKEN': JSON.stringify(env.PLAYTEST_TOKEN || ''),
        'ENV_COMMIT_HASH': JSON.stringify(getCommitHash()),
        'ENV_COMMIT_TIME_ISO': JSON.stringify(getCommitTimeIso()),
        'ENV_BUILD_TIME_ISO': JSON.stringify(getBuildTimeIso()),
    }
};

async function build() {
    if (isWatch && isServe) {
        // All-in-one mode: watch + serve
        const ctx = await esbuild.context(config);
        const { port } = await ctx.serve({
            servedir: '.',
            port: 8000,
        });
        console.log(`🚀 Dev server running at http://localhost:${port}`);
        console.log('   Auto-rebuilds on file changes');
        console.log('   DEBUG_SECRET=true, refresh browser to see changes');
    } else if (isWatch) {
        // Watch only mode (use with external server like Python)
        const ctx = await esbuild.context(config);
        await ctx.watch();
        console.log('👀 Watching for changes... (DEBUG_SECRET=true)');
        console.log('   Run "python -m http.server 8000" in another terminal');
    } else {
        // One-time build
        esbuild.buildSync(config);
        const stats = fs.statSync('dist/bundle.js');
        const mode = isProd ? 'PROD' : 'DEV';
        const debugStatus = isProd ? 'false' : 'true';
        console.log(`✓ dist/bundle.js (${Math.round(stats.size / 1024)}KB) [${mode}, DEBUG_SECRET=${debugStatus}]`);
    }
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});
