const express = require('express');
const app = express();
app.get('/test', (req, res) => {
  res.cookie('test', 'value', { secure: true });
  res.send('ok');
});
const server = app.listen(3001, () => {
  console.log('Listening');
});
