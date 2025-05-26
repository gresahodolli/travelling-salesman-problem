import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 4000;

const API_KEY = process.env.ORS_API_KEY;

app.use(cors());
app.use(express.json());

app.post('/matrix', async (req, res) => {
  try {
    const response = await fetch('https://api.openrouteservice.org/v2/matrix/driving-car', {
      method: 'POST',
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        locations: req.body.locations,
        metrics: ['distance'],
        units: 'km'
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Matrix error:', err);
    res.status(500).json({ error: 'ORS Matrix error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Matrix proxy server running at http://localhost:${PORT}`);
});

app.post('/route', async (req, res) => {
  try {
    const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coordinates: req.body.coordinates,
        instructions: false
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Route error:', err);
    res.status(500).json({ error: 'ORS Route error' });
  }
});
