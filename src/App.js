import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import cities from './cities';
import 'leaflet/dist/leaflet.css';
import { Button, Select, MenuItem, FormControl, InputLabel, Grid, Card, CardContent, Typography } from '@mui/material';
import CustomDialog from './components/CustomDialog';

const geneticWorker = new Worker(new URL('./workers/geneticWorker.js', import.meta.url));
const generalWorker = new Worker(new URL('./workers/generalWorker.js', import.meta.url));

const algorithmDescriptions = {
  genetic: "Genetic Algorithm is an evolutionary optimization method inspired by natural selection. It finds a near-optimal solution by evolving populations over generations.",
  bruteforce: "Brute Force Algorithm tests all possible routes to find the absolute shortest path. It guarantees an optimal solution but is computationally expensive.",
  dynamic: "Dynamic Programming Algorithm (Held-Karp) breaks the problem into smaller subproblems and efficiently finds the shortest route using memoization.",
  approximation: "Approximation Algorithm provides a quick heuristic solution. It does not guarantee the optimal path but is fast and efficient for large inputs."
};

function ClickHandler({ onClick, setMapCenter, setMapZoom }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    },
    moveend(e) {
      const map = e.target;
      setMapCenter(map.getCenter());
      setMapZoom(map.getZoom());
    }
  });
  return null;
}

