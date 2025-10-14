console.log('Testing basic Node.js execution...');
console.log('Current working directory:', process.cwd());
console.log('Script location:', import.meta.url);

import express from 'express';
console.log('Express imported successfully');

const app = express();
const PORT = 3001;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test successful' });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});