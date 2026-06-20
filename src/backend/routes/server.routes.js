const express = require('express');
const { authenticateToken } = require('../lib/auth');
const { randomUUID, readData, slugifyChannelName, slugifyServerName, writeData } = require('../lib/store');

const router = express.Router();

function getMembershipScopedServer(db, serverId, userId) {
  return db.servers.find((server) => server.id === serverId && (server.memberIds || []).includes(userId));
}

router.get('/', authenticateToken, (req, res) => {
  const db = readData();
  const servers = db.servers.filter((server) => (server.memberIds || []).includes(req.user.userId));
  return res.json(servers);
});

router.post('/', authenticateToken, (req, res) => {
  const { name, iconText = '' } = req.body;
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Server name must be at least 2 characters' });
  }

  const db = readData();
  const serverId = slugifyServerName(name);
  if (db.servers.some((server) => server.id === serverId || server.name.toLowerCase() === String(name).trim().toLowerCase())) {
    return res.status(409).json({ error: 'Server already exists' });
  }

  const channelId = slugifyChannelName('general');
  const createdAt = new Date().toISOString();
  const server = {
    id: serverId,
    name: String(name).trim(),
    iconText: String(iconText || name).trim().charAt(0).toUpperCase() || 'S',
    ownerId: req.user.userId,
    memberIds: [req.user.userId],
    defaultChannelId: channelId,
    createdAt,
  };
  const channel = {
    id: channelId,
    serverId,
    name: 'general',
    type: 'text',
    topic: `Welcome to ${server.name}`,
    ownerId: req.user.userId,
    memberIds: [req.user.userId],
    createdAt,
  };

  db.servers.push(server);
  db.channels.push(channel);

  const user = db.users.find((entry) => entry.id === req.user.userId);
  if (user) {
    user.serverIds = Array.from(new Set([...(user.serverIds || []), server.id]));
    user.channels = Array.from(new Set([...(user.channels || []), channel.id]));
  }

  writeData(db);
  return res.status(201).json({ server, defaultChannel: channel });
});

router.get('/:serverId', authenticateToken, (req, res) => {
  const db = readData();
  const server = getMembershipScopedServer(db, req.params.serverId, req.user.userId);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  return res.json(server);
});

router.get('/:serverId/channels', authenticateToken, (req, res) => {
  const db = readData();
  const server = getMembershipScopedServer(db, req.params.serverId, req.user.userId);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  const channels = db.channels.filter((channel) => channel.serverId === server.id);
  return res.json(channels);
});

router.post('/:serverId/channels', authenticateToken, (req, res) => {
  const { name, topic = '', type = 'text' } = req.body;
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Channel name must be at least 2 characters' });
  }

  const db = readData();
  const server = getMembershipScopedServer(db, req.params.serverId, req.user.userId);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  const channelId = slugifyChannelName(name);
  if (db.channels.some((channel) => channel.serverId === server.id && channel.id === channelId)) {
    return res.status(409).json({ error: 'Channel already exists in this server' });
  }

  const channel = {
    id: channelId,
    serverId: server.id,
    name: String(name).trim(),
    topic: String(topic || ''),
    type,
    ownerId: req.user.userId,
    memberIds: [req.user.userId],
    createdAt: new Date().toISOString(),
  };

  db.channels.push(channel);
  const user = db.users.find((entry) => entry.id === req.user.userId);
  if (user) {
    user.channels = Array.from(new Set([...(user.channels || []), channel.id]));
  }
  writeData(db);

  if (req.io) {
    req.io.to(`server:${server.id}`).emit('channel:created', channel);
  }

  return res.status(201).json(channel);
});

router.get('/:serverId/channels/:channelId', authenticateToken, (req, res) => {
  const db = readData();
  const server = getMembershipScopedServer(db, req.params.serverId, req.user.userId);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  const channel = db.channels.find(
    (entry) => entry.serverId === server.id && entry.id === req.params.channelId
  );
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  return res.json(channel);
});

module.exports = router;
