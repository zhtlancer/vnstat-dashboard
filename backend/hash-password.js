// Generate a value for AUTH_PASSWORD_HASH.
// Usage: docker run --rm -it vnstat-dashboard node hash-password.js
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stderr, terminal: true });
let muted = false;
rl._writeToOutput = s => { if (!muted) rl.output.write(s); };

const ask = prompt => new Promise(resolve => {
  muted = false;
  rl.question(prompt, answer => { rl.output.write('\n'); resolve(answer); });
  muted = true;
});

(async () => {
  const password = await ask('Password: ');
  const confirm = await ask('Confirm password: ');
  rl.close();
  if (!password) {
    console.error('Password must not be empty.');
    process.exit(1);
  }
  if (password !== confirm) {
    console.error('Passwords do not match.');
    process.exit(1);
  }
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  console.log(`AUTH_PASSWORD_HASH=scrypt:${salt.toString('hex')}:${hash.toString('hex')}`);
})();
