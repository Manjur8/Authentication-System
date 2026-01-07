const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');
const { createJti, signAccessToken, signRefreshToken, persistRefreshToken, setRefreshCookie, hashToken, rotateRefreshToken } = require('../utils/tokens');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login and issue JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // ==== refresh token logic ====
    const jti = createJti();
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, jti);

    await persistRefreshToken({
      user,
      refreshToken,
      jti,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });

    setRefreshCookie(res, refreshToken);
    // ============================

    res.json({ accessToken });

    // const payload = { id: user._id, email: user.email };

    // const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });

    // res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      return res.status(401).json({ message: 'Missing refresfdh token' });
    }
  
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
  
    const tokenHash = hashToken(token);
    const doc = await RefreshToken.findOne({ jti: decoded.jti, tokenHash }).populate('user');
  
    if(!doc) {
      return res.status(401).json({ message: 'Refresh token not found' });
    }
  
    if(doc.revokedAt) {
      return res.status(401).json({ message: 'Refresh token revoked' });
    }
  
    if(doc.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token expired' });
    }
  
    const result = await rotateRefreshToken(doc, doc.user, req, res);
    console.log("Token refreshed for user: ", doc.user.email);
    return res.json({ accessToken: result.accessToken });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
})

module.exports = router;
