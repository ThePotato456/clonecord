const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken, authenticateToken } = require('../lib/auth');
const { DEFAULT_CHANNEL_ID, DEFAULT_SERVER_ID, randomUUID, readData, writeData } = require('../lib/store');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, clientFingerprint = null } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const db = readData();
    const normalizedUsername = String(username).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (db.users.some((user) => user.username.toLowerCase() === normalizedUsername.toLowerCase())) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    if (db.users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: randomUUID(),
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      avatarUrl: null,
      status: 'online',
      clientFingerprints: clientFingerprint ? [clientFingerprint] : [],
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      serverIds: [DEFAULT_SERVER_ID],
      channels: [DEFAULT_CHANNEL_ID],
    };

    db.users.push(user);

    const defaultServer = db.servers.find((server) => server.id === DEFAULT_SERVER_ID);
    if (defaultServer && !defaultServer.memberIds.includes(user.id)) {
      defaultServer.memberIds.push(user.id);
    }

    const defaultChannel = db.channels.find((channel) => channel.id === DEFAULT_CHANNEL_ID);
    if (defaultChannel && !defaultChannel.memberIds.includes(user.id)) {
      defaultChannel.memberIds.push(user.id);
    }

    writeData(db);

    const token = signToken(user);
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return res.status(201).json({ user: safeUser, token, message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, email, password, clientFingerprint = null } = req.body;
    const login = String(username || email || '').trim();

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const db = readData();
    const user = db.users.find((entry) =>
      entry.username.toLowerCase() === login.toLowerCase() || entry.email.toLowerCase() === login.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.status = 'online';
    user.lastSeenAt = new Date().toISOString();
    user.serverIds = Array.isArray(user.serverIds) ? user.serverIds : [DEFAULT_SERVER_ID];
    user.channels = Array.isArray(user.channels) ? user.channels : [DEFAULT_CHANNEL_ID];
    user.clientFingerprints = Array.isArray(user.clientFingerprints) ? user.clientFingerprints : [];
    if (clientFingerprint && !user.clientFingerprints.includes(clientFingerprint)) {
      user.clientFingerprints.push(clientFingerprint);
    }
    writeData(db);

    const token = signToken(user);
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return res.json({ user: safeUser, token, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authenticateToken, (req, res) => {
  const db = readData();
  const user = db.users.find((entry) => entry.id === req.user.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { passwordHash, ...safeUser } = user;
  return res.json(safeUser);
});

router.put('/me', authenticateToken, (req, res) => {
  const db = readData();
  const user = db.users.find((entry) => entry.id === req.user.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { avatarUrl, status } = req.body;
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
  if (status !== undefined) user.status = status;
  user.lastSeenAt = new Date().toISOString();

  writeData(db);
  const { passwordHash, ...safeUser } = user;
  return res.json({ user: safeUser, message: 'Profile updated successfully' });
});

module.exports = router;
