import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors()); // Allow Angular frontend to access

app.get('/api/quotes/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  const { period1, period2 } = req.query;
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d&events=history`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch Yahoo Finance data' });
  }
});

app.listen(3000, () => {
  console.log('Proxy running on http://localhost:3000');
});
