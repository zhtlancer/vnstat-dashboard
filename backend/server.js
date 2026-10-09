const express = require('express');
const crypto = require('crypto');
const { execFile, execFileSync } = require('child_process');
const path = require('path');
const app = express();
app.disable('x-powered-by');

// ----- Optional HTTP Basic auth -----
// Enabled when AUTH_USER and AUTH_PASSWORD_HASH are set.
// AUTH_PASSWORD_HASH format: scrypt:<salt hex>:<hash hex> (generate with `node hash-password.js`)
const AUTH_USER = process.env.AUTH_USER || '';
const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH || '';

if (AUTH_USER || AUTH_PASSWORD_HASH) {
  const [scheme, saltHex, hashHex] = AUTH_PASSWORD_HASH.split(':');
  if (!AUTH_USER || scheme !== 'scrypt' || !saltHex || !hashHex) {
    // fail closed rather than serving the dashboard unauthenticated
    console.error('❌ AUTH_USER and AUTH_PASSWORD_HASH (scrypt:<salt>:<hash>) must both be set.');
    process.exit(1);
  }
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const expectedUser = Buffer.from(AUTH_USER);

  // scrypt is deliberately slow; remember digests of headers that already passed
  const verified = new Set();
  const digest = s => crypto.createHash('sha256').update(s).digest('hex');

  const deny = res => res
    .set('WWW-Authenticate', 'Basic realm="vnstat-dashboard", charset="UTF-8"')
    .status(401)
    .send('Authentication required');

  app.use((req, res, next) => {
    if (req.path === '/healthz') return next();

    const [type, encoded] = (req.headers.authorization || '').split(' ');
    if (type !== 'Basic' || !encoded) return deny(res);
    const key = digest(encoded);
    if (verified.has(key)) return next();

    const decoded = Buffer.from(encoded, 'base64').toString();
    const sep = decoded.indexOf(':');
    if (sep < 0) return deny(res);
    const user = Buffer.from(decoded.slice(0, sep));
    const password = decoded.slice(sep + 1);

    crypto.scrypt(password, salt, expected.length, (err, actual) => {
      const userOk = user.length === expectedUser.length && crypto.timingSafeEqual(user, expectedUser);
      if (err || !userOk || !crypto.timingSafeEqual(actual, expected)) {
        console.warn(`🔒 Failed login from ${req.ip}`);
        return deny(res);
      }
      if (verified.size >= 100) verified.clear();
      verified.add(key);
      next();
    });
  });
  console.log(`🔒 Basic auth enabled for user "${AUTH_USER}"`);
}

// ----- Dynamic interface allowlist -----
const ALLOWED_PREFIXES = (process.env.ALLOWED_PREFIXES || 'eth,enp,wlan,wlp,tailscale,docker')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ENV_IFACES = (process.env.ALLOWED_INTERFACES || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const DENY_PATTERNS = [
  /^veth/i, /^br[-:]/i, /^lo$/i, /^tap/i, /^tun/i, /^wg/i,
];
const isDenied = name => DENY_PATTERNS.some(rx => rx.test(name));
const isAllowedByPrefix = name => ALLOWED_PREFIXES
  .some(p => name.toLowerCase().startsWith(p.toLowerCase()));

let ALLOWED_INTERFACES = [];
if (ENV_IFACES.length) {
  // explicit list via env has priority
  ALLOWED_INTERFACES = ENV_IFACES;
} else {
  try {
    // read interfaces from the database, so no access to the host's network namespace is needed
    const out = execFileSync('vnstat', ['--dbiflist'], { encoding: 'utf8' });
    // e.g. "Interfaces in database: eth0 wlan0"
    const line = out.split('\n').find(l => /interfaces[^:]*:/i.test(l));
    const listPart = line ? line.replace(/^[^:]*interfaces[^:]*:\s*/i, '') : '';
    if (listPart) {
      ALLOWED_INTERFACES = listPart
        .split(/\s+/)
        .filter(tok => /^[a-z0-9:_-]+$/i.test(tok))  // drop "(100" "Mbit)" etc.
        .filter(name => !isDenied(name))
        .filter(name => isAllowedByPrefix(name));
    }
    console.log('✅ Detected interfaces:', ALLOWED_INTERFACES.join(', ') || '(none)');
  } catch (e) {
    console.warn('⚠️ Could not auto-detect vnstat interfaces:', e.message);
  }
}
if (ALLOWED_INTERFACES.length === 0) {
  ALLOWED_INTERFACES = ['eth0', 'wlan0', 'tailscale0', 'docker0'];
  console.log('ℹ️ Using fallback interfaces:', ALLOWED_INTERFACES.join(', '));
}
const ALLOWED_SET = new Set(ALLOWED_INTERFACES);

const FRONTEND_DIR = process.env.FRONTEND_DIR || 'frontend-build';
app.use(express.static(path.join(__dirname, '..', FRONTEND_DIR)));

app.get('/api/interfaces', (_req, res) => {
  res.json({ interfaces: ALLOWED_INTERFACES });
});

app.get('/api/vnstat/:iface', (req, res) => {
  const iface = req.params.iface;
  if (!ALLOWED_SET.has(iface)) {
    return res.status(400).json({ error: 'Invalid interface' });
  }
  execFile('vnstat', ['-i', iface, '--json'], (error, stdout, stderr) => {
    if (error) {
      console.error(`vnstat failed for ${iface}:`, stderr || error.message);
      return res.status(500).json({ error: 'Failed to query vnstat.' });
    }
    try {
      const data = JSON.parse(stdout);
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse vnstat output.' });
    }
  });
});

// Heath Check
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Serve React frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', FRONTEND_DIR, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));