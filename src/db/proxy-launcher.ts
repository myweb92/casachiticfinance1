import { execSync, exec } from 'child_process';
import fs from 'fs';

export function ensureProxy() {
  // Only attempt to manage proxy in development/dev-server context
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  console.log('[Proxy Launcher] Ensuring healthy Cloud SQL Proxy...');

  let shouldStart = false;
  let runningPid: string | null = null;

  try {
    const ps = execSync('ps aux | grep cloud_sql_proxy | grep -v grep').toString();
    
    if (!ps.includes('ai-studio-97696323') || ps.includes('--impersonate-service-account')) {
      console.log('[Proxy Launcher] Detected incorrect, stale, or broken proxy. Re-spawning...');
      const firstLine = ps.trim().split('\n')[0].trim();
      const parts = firstLine.split(/\s+/);
      runningPid = parts[1];
      shouldStart = true;
    } else if (!ps.trim()) {
      console.log('[Proxy Launcher] No proxy is running. Starting custom proxy...');
      shouldStart = true;
    }
  } catch (err) {
    // Grep returns non-zero when no lines match, which throws an error in execSync
    console.log('[Proxy Launcher] Grep indicated no proxy process running. Starting custom proxy...');
    shouldStart = true;
  }

  if (shouldStart) {
    if (runningPid) {
      try {
        console.log(`[Proxy Launcher] Killing broken proxy PID: ${runningPid}`);
        process.kill(parseInt(runningPid), 'SIGKILL');
      } catch (e: any) {
        console.error('[Proxy Launcher] Failed to kill broken proxy:', e.message);
      }
    }

    // Delete the socket file to avoid "address already in use"
    const socketPath = '/app/cloudsql/versatile-computer-t71nt:europe-west2:ai-studio-97696323/.s.PGSQL.5432';
    if (fs.existsSync(socketPath)) {
      console.log('[Proxy Launcher] Socket file exists on disk. Unlinking...');
      try {
        fs.unlinkSync(socketPath);
      } catch (e: any) {
        console.error('[Proxy Launcher] Failed to unlink socket file:', e.message);
      }
    }

    // Launch custom proxy in background
    console.log('[Proxy Launcher] Spawning custom proxy WITHOUT impersonation...');
    const cmd = '/app/cloud_sql_proxy versatile-computer-t71nt:europe-west2:ai-studio-97696323 --unix-socket=/app/cloudsql --sql-data --sql-data-endpoint=sqladmin.googleapis.com --sqladmin-api-endpoint=sqladmin.googleapis.com > /tmp/proxy.log 2>&1 &';
    try {
      exec(cmd);
      // Wait a moment for initialization
      execSync('sleep 2');
      console.log('[Proxy Launcher] Custom proxy spawned successfully.');
    } catch (e: any) {
      console.error('[Proxy Launcher] Failed to spawn custom proxy:', e.message);
    }
  } else {
    console.log('[Proxy Launcher] Correct proxy is already running.');
  }
}
