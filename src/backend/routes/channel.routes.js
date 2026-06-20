const express = require('express');
const { authenticateToken } = require('../lib/auth');
const { readData, writeData, slugifyChannelName } = require('../lib/store');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const db = readData();
  return res.json(db.channels);
});

router.post('/', authenticateToken, (req, res) => {
  const { name, type = 'text', topic = '' } = req.body;
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Channel name must be at least 2 characters' });
  }

  const db = readData();
  const id = slugifyChannelName(name);
  if (db.channels.some((channel) => channel.id === id || channel.name.toLowerCase() === String(name).trim().toLowerCase())) {
    return res.status(409).json({ error: 'Channel already exists' });
  }

  const channel = {
    id,
    name: String(name).trim(),
    type,
    topic,
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

  return res.status(201).json(channel);
});

router.get('/:channelId', authenticateToken, (req, res) => {
  const db = readData();
  const channel = db.channels.find((entry) => entry.id === req.params.channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  return res.json(channel);
});

router.patch('/:channelId/topic', authenticateToken, (req, res) => {
  const db = readData();
  const channel = db.channels.find((entry) => entry.id === req.params.channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  if (channel.ownerId !== req.user.userId) {
    return res.status(403).json({ error: 'Not authorized to update this channel' });
  }

  channel.topic = String(req.body.topic || '');
  writeData(db);
  return res.json(channel);
});

router.delete('/:channelId', authenticateToken, (req, res) => {
  const db = readData();
  const index = db.channels.findIndex((entry) => entry.id === req.params.channelId);
  if (index === -1) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  const channel = db.channels[index];
  if (channel.id === 'general') {
    return res.status(400).json({ error: 'General channel cannot be deleted' });
  }

  if (channel.ownerId !== req.user.userId) {
    return res.status(403).json({ error: 'Not authorized to delete this channel' });
  }

  db.channels.splice(index, 1);
  db.messages = db.messages.filter((message) => message.channelId !== channel.id);
  db.users.forEach((user) => {
    user.channels = (user.channels || []).filter((channelId) => channelId !== channel.id);
  });
  writeData(db);

  return res.json({ message: 'Channel deleted successfully' });
});

module.exports = router;
