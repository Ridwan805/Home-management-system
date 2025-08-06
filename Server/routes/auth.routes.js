const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers');
const { getSecurityQuestion, resetPassword } = require('../controllers/forgotPassword.controller');
const getMe = require('../controllers/getMe.controller');
const authMiddleware = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password/question', getSecurityQuestion);
router.post('/forgot-password/reset', resetPassword);

// Add /me route
router.get('/me', authMiddleware, getMe);

module.exports = router;
