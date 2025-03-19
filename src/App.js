import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import cities from './cities';
import 'leaflet/dist/leaflet.css';
import { Button, Select, MenuItem, FormControl, InputLabel, Grid, Card, CardContent, Typography } from '@mui/material';
import CustomDialog from './components/CustomDialog'; // Make sure this path is correct

// Import Web Workers
const geneticWorker = new Worker(new URL('./workers/geneticWorker.js', import.meta.url));
const generalWorker = new Worker(new URL('./workers/generalWorker.js', import.meta.url));

const START_CITY = cities[0];

// Algorithm Descriptions
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
  const [openDialog, setOpenDialog] = useState(false); // State for handling dialog visibility

  useEffect(() => {
    const processAlgorithm = (selectedCities) => {
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
    };

    let selectedCities = cities;

    if ((algorithm === 'bruteforce' || algorithm === 'dynamic') && cities.length > 9) {              
      setOpenDialog(true);
        return; 
    }

    processAlgorithm(selectedCities);
  }, [algorithm]); 

  const processAlgorithm = (selectedCities) => {
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
  };

  const handleDialogClose = (accept) => {
    setOpenDialog(false);
    if (accept) {
      let selectedCities = [...cities].sort(() => Math.random() - 0.5).slice(0, 9);
      processAlgorithm(selectedCities);
    }
  };

  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 500);
    }
  }, [bestPath]);

  return (
    <Grid container spacing={2} style={{ padding: 20, height: '100vh' }}>
      <CustomDialog open={openDialog} handleClose={handleDialogClose} />
      {/* Sidebar (Algorithm Selection) */}
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
      {/* Map (Main View) */}
      <Grid item xs={12} md={9}>
        <Card variant="outlined" style={{ height: '100%' }}>
          <CardContent style={{ height: '100%' }}>
            <MapContainer 
              ref={mapRef} 
              key={key} 
              center={[42.58, 21.0]}
              zoom={9} 
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {cities.map((city, index) => (
                <Marker key={index} position={[city.lat, city.lon]} icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="border: 2px solid #3388FF; background-color: #EEEFDC; color: #3388FF; width: 20px; height: 20px; border-radius: 50%; text-align: center; font-size: 12px; font-weight: bold; line-height: 18px;">${index + 1}</div>`
                })}>
                  <Tooltip>{city.name}</Tooltip>
                </Marker>
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
 * Sorts the path to start from a specific node.
 */
function sortPathWithStart(path, startNode) {
  if (!path || path.length === 0) return path;

  const startIndex = path.findIndex(city => city.lat === startNode.lat && city.lon === startNode.lon);
  if (startIndex === -1) return path;

  return [...path.slice(startIndex), ...path.slice(0, startIndex)];
}

/**
 * Calculates the total distance of the path.
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
 * Calculates the distance between two cities using the Haversine formula.
 */
function getDistance(city1, city2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (city2.lat - city1.lat) * (Math.PI / 180);
  const dLon = (city2.lon - city1.lon) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(city1.lat * (Math.PI / 180)) * Math.cos(city2.lat * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