function App() {
  const [bestPath, setBestPath] = useState([]);
  const [algorithm, setAlgorithm] = useState('genetic');
  const mapRef = useRef(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualPoints, setManualPoints] = useState([]);
  const [mapCenter, setMapCenter] = useState([42.58, 21.0]);
  const [mapZoom, setMapZoom] = useState(9);
  const [routeCities, setRouteCities] = useState([]);
  const [addMode, setAddMode] = useState(true);
  
  const processAlgorithm = useCallback((selectedCities, forceRun = false) => {
    if (selectedCities.length < 2) return;

    const closedLoop = [...selectedCities];
    setRouteCities([...selectedCities]);
    if (closedLoop[0] !== closedLoop[closedLoop.length - 1]) {
      closedLoop.push(closedLoop[0]);
    }

    const updateMapView = () => {
      if (!manualMode) return;
      if (mapRef.current && closedLoop.length >= 2) {
        const group = L.featureGroup(closedLoop.map(c => L.marker([c.lat, c.lon])));
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds);
        }
      }
    };

    const handleWorkerResponse = (event) => {
      const sortedPath = sortPathWithStart(event.data, closedLoop[0]);
      setBestPath(sortedPath);
      setTotalDistance(calculateTotalDistance(sortedPath));
      updateMapView();
    };

    if (algorithm === 'genetic') {
      geneticWorker.postMessage({ cities: closedLoop, populationSize: 100, generations: 500 });
      geneticWorker.onmessage = handleWorkerResponse;
    } else {
      if ((algorithm === 'bruteforce' || algorithm === 'dynamic') && closedLoop.length > 10 && !forceRun) {
        setOpenDialog(true);
        return;
      }
      generalWorker.postMessage({ algorithm, cities: closedLoop });
      generalWorker.onmessage = handleWorkerResponse;
    }
  }, [algorithm, manualMode]);

  const handleDialogClose = (accept) => {
    setOpenDialog(false);
    if (accept) {
      let selectedCities = [...(manualMode ? manualPoints : cities)].sort(() => Math.random() - 0.5).slice(0, 9);
      if (manualMode) {
        setManualPoints(selectedCities); // përditëso edhe pikët që shfaqen
      }
      processAlgorithm(selectedCities, true);
    }
  };
  

  useEffect(() => {
    const points = manualMode ? manualPoints : cities;
    if (points.length >= 2) {
      processAlgorithm(points);
    }
  }, [algorithm, manualMode, manualPoints, processAlgorithm]);

  const handleMapClick = (latlng) => {
    if (!manualMode) return;

    if (addMode) {
      setManualPoints(prev => [...prev, {
        name: `Point ${prev.length + 1}`,
        lat: latlng.lat,
        lon: latlng.lng // ✅ përdor 'lon' gjithandej
      }]);
    } else {
      const threshold = 0.01;
      setManualPoints(prev =>
        prev.filter(p =>
          Math.abs(p.lat - latlng.lat) > threshold || Math.abs(p.lon - latlng.lng) > threshold
        )
      );
    }
  };

  const handleDone = () => {
    if (manualPoints.length >= 2) {
      processAlgorithm(manualPoints);
    }
  };

  return (
    <Grid container spacing={2} style={{ padding: 20, height: '100vh' }}>
      <CustomDialog open={openDialog} handleClose={handleDialogClose} />
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
          <Typography variant="h6">
            Number of Cities: {manualMode ? manualPoints.length : routeCities.length}
          </Typography>
          <Typography variant="h6">
            Total Distance: {totalDistance.toFixed(2)} km
          </Typography>
          <Button 
            variant="text" 
            color="secondary" 
            style={{ marginTop: 10, textTransform: 'none', fontSize: '12px', opacity: 0.7 }}
            onClick={() => {
              setManualMode(false);
              setBestPath([]);
              setRouteCities([]);
              setMapCenter([42.58, 21.0]);
              setMapZoom(9);
              processAlgorithm(cities);
            }}            
          >
            Recalculate Path Auto
          </Button>

          <Button 
            variant="text" 
            color="primary" 
            style={{ marginTop: 10, textTransform: 'none', fontSize: '12px', opacity: 0.7 }}
            onClick={() => {
              setManualMode(true);
              setManualPoints([]);
              setBestPath([]);
              setTotalDistance(0);
            }}
          >
            Recalculate Path Manually
          </Button>
        </Card>
      </Grid>
      <Grid item xs={12} md={9}>
        <Card variant="outlined" style={{ height: '100%' }}>
          <CardContent style={{ height: '100%' }}>
            <MapContainer 
              ref={mapRef} 
              center={mapCenter}
              zoom={mapZoom} 
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {manualMode && <ClickHandler onClick={handleMapClick} setMapCenter={setMapCenter} setMapZoom={setMapZoom} />}
              {(manualMode ? manualPoints : cities).map((city, index) => (
                <Marker
                  key={index}
                  position={[city.lat, city.lon]}
                  eventHandlers={{
                    click: () => {
                      if (manualMode) {
                        setManualPoints(prev => prev.filter((_, i) => i !== index));
                      }
                    }
                  }}
                  icon={L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="border: 2px solid #3388FF; background-color: #EEEFDC; color: #3388FF; width: 20px; height: 20px; border-radius: 50%; text-align: center; font-size: 12px; font-weight: bold; line-height: 18px;">${index + 1}</div>`
                  })}
                >
                  <Tooltip>{city.name}</Tooltip>
                </Marker>              
              ))}
              {bestPath.length > 0 && (
                <Polyline positions={[...bestPath.map(city => [city.lat, city.lon]), [bestPath[0].lat, bestPath[0].lon]]} />
              )}
            <div
              ref={(el) => {
                if (el) {
                  L.DomEvent.disableClickPropagation(el);
                }
              }}
              style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#ffffffdd',
                borderRadius: '8px',
                padding: '6px 12px',
                display: manualMode ? 'flex' : 'none',
                alignItems: 'center',
                gap: '8px',
                zIndex: 1000,
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
              }}
            >
              <Button size="small" variant="contained" color="primary" onClick={handleDone}>Done</Button>
              <Button size="small" variant="outlined" color="primary" onClick={() => setAddMode(true)}>Add More</Button>
              <Button size="small" variant="outlined" color="error" onClick={() => setAddMode(false)}>Delete</Button>
              <Button size="small" variant="outlined" onClick={() => {
                setManualPoints([]);
                setBestPath([]);
                setTotalDistance(0);
              }}>Clear</Button>
            </div>

            </MapContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default App;

function sortPathWithStart(path, startNode) {
  if (!path || path.length === 0) return path;
  const startIndex = path.findIndex(city => city.lat === startNode.lat && city.lon === startNode.lon);
  if (startIndex === -1) return path;
  return [...path.slice(startIndex), ...path.slice(0, startIndex)];
}

function calculateTotalDistance(path) {
  if (path.length < 2) return 0;
  let distance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    distance += getDistance(path[i], path[i + 1]);
  }
  return distance;
}

function getDistance(city1, city2) {
  const R = 6371;
  const dLat = (city2.lat - city1.lat) * (Math.PI / 180);
  const dLon = (city2.lon - city1.lon) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(city1.lat * (Math.PI / 180)) * Math.cos(city2.lat * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
