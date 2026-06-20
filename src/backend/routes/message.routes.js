const express = require('express');
const { authenticateToken } = require('../lib/auth');
const { makeDmKey, randomUUID, readData, writeData } = require('../lib/store');

const router = express.Router();

router.get('/channel/:channelId', authenticateToken, (req, res) => {
  const db = readData();
  const limit = Number(req.query.limit || 50);
  const serverId = req.query.serverId ? String(req.query.serverId) : null;
  const messages = db.messages
    .filter((message) => {
      if (message.kind !== 'channel') return false;
      if (message.channelId !== req.params.channelId) return false;
      if (serverId && message.serverId !== serverId) return false;
      return true;
    })
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-limit);
  return res.json(messages);
});

router.get('/user/:userId', authenticateToken, (req, res) => {
  const db = readData();
  const limit = Number(req.query.limit || 50);
  const dmKey = makeDmKey(req.user.userId, req.params.userId);
  const messages = db.messages
    .filter((message) => message.kind === 'dm' && message.dmKey === dmKey)
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
  const { channelId, serverId, recipientId, content } = req.body;
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const db = readData();
  const author = db.users.find((entry) => entry.id === req.user.userId);
  if (!author) {
    return res.status(404).json({ error: 'User not found' });
  }

  let message;

  if (recipientId) {
    const recipient = db.users.find((entry) => entry.id === recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    message = {
      id: randomUUID(),
      kind: 'dm',
      dmKey: makeDmKey(author.id, recipient.id),
      recipientId: recipient.id,
      userId: author.id,
      username: author.username,
      content: String(content).trim(),
      timestamp: new Date().toISOString(),
      editedAt: null,
    };

    db.messages.push(message);
    writeData(db);

    if (req.io) {
      req.io.to(`user:${recipient.id}`).to(`user:${author.id}`).emit('dm:message', message);
    }

    return res.status(201).json(message);
  }

  if (!channelId || !serverId) {
    return res.status(400).json({ error: 'serverId and channelId are required for channel messages' });
  }

  const server = db.servers.find((entry) => entry.id === serverId && (entry.memberIds || []).includes(author.id));
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  const channel = db.channels.find((entry) => entry.id === channelId && entry.serverId === server.id);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  message = {
    id: randomUUID(),
    kind: 'channel',
    serverId: server.id,
    channelId: channel.id,
    userId: author.id,
    username: author.username,
    content: String(content).trim(),
    timestamp: new Date().toISOString(),
    editedAt: null,
  };

  db.messages.push(message);
  if (!channel.memberIds.includes(author.id)) {
    channel.memberIds.push(author.id);
  }
  if (!author.channels.includes(channel.id)) {
    author.channels.push(channel.id);
  }
  writeData(db);

  if (req.io) {
    req.io.to(`channel:${server.id}:${channel.id}`).emit('message:created', message);
  }

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

  if (req.io) {
    if (message.kind === 'channel' && message.channelId && message.serverId) {
      req.io.to(`channel:${message.serverId}:${message.channelId}`).emit('message:edited', message);
    }
    if (message.kind === 'dm' && message.dmKey) {
      req.io.emit('message:edited', message);
    }
  }

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

  const [message] = db.messages.splice(index, 1);
  writeData(db);

  if (req.io) {
    if (message.kind === 'channel' && message.channelId && message.serverId) {
      req.io.to(`channel:${message.serverId}:${message.channelId}`).emit('message:deleted', { messageId: message.id });
    } else {
      req.io.emit('message:deleted', { messageId: message.id });
    }
  }

  return res.json({ message: 'Message deleted successfully' });
});

module.exports = router;
