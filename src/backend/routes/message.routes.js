const express = require('express');
const { authenticateToken } = require('../lib/auth');
const { readData, writeData, randomUUID } = require('../lib/store');

const router = express.Router();

router.get('/channel/:channelId', authenticateToken, (req, res) => {
  const db = readData();
  const limit = Number(req.query.limit || 50);
  const messages = db.messages
    .filter((message) => message.channelId === req.params.channelId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-limit);
  return res.json(messages);
});

router.get('/user/:userId', authenticateToken, (req, res) => {
  const db = readData();
  const limit = Number(req.query.limit || 50);
  const messages = db.messages
    .filter((message) => message.userId === req.params.userId || message.channelId === req.params.userId)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-limit);
  return res.json(messages);
});

router.get('/:messageId', authenticateToken, (req, res) => {
  const db = readData();
  const message = db.messages.find((entry) => entry.id === req.params.messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  return res.json(message);
});

router.post('/', authenticateToken, (req, res) => {
  const { channelId, content } = req.body;
  if (!channelId || !content || !String(content).trim()) {
    return res.status(400).json({ error: 'Channel ID and content are required' });
  }

  const db = readData();
  const author = db.users.find((entry) => entry.id === req.user.userId);
  if (!author) {
    return res.status(404).json({ error: 'User not found' });
  }

  const message = {
    id: randomUUID(),
    channelId: String(channelId),
    userId: author.id,
    username: author.username,
    content: String(content).trim(),
    timestamp: new Date().toISOString(),
    editedAt: null,
  };

  db.messages.push(message);

  const channel = db.channels.find((entry) => entry.id === channelId);
  if (channel && !channel.memberIds.includes(author.id)) {
    channel.memberIds.push(author.id);
  }

  if (!author.channels.includes(channelId)) {
    author.channels.push(channelId);
  }

  writeData(db);
  return res.status(201).json(message);
});

router.patch('/:messageId', authenticateToken, (req, res) => {
  const db = readData();
  const message = db.messages.find((entry) => entry.id === req.params.messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.userId !== req.user.userId) {
    return res.status(403).json({ error: 'Not authorized to edit this message' });
  }

  message.content = String(req.body.content || message.content).trim();
  message.editedAt = new Date().toISOString();
  writeData(db);
  return res.json(message);
});

router.delete('/:messageId', authenticateToken, (req, res) => {
  const db = readData();
  const index = db.messages.findIndex((entry) => entry.id === req.params.messageId);
  if (index === -1) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (db.messages[index].userId !== req.user.userId) {
    return res.status(403).json({ error: 'Not authorized to delete this message' });
  }

  db.messages.splice(index, 1);
  writeData(db);
  return res.json({ message: 'Message deleted successfully' });
});

module.exports = router;
