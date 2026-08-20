const bcrypt = require('bcryptjs');
const password = process.argv.slice(2).join(' ');
if (!password) {
  console.error('Użycie: npm run hash-password -- "TwojeMocneHaslo"');
  process.exit(1);
}
console.log(bcrypt.hashSync(password, 12));
