const express = require('express');
const multer = require('multer');
const File = require('../models/file');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

router.get('/upload', (req, res) => {
  res.render('admin/upload');
});

router.post('/upload', upload.single('file'), async (req, res) => {
  const { title, description } = req.body;
  const file = new File({ title, description, filename: req.file.filename });
  await file.save();
  res.redirect('/admin/upload');
});

router.get('/stats', async (req, res) => {
  const files = await File.find();
  res.render('admin/stats', { files });
});

module.exports = router;
