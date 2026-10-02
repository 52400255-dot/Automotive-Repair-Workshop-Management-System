/**
 * auth.routes — /api/v1/auth
 * Public: login, register. Protected: me
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth');

router.post('/login', controller.login);
router.post('/register', controller.register);
router.get('/me', authenticateToken, controller.me);

module.exports = router;
