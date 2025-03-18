import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import cities from './cities';
import 'leaflet/dist/leaflet.css';
import { Button, Select, MenuItem, FormControl, InputLabel, Grid, Card, CardContent, Typography } from '@mui/material';

// Importo Web Workers
const geneticWorker = new Worker(new URL('./workers/geneticWorker.js', import.meta.url));
const generalWorker = new Worker(new URL('./workers/generalWorker.js', import.meta.url));

const START_CITY = cities[0];

const customIcon = L.icon({
  iconUrl: 'https://leafletjs.com/examples/custom-icons/leaf-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://leafletjs.com/examples/custom-icons/leaf-shadow.png',
  shadowSize: [41, 41]
});

// Përshkrimet e algoritmeve
const algorithmDescriptions = {
  genetic: "Genetic Algorithm is an evolutionary optimization method inspired by natural selection. It finds a near-optimal solution by evolving populations over generations.",
  bruteforce: "Brute Force Algorithm tests all possible routes to find the absolute shortest path. It guarantees an optimal solution but is computationally expensive.",
  dynamic: "Dynamic Programming Algorithm (Held-Karp) breaks the problem into smaller subproblems and efficiently finds the shortest route using memoization.",
  approximation: "Approximation Algorithm provides a quick heuristic solution. It does not guarantee the optimal path but is fast and efficient for large inputs."
};

function App() {
  const [bestPath, setBestPath] = useState([]);
  const [algorithm, setAlgorithm] = useState('genetic');
  const [key, setKey] = useState(0);
  const mapRef = useRef(null);
  const [totalDistance, setTotalDistance] = useState(0);

  useEffect(() => {
    let selectedCities = cities;

    if ((algorithm === 'bruteforce' || algorithm === 'dynamic') && cities.length > 9) {
      const userConfirmed = window.confirm(
        `Brute Force dhe Dynamic Programming janë shumë të ngadalta për më shumë se 9 qytete.\n` +
        `Dëshiron të vazhdosh me vetëm 9 qytete të zgjedhura rastësisht?`
      );

      if (!userConfirmed) return;

      selectedCities = [...cities].sort(() => Math.random() - 0.5).slice(0, 9);
    }

    if (algorithm === 'genetic') {
      geneticWorker.postMessage({ cities: selectedCities, populationSize: 100, generations: 500 });
      geneticWorker.onmessage = (event) => {
        const sortedPath = sortPathWithStart(event.data, START_CITY);
        setBestPath(sortedPath);
        setTotalDistance(calculateTotalDistance(sortedPath));
        setKey(prevKey => prevKey + 1);
      };
    } else {
      generalWorker.postMessage({ algorithm, cities: selectedCities });
      generalWorker.onmessage = (event) => {
        const sortedPath = sortPathWithStart(event.data, START_CITY);
        setBestPath(sortedPath);
        setTotalDistance(calculateTotalDistance(sortedPath));
        setKey(prevKey => prevKey + 1);
      };
    }
  }, [algorithm]);

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 500);
    }
  }, [bestPath]);

  return (
    <Grid container spacing={2} style={{ padding: 20, height: '100vh' }}>
      {/* Sidebar (Zgjedhja e algoritmit) */}
      <Grid item xs={12} md={3} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Card variant="outlined" style={{ padding: 20 }}>
          <Typography variant="h5" gutterBottom>
            Traveling Salesman Problem - Kosovo
          </Typography>
          <FormControl fullWidth variant="outlined">
            <InputLabel id="algorithm-label">Select Algorithm</InputLabel>
            <Select 
              labelId="algorithm-label"
              value={algorithm} 
              onChange={(e) => setAlgorithm(e.target.value)}
              label="Select Algorithm"
            >
              <MenuItem value="genetic">Genetic Algorithm</MenuItem>
              <MenuItem value="bruteforce">BruteForce Algorithm</MenuItem>
              <MenuItem value="dynamic">Dynamic Programming</MenuItem>
              <MenuItem value="approximation">Approximation Algorithm</MenuItem>
            </Select>
          </FormControl>
          <Typography variant="body2" style={{ marginTop: 10 }}>
            {algorithmDescriptions[algorithm]}
          </Typography>
          <Typography variant="h6" style={{ marginTop: 20 }}>
            Number of Cities: {bestPath.length}
          </Typography>
          <Typography variant="h6">
            Total Distance: {totalDistance.toFixed(2)} km
          </Typography>
          <Button 
            variant="text" 
            color="secondary" 
            style={{ marginTop: 10, textTransform: 'none', fontSize: '12px', opacity: 0.7 }}
            onClick={() => setKey(prevKey => prevKey + 1)}
          >
            Recalculate Path
          </Button>

        </Card>
      </Grid>
      {/* Harta (Pamja Kryesore) */}
      <Grid item xs={12} md={9}>
        <Card variant="outlined" style={{ height: '100%' }}>
          <CardContent style={{ height: '100%' }}>
            <MapContainer 
              ref={mapRef} 
              key={key} 
              center={[42.6629, 21.1655]} 
              zoom={9} 
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {cities.map((city, index) => (
                <Marker key={index} position={[city.lat, city.lon]} icon={customIcon} />
              ))}
              {bestPath.length > 0 && (
                <Polyline positions={[...bestPath.map(city => [city.lat, city.lon]), [bestPath[0].lat, bestPath[0].lon]]} />
              )}
            </MapContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default App;

/**
 * Sorton rrugën që të fillojë nga një nodë specifike.
 */
function sortPathWithStart(path, startNode) {
  if (!path || path.length === 0) return path;

  const startIndex = path.findIndex(city => city.lat === startNode.lat && city.lon === startNode.lon);
  if (startIndex === -1) return path;

  return [...path.slice(startIndex), ...path.slice(0, startIndex)];
}

/**
 * Llogarit distancën totale të rrugës.
 */
function calculateTotalDistance(path) {
  if (path.length < 2) return 0;

  let distance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    distance += getDistance(path[i], path[i + 1]);
  }
  return distance;
}

/**
 * Llogarit distancën midis dy qyteteve duke përdorur formulën e distancës Haversine.
 */
function getDistance(city1, city2) {
  const R = 6371; 
  const dLat = (city2.lat - city1.lat) * (Math.PI / 180);
  const dLon = (city2.lon - city1.lon) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(city1.lat * (Math.PI / 180)) * Math.cos(city2.lat * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}