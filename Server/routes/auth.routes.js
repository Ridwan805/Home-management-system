const express = require('express');
const router = express.Router();

const register = require('../controllers/register.controller');
const login = require('../controllers/login.controller');
const getMe = require('../controllers/getMe.controller');
const updateUser = require('../controllers/updateUser.controller');
const { getSecurityQuestion, resetPassword } = require('../controllers/forgotPassword.controller');

const authMiddleware = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.put('/update', authMiddleware, updateUser);
router.post('/forgot-password/question', getSecurityQuestion);
router.post('/forgot-password/reset', resetPassword);

module.exports = router;
