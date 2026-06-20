const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const defaultDataDir = path.join(__dirname, '..', 'data');
const DEFAULT_SERVER_ID = 'hermes-hub';
const DEFAULT_CHANNEL_ID = 'general';

function getDataFilePath() {
  return process.env.CLONECORD_DATA_FILE || path.join(defaultDataDir, 'db.json');
}

function getDataDirPath() {
  return path.dirname(getDataFilePath());
}

function slugify(value, fallbackPrefix) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || `${fallbackPrefix}-${randomUUID().slice(0, 8)}`;
}

function createDefaultData() {
  const createdAt = new Date().toISOString();
  return {
    users: [],
    servers: [
      {
        id: DEFAULT_SERVER_ID,
        name: 'Hermes Hub',
        iconText: 'H',
        ownerId: 'system',
        memberIds: [],
        defaultChannelId: DEFAULT_CHANNEL_ID,
        createdAt,
      },
    ],
    channels: [
      {
        id: DEFAULT_CHANNEL_ID,
        serverId: DEFAULT_SERVER_ID,
        name: 'general',
        type: 'text',
        topic: 'Welcome to Hermes Hub',
        ownerId: 'system',
        memberIds: [],
        createdAt,
      },
    ],
    messages: [],
  };
}

function ensureDataFile() {
  const dataDir = getDataDirPath();
  const dataFile = getDataFilePath();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(createDefaultData(), null, 2));
    return;
  }

  const current = readData();
  let changed = false;

  if (!Array.isArray(current.users)) {
    current.users = [];
    changed = true;
  }

  if (!Array.isArray(current.servers)) {
    current.servers = [];
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

  let defaultServer = current.servers.find((server) => server.id === DEFAULT_SERVER_ID);
  if (!defaultServer) {
    defaultServer = createDefaultData().servers[0];
    current.servers.unshift(defaultServer);
    changed = true;
  }

  let generalChannel = current.channels.find((channel) => channel.id === DEFAULT_CHANNEL_ID);
  if (!generalChannel) {
    generalChannel = createDefaultData().channels[0];
    current.channels.unshift(generalChannel);
    changed = true;
  }

  current.channels = current.channels.map((channel) => {
    const nextChannel = { ...channel };

    if (!nextChannel.serverId) {
      nextChannel.serverId = DEFAULT_SERVER_ID;
      changed = true;
    }

    if (!Array.isArray(nextChannel.memberIds)) {
      nextChannel.memberIds = [];
      changed = true;
    }

    return nextChannel;
  });

  current.users = current.users.map((user) => {
    const nextUser = { ...user };

    if (!Array.isArray(nextUser.serverIds)) {
      const legacyChannels = Array.isArray(nextUser.channels) ? nextUser.channels : [];
      nextUser.serverIds = legacyChannels.length > 0 ? [DEFAULT_SERVER_ID] : [DEFAULT_SERVER_ID];
      changed = true;
    }

    if (!Array.isArray(nextUser.channels)) {
      nextUser.channels = [DEFAULT_CHANNEL_ID];
      changed = true;
    }

    if (!Array.isArray(nextUser.clientFingerprints)) {
      nextUser.clientFingerprints = nextUser.clientFingerprint ? [nextUser.clientFingerprint] : [];
      delete nextUser.clientFingerprint;
      changed = true;
    }

    if (!nextUser.serverIds.includes(DEFAULT_SERVER_ID)) {
      nextUser.serverIds.push(DEFAULT_SERVER_ID);
      changed = true;
    }

    if (!nextUser.channels.includes(DEFAULT_CHANNEL_ID)) {
      nextUser.channels.push(DEFAULT_CHANNEL_ID);
      changed = true;
    }

    return nextUser;
  });

  defaultServer.memberIds = Array.from(new Set(current.users.map((user) => user.id).filter(Boolean)));
  defaultServer.defaultChannelId = defaultServer.defaultChannelId || DEFAULT_CHANNEL_ID;
  generalChannel.memberIds = Array.from(new Set(current.users.map((user) => user.id).filter(Boolean)));
  generalChannel.serverId = DEFAULT_SERVER_ID;

  if (changed) {
    writeData(current);
  }
}

function readData() {
  const dataFile = getDataFilePath();

  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (error) {
    return createDefaultData();
  }
}

function writeData(data) {
  const dataFile = getDataFilePath();
  const dataDir = getDataDirPath();

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function slugifyChannelName(name) {
  return slugify(name, 'channel');
}

function slugifyServerName(name) {
  return slugify(name, 'server');
}

function makeDmKey(userA, userB) {
  return [String(userA), String(userB)].sort().join(':');
}

ensureDataFile();

module.exports = {
  DEFAULT_CHANNEL_ID,
  DEFAULT_SERVER_ID,
  ensureDataFile,
  makeDmKey,
  randomUUID,
  readData,
  slugifyChannelName,
  slugifyServerName,
  writeData,
};
