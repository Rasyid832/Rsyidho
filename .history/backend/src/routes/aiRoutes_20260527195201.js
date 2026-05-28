const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Endpoint untuk fitur Text Enhancer
router.post('/text-enhancer', aiController.handleTextEnhancer);

// Endpoint untuk fitur Code Fixer
router.post('/code-fixer', aiController.handleCodeFixer);

module.exports = router;