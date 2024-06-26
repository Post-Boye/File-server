const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  filename: { type: String, required: true },
  downloads: { type: Number, default: 0 },
  emailSends: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);
