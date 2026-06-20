const express = require('express');
const { authenticateToken } = require('../lib/auth');
const { DEFAULT_SERVER_ID, readData, writeData } = require('../lib/store');

const router = express.Router();

router.get('/online', authenticateToken, (req, res) => {
  const db = readData();
  const users = db.users
    .filter((user) => user.id !== req.user.userId)
    .map(({ passwordHash, ...safeUser }) => safeUser);
  return res.json(users);
});

router.get('/:userId', authenticateToken, (req, res) => {
  const db = readData();
  const user = db.users.find((entry) => entry.id === req.params.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
});

router.patch('/:userId/status', authenticateToken, (req, res) => {
  if (req.user.userId !== req.params.userId) {
    return res.status(403).json({ error: 'Cannot update another user status' });
  }

  const { status } = req.body;
  const allowed = ['online', 'idle', 'dnd', 'offline'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const db = readData();
  const user = db.users.find((entry) => entry.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.status = status;
  user.lastSeenAt = new Date().toISOString();
  writeData(db);

  return res.json({ message: 'Status updated', status });
});

router.get('/:userId/channels', authenticateToken, (req, res) => {
  const db = readData();
  const user = db.users.find((entry) => entry.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const channels = db.channels.filter((channel) => (user.channels || []).includes(channel.id));
  return res.json(channels);
});

router.get('/:userId/servers', authenticateToken, (req, res) => {
  const db = readData();
  const user = db.users.find((entry) => entry.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const servers = db.servers.filter((server) => (user.serverIds || [DEFAULT_SERVER_ID]).includes(server.id));
  return res.json(servers);
});

module.exports = router;
