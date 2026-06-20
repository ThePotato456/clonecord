const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function loadStoreWithDataFile(dataFile) {
  process.env.CLONECORD_DATA_FILE = dataFile;

  const storePath = require.resolve('../lib/store');
  delete require.cache[storePath];

  return require('../lib/store');
}

test('readData uses CLONECORD_DATA_FILE override for isolated test state', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clonecord-store-test-'));
  const dataFile = path.join(tempDir, 'db.json');
  const payload = {
    users: [{ id: 'u-test', username: 'tester' }],
    servers: [],
    channels: [],
    messages: [],
  };

  fs.writeFileSync(dataFile, JSON.stringify(payload, null, 2));

  const store = loadStoreWithDataFile(dataFile);
  const data = store.readData();

  assert.equal(data.users[0].id, 'u-test');
  assert.equal(data.users[0].username, 'tester');
});
