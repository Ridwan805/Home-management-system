const express = require('express');
const router = express.Router();
const { login, register } = require('../controllers');
const { getSecurityQuestion, resetPassword } = require('../controllers/forgotPassword.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password/question', getSecurityQuestion);
router.post('/forgot-password/reset', resetPassword);

module.exports = router;
