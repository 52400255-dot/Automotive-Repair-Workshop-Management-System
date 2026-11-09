const express = require('express');
const controller = require('../controllers/notification.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);
router.get('/', controller.list);
router.post('/read-all', controller.readAll);
router.post('/:id/read', controller.read);

module.exports = router;
