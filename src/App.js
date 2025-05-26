import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import cities from './cities';
import 'leaflet/dist/leaflet.css';
import { Button, Select, MenuItem, FormControl, InputLabel, Grid, Card, CardContent, Typography } from '@mui/material';
import CustomDialog from './components/CustomDialog';
import { bruteForceWithMatrix, calculatePathDistance } from './components/algorithms/bruteForceWithMatrix';
import { getDistanceMatrix } from './api/orsRouting';
import { getORSRoutePolyline } from './api/orsDirections';

const geneticWorker = new Worker(new URL('./workers/geneticWorker.js', import.meta.url));
const generalWorker = new Worker(new URL('./workers/generalWorker.js', import.meta.url));

// Descriptions for each algorithm type
const algorithmDescriptions = {
  genetic: `Genetic Algorithm is inspired by natural selection. It starts with a population of routes and improves them using selection, crossover, and mutation.

  While it may not always give the perfect route, it often finds very good solutions in a short time.
  
  Its strength lies in evolving paths over generations based on performance.
  
  This makes it a popular choice when speed matters more than exactness.`,
  
  
  bruteforce: `Brute Force Algorithm evaluates all possible permutations of the cities to guarantee the shortest path.

  It ensures 100% accuracy but becomes extremely slow as the number of cities increases.

  This approach is ideal for small datasets where the total combinations remain manageable.

  In most real-world applications, it serves as a benchmark rather than a practical solution.`,

  dynamic: `Dynamic Programming (Held-Karp) improves brute force by breaking the problem into overlapping subproblems and using memoization.

  It stores and reuses partial solutions to avoid redundant computations and increase efficiency.

  The algorithm guarantees an exact result but still grows exponentially with input size.

  It offers a good compromise when you need precision for a moderate number of cities.`,

  approximation: `Approximation Algorithms use heuristics to quickly find near-optimal routes. These include methods like Nearest Neighbor and Minimum Spanning Tree.

  They sacrifice accuracy to provide fast solutions, especially useful in time-sensitive scenarios.

  While not exact, they are scalable and perform well in large real-world systems.

  This makes them common in routing applications like delivery networks and transport logistics.`
};

