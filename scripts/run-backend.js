const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');

function checkPortInUse(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/api/health`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function findPython() {
  const candidates = [
    path.join(backendDir, 'venv', 'Scripts', 'python.exe'),
    path.join(rootDir, 'venv', 'Scripts', 'python.exe'),
    path.join(backendDir, 'venv', 'bin', 'python'),
    path.join(rootDir, 'venv', 'bin', 'python'),
    'python',
    'python3'
  ];

  for (const cand of candidates) {
    if (cand.includes(path.sep)) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }
  }

  // Fallback to python command in PATH
  return process.platform === 'win32' ? 'python' : 'python3';
}

async function start() {
  const isRunning = await checkPortInUse(5000);
  if (isRunning) {
    console.log('[Backend] Python Flask backend is already running on http://127.0.0.1:5000');
    // Keep process alive while proxying
    setInterval(() => {}, 60000);
    return;
  }

  const pythonBin = findPython();
  console.log(`[Backend] Using Python: ${pythonBin}`);
  console.log(`[Backend] Launching Flask server on http://127.0.0.1:5000 ...`);

  const child = spawn(pythonBin, ['app.py'], {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true
  });

  child.on('error', (err) => {
    console.error('[Backend] Failed to start Python backend:', err.message);
  });

  child.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`[Backend] Flask server exited with code ${code}`);
    }
  });

  const cleanup = () => {
    if (child && !child.killed) {
      child.kill();
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

start();
