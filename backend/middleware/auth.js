const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET;

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('--- Auth Middleware: Request Received ---');

    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('❌ Auth Error: User ID not found in DB');
      return res.status(401).json({ error: 'User does not exist' });
    }

    req.userId = user._id;
    next();
  } catch (error) {
    console.log('❌ Auth Error:', error.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authenticate;