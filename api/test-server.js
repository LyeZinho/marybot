// Test script to verify the API structure
import express from 'express';

console.log('Testing basic Express setup...');

const app = express();
const PORT = 3001;

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API structure test successful'
  });
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('✅ Basic Express setup working');
});

export default app;