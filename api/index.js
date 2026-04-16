const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-diary';

let isConnected = false;

async function connectDB() {
  if (!isConnected) {
    try {
      await mongoose.connect(MONGODB_URI);
      isConnected = true;
      console.log('MongoDB connected');
    } catch (err) {
      console.error('MongoDB connection error:', err);
    }
  }
}

app.use('/api/auth', require('../server/routes/auth'));
app.use('/api/posts', require('../server/routes/posts'));
app.use('/api/comments', require('../server/routes/comments'));
app.use('/api/likes', require('../server/routes/likes'));
app.use('/api/stories', require('../server/routes/stories'));
app.use('/api/users', require('../server/routes/users'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.all('/api/:route', async (req, res) => {
  await connectDB();
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;