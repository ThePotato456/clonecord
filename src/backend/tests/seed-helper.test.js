const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { createSeededTestDb } = require('./helpers/seedTestDb');

test('createSeededTestDb writes a seeded isolated db file', () => {
  const seed = {
    users: [{ id: 'u-seeded', username: 'seeded-user' }],
    servers: [],
    channels: [],
    messages: [],
  };

  const seeded = createSeededTestDb(seed);
  const fileContents = JSON.parse(fs.readFileSync(seeded.dataFile, 'utf8'));

  assert.equal(fileContents.users[0].id, 'u-seeded');
  assert.equal(fileContents.users[0].username, 'seeded-user');
  assert.equal(typeof seeded.cleanup, 'function');

  seeded.cleanup();
  assert.equal(fs.existsSync(seeded.dataFile), false);
});
