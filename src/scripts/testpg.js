const { PGlite } = require('@electric-sql/pglite');
const path = require('path');
const db = new PGlite(path.join(__dirname, 'pgdata'));
db.query('SELECT 1').then(() => console.log('Success')).catch(err => console.error(err));

