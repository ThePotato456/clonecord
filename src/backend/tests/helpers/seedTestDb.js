const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function createSeededTestDb(seed) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clonecord-test-db-'));
  const dataFile = path.join(tempDir, 'db.json');

  fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2));

  return {
    dataFile,
    tempDir,
    cleanup() {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

module.exports = {
  createSeededTestDb,
};
