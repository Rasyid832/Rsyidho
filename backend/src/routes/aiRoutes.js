const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Endpoint untuk fitur Text Enhancer
router.post('/text-enhancer', aiController.handleTextEnhancer);

// Endpoint untuk fitur Code Fixer
router.post('/code-fixer', aiController.handleCodeFixer);
// Daftarkan di bawah route text-enhancer kemarin
router.post('/chat', aiController.handleGeneralChat);

module.exports = router;