// Tracks user interactions with the map
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
  const [showPath, setShowPath] = useState(false);
  const [doneClicked, setDoneClicked] = useState(false);
  const [routeType, setRouteType] = useState('air');
  const [realPolyline, setRealPolyline] = useState([]);

  const drawRealRoute = async (bestPath) => {
    let fullPolyline = [];

    for (let i = 0; i < bestPath.length - 1; i++) {
      try {
        const segment = await getORSRoutePolyline(bestPath[i], bestPath[i + 1]);
        fullPolyline = fullPolyline.concat(segment);
      } catch (error) {
        console.error("Error fetching segment:", bestPath[i], "→", bestPath[i + 1], error);
      }
    }

    try {
      const closingSegment = await getORSRoutePolyline(bestPath[bestPath.length - 1], bestPath[0]);
      fullPolyline = fullPolyline.concat(closingSegment);
    } catch (error) {
      console.error("Error closing loop:", error);
    }

    setRealPolyline(fullPolyline);
  };
  
  // Triggers the algorithm in a worker and handles the result
  const processAlgorithm = useCallback((selectedCities, forceRun = false) => {
    console.log("Running processAlgorithm with:", { algorithm, routeType });

    if (selectedCities.length < 2) return;

    const closedLoop = [...selectedCities];
    setRouteCities([...selectedCities]);

    // Ensure path returns to the starting point
    if (closedLoop[0] !== closedLoop[closedLoop.length - 1]) {
      closedLoop.push(closedLoop[0]);
    }

    const updateMapView = () => {
      if (!manualMode) return;
      if (mapRef.current && closedLoop.length >= 2) {
        const group = L.featureGroup(closedLoop.map(c => L.marker([c.lat, c.lon])));
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] }); 
        }
      }
    };

    const handleWorkerResponse = (event) => {
      const sortedPath = sortPathWithStart(event.data, closedLoop[0]);
      setBestPath(sortedPath);
      setTotalDistance(calculateTotalDistance(sortedPath));
      updateMapView();
    };

    if (routeType === 'optimized-driving' && algorithm === 'bruteforce') {
      let citiesToUse = closedLoop;

      if (closedLoop.length > 9 && !forceRun) {
        setOpenDialog(true); 
        return;
      }

      if (closedLoop.length > 9 && forceRun) {
        citiesToUse = [...closedLoop].sort(() => Math.random() - 0.5).slice(0, 9);
      }

      getDistanceMatrix(citiesToUse).then((matrix) => {
        const best = bruteForceWithMatrix(citiesToUse, matrix);
        const looped = [...best];
        if (looped.length >= 2 && (
          looped[0].lat !== looped[looped.length - 1].lat ||
          looped[0].lon !== looped[looped.length - 1].lon
        )) {
          looped.push(looped[0]);
        }
        setBestPath(looped);
        drawRealRoute(looped);
        const indexPath = best.map(city => citiesToUse.findIndex(c => c.name === city.name));
        setTotalDistance(calculatePathDistance(indexPath, matrix));
      });

      return;
    }


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
  }, [algorithm, manualMode, routeType]);


  const handleDialogClose = (accept) => {
    setOpenDialog(false);
    if (accept) {
      let selectedCities = [...(manualMode ? manualPoints : cities)].sort(() => Math.random() - 0.5).slice(0, 9);
      if (manualMode) {
        setShowPath(true);
      }
      processAlgorithm(selectedCities, true);
    }
  };

  useEffect(() => {
    const points = manualMode ? manualPoints : cities;
    if (points.length >= 2 && (!manualMode || doneClicked)) {
      console.log("[useEffect] Triggered from change in algorithm or routeType");
      processAlgorithm(points);
    }
  }, [algorithm, routeType, manualMode, manualPoints, doneClicked, processAlgorithm]);

  useEffect(() => {
    setRealPolyline([]);
  }, [routeType]);

  const handleMapClick = (latlng) => {
    if (!manualMode || doneClicked) return;

    if (addMode) {
      setManualPoints(prev => [...prev, {
        name: `Point ${prev.length + 1}`,
        lat: latlng.lat,
        lon: latlng.lng
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
    if (manualPoints.length < 3 && algorithm === 'genetic') {
      alert("Genetic Algorithm requires at least 3 cities.");
      return;
    }

    if (manualPoints.length >= 2) {
      setShowPath(true);
      setDoneClicked(true);

      processAlgorithm(manualPoints); 
    }
  };


  return (
    <Grid container spacing={2} style={{ padding: 20, height: '100vh' }}>
      <CustomDialog open={openDialog} handleClose={handleDialogClose} />
      
      {/* Sidebar with controls and stats */}
      <Grid item xs={12} md={3} style={{ height: '100%' }}>
        <Card 
          variant="outlined" 
          style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: 20,
            boxSizing: 'border-box' 
          }}
        >
          <Typography variant="h5" gutterBottom>
            Traveling Salesman Problem - Kosovo
          </Typography>
          <FormControl fullWidth variant="outlined"
            sx={{
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
              },
              '&:hover label': {
                color: '#1976d2',
              }
            }}
          >
            <InputLabel 
              id="algorithm-label"
              sx={{
                color: openDialog ? '#1976d2' : undefined,
                '&.Mui-focused': {
                  color: '#1976d2'
                }
              }}
            >
              Select Algorithm
            </InputLabel>
            <Select
              labelId="algorithm-label"
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              label="Select Algorithm"
              sx={{
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: openDialog ? '#1976d2' : 'rgba(0, 0, 0, 0.23)',
                  borderWidth: openDialog ? '2px' : '1px'
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2'
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1976d2',
                  borderWidth: '1.6px'
                }
              }}
            >
              <MenuItem value="genetic">Genetic Algorithm</MenuItem>
              <MenuItem value="bruteforce">BruteForce Algorithm</MenuItem>
              <MenuItem value="dynamic">Dynamic Programming</MenuItem>
              <MenuItem value="approximation">Approximation Algorithm</MenuItem>
            </Select>
          </FormControl>

          <div style={{ flexGrow: 1, overflowY: 'auto', marginTop: 16, marginBottom: 16 }}>
          <Typography 
            variant="body2" 
            style={{ 
              whiteSpace: 'pre-line',
              fontSize: '0.93rem',
              lineHeight: 1.6,
              fontWeight: 300,
              letterSpacing: '0.4px',
              color: '#444'
            }}
          >
            {algorithmDescriptions[algorithm]}
          </Typography>
          </div>

          <div>
            <Typography variant="h6">
              Number of Cities: {manualMode ? manualPoints.length : routeCities.length}
            </Typography>
            <Typography variant="h6">
              Total Distance: {totalDistance.toFixed(2)} km
            </Typography>

            <Button 
              variant="text" 
              color="secondary" 
              style={{ marginTop: 10, textTransform: 'none', fontSize: '13px', opacity: 0.88 }}
              onClick={() => {
                setManualMode(false);
                setBestPath([]);
                setRouteCities([]);
                setShowPath(false);
                setDoneClicked(false);
                setMapCenter([42.58, 21.0]);
                setMapZoom(9);
                if (mapRef.current) {
                  mapRef.current.setView([42.58, 21.0], 9);
                }
                processAlgorithm(cities);
              }}            
            >
              Recalculate Path Auto
            </Button>

            <Button 
              variant="text" 
              color="primary" 
              style={{ marginTop: 10, textTransform: 'none', fontSize: '13px', opacity: 0.88 }}
              onClick={() => {
                setManualMode(true);
                setManualPoints([]);
                setBestPath([]);
                setTotalDistance(0);
                setShowPath(false);
                setDoneClicked(false);
                setRealPolyline([]); 
              }}
            >
              Calculate Path Manually
            </Button>
            <Typography
              variant="body2"
              onClick={() => setRouteType(routeType === 'air' ? 'optimized-driving' : 'air')}
              style={{
                marginTop: 5,
                marginBottom: -5,
                cursor: 'pointer',
                color: '#666',
                fontSize: '10.5px',
                textAlign: 'center',
                opacity: 0.75,
                textDecoration: 'underline',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}
            >
              {routeType === 'air'
                ? 'Use Real Road Route Demo (City Order from Algorithm)'
                : 'Switch to Air Route'}
            </Typography>

          </div>
        </Card>
      </Grid>
      
      
      {/* Map section remains unchanged */}
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
                      if (manualMode && !doneClicked) {
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

              {routeType === 'optimized-driving' && realPolyline.length > 0 && (
                <Polyline positions={realPolyline} color="red" />
              )}

              {routeType !== 'optimized-driving' && bestPath.length > 0 && (!manualMode || showPath) && (
                <Polyline 
                  positions={[...bestPath.map(city => [city.lat, city.lon]), [bestPath[0].lat, bestPath[0].lon]]} 
                  color="blue"
                />
              )}


              {/* Manual mode controls */}
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
                <Button size="small" variant="outlined" color="primary" onClick={() => setAddMode(true)} disabled={doneClicked}>Add More</Button>
                <Button size="small" variant="outlined" color="error" onClick={() => setAddMode(false)} disabled={doneClicked}>Delete</Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => {
                    setManualPoints([]);
                    setBestPath([]);
                    setTotalDistance(0);
                    setShowPath(false);
                    setDoneClicked(false);
                    setRealPolyline([]); 
                  }}
                >Clear</Button>
              </div>
            </MapContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default App;

// Shift the path so it starts with the given city
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

  if (path.length >= 2 && (path[0].lat !== path[path.length - 1].lat || path[0].lon !== path[path.length - 1].lon)) {
    distance += getDistance(path[path.length - 1], path[0]);
  }
  return distance;
}

// Calculate distance using Haversine formula
function getDistance(city1, city2) {
  const R = 6371;
  const dLat = (city2.lat - city1.lat) * (Math.PI / 180);
  const dLon = (city2.lon - city1.lon) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(city1.lat * (Math.PI / 180)) * Math.cos(city2.lat * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
