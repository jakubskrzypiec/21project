#!/usr/bin/env node
'use strict';
/**
 * Generuje hash hasła administratora do wklejenia w .env jako ADMIN_PASSWORD_HASH.
 * Użycie:  npm run set-password -- "moje-haslo"
 *          npm run set-password           (zapyta interaktywnie)
 */
const bcrypt = require('bcryptjs');
const readline = require('readline');
const crypto = require('crypto');

async function main() {
  let password = process.argv[2];
  if (!password) password = await ask('Nowe hasło administratora: ');
  if (!password || password.length < 10) {
    console.error('Hasło musi mieć co najmniej 10 znaków.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log('\nWklej do pliku .env:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log(`JWT_SECRET=${crypto.randomBytes(48).toString('base64url')}   # tylko jeśli jeszcze go nie masz\n`);
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(q, (a) => { rl.close(); resolve(a.trim()); }));
}

main();
