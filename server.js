const express = require('express');
const app = express();

app.use(express.json());

// Aapke API routes yahan aayenge
app.get('/', (req, res) => {
  res.send('LethalOrca Backend is Live!');
});

module.exports = app;
