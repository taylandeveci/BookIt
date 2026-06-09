#!/usr/bin/env node
// Starts backend + ngrok tunnel, updates .env with public URL, then starts Expo.
// Usage: node scripts/start-tunnel.js

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const BACKEND_DIR = '/Users/taylandeveci/BookIT-backend';
const NGROK_BIN = path.join(ROOT, 'node_modules/.bin/ngrok');
const BACKEND_PORT = 3000;
const NGROK_API = 'http://localhost:4040/api/tunnels';

function killPorts() {
  ['3000', '4040', '8081', '8082'].forEach(port => {
    try { execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' }); } catch {}
  });
}

function updateEnv(url) {
  let content = fs.readFileSync(ENV_FILE, 'utf8');
  content = content.replace(/^EXPO_PUBLIC_API_URL=.*/m, `EXPO_PUBLIC_API_URL=${url}`);
  fs.writeFileSync(ENV_FILE, content);
  console.log(`\n✓ .env updated: EXPO_PUBLIC_API_URL=${url}\n`);
}

function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      http.get(NGROK_API, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const tunnels = JSON.parse(data).tunnels;
            const https = tunnels.find(t => t.proto === 'https');
            if (https) return resolve(https.public_url);
          } catch {}
          if (attempts < 30) return setTimeout(check, 1000);
          reject(new Error('ngrok URL alınamadı'));
        });
      }).on('error', () => {
        if (attempts < 30) return setTimeout(check, 1000);
        reject(new Error('ngrok başlatılamadı'));
      });
    };
    check();
  });
}

async function main() {
  console.log('Portlar temizleniyor...');
  killPorts();
  await new Promise(r => setTimeout(r, 1000));

  console.log('Backend başlatılıyor...');
  const backend = spawn('npm', ['run', 'dev'], {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
    detached: false,
  });

  console.log('ngrok başlatılıyor (port 3000)...');
  const ngrok = spawn(NGROK_BIN, ['http', String(BACKEND_PORT)], {
    stdio: 'ignore',
    detached: false,
  });

  console.log('ngrok URL bekleniyor...');
  try {
    const url = await getNgrokUrl();
    updateEnv(url);
  } catch (err) {
    console.error('HATA:', err.message);
    process.exit(1);
  }

  console.log('Expo başlatılıyor...');
  const expo = spawn(
    'npx',
    ['expo', 'start', '--go', '--clear'],
    { cwd: ROOT, stdio: 'inherit', detached: false }
  );

  const cleanup = () => {
    backend.kill();
    ngrok.kill();
    expo.kill();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

main().catch(err => { console.error(err); process.exit(1); });
