const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'db.json');

const defaultData = {
  users: [],
  channels: [
    {
      id: 'general',
      name: 'general',
      type: 'text',
      topic: 'Welcome to the server',
      ownerId: 'system',
      memberIds: [],
      createdAt: new Date().toISOString(),
    },
  ],
  messages: [],
};

function ensureDataFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2));
    return;
  }

  const current = readData();
  let changed = false;

  if (!Array.isArray(current.users)) {
    current.users = [];
    changed = true;
  }

  if (!Array.isArray(current.channels)) {
    current.channels = [];
    changed = true;
  }

  if (!Array.isArray(current.messages)) {
    current.messages = [];
    changed = true;
  }

  if (!current.channels.find((channel) => channel.id === 'general')) {
    current.channels.unshift({ ...defaultData.channels[0] });
    changed = true;
  }

  if (changed) {
    writeData(current);
  }
}

function readData() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (error) {
    return JSON.parse(JSON.stringify(defaultData));
  }
}

function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function slugifyChannelName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `channel-${randomUUID().slice(0, 8)}`;
}

ensureDataFile();

module.exports = {
  ensureDataFile,
  readData,
  writeData,
  slugifyChannelName,
  randomUUID,
};
