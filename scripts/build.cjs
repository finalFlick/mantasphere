#!/usr/bin/env node
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

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
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) env[match[1].trim()] = match[2].trim();
    }
    return env;
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
