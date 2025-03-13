import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import cities from './cities';
import 'leaflet/dist/leaflet.css';

// Importo Web Workers
const geneticWorker = new Worker(new URL('./workers/geneticWorker.js', import.meta.url));
const generalWorker = new Worker(new URL('./workers/generalWorker.js', import.meta.url));

// Cakto qytetin e parë si nodë të fillimit (ndrysho sipas dëshirës)
const START_CITY = cities[0]; 

const customIcon = L.icon({
  iconUrl: 'https://leafletjs.com/examples/custom-icons/leaf-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://leafletjs.com/examples/custom-icons/leaf-shadow.png',
  shadowSize: [41, 41]
});

function App() {
  const [bestPath, setBestPath] = useState([]);
  const [algorithm, setAlgorithm] = useState('genetic');
  const [key, setKey] = useState(0);
  const mapRef = useRef(null);

  useEffect(() => {
    let selectedCities = cities;

    // ✅ Pyet përdoruesin nëse do të vazhdojë me vetëm 9 qytete nëse janë më shumë se 9
    if ((algorithm === 'bruteforce' || algorithm === 'dynamic') && cities.length > 9) {
      const userConfirmed = window.confirm(
        `Brute Force dhe Dynamic Programming janë shumë të ngadalta për më shumë se 9 qytete.\n` +
        `Dëshiron të vazhdosh me vetëm 9 qytete të zgjedhura rastësisht?`
      );

      if (!userConfirmed) return;

      selectedCities = [...cities].sort(() => Math.random() - 0.5).slice(0, 9);
    }

    // ✅ Dërgo të dhënat te algoritmi i zgjedhur
    if (algorithm === 'genetic') {
      geneticWorker.postMessage({ cities: selectedCities, populationSize: 100, generations: 500 });
      geneticWorker.onmessage = (event) => {
        const sortedPath = sortPathWithStart(event.data, START_CITY);
        setBestPath(sortedPath);
        setKey(prevKey => prevKey + 1);
      };
    } else {
      generalWorker.postMessage({ algorithm, cities: selectedCities });
      generalWorker.onmessage = (event) => {
        const sortedPath = sortPathWithStart(event.data, START_CITY);
        setBestPath(sortedPath);
        setKey(prevKey => prevKey + 1);
      };
    }
  }, [algorithm]);

  // ✅ Rifresko hartën pasi rruga ndryshon
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current.invalidateSize();
      }, 500);
    }
  }, [bestPath]);

  return (
    <div>
      <h1>Traveling Salesman Problem - Kosovo</h1>

      <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)}>
        <option value="genetic">Genetic Algorithm</option>
        <option value="bruteforce">BruteForce Algorithm</option>
        <option value="dynamic">Dynamic Programming</option>
        <option value="approximation">Approximation Algorithm</option>
      </select>

      <MapContainer ref={mapRef} key={key} center={[42.6629, 21.1655]} zoom={8} style={{ height: "500px", width: "100%" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {cities.map((city, index) => (
          <Marker key={index} position={[city.lat, city.lon]} icon={customIcon} />
        ))}
        {bestPath.length > 0 && (
          <Polyline positions={[...bestPath.map(city => [city.lat, city.lon]), [bestPath[0].lat, bestPath[0].lon]]} />
        )}
      </MapContainer>
    </div>
  );
}

export default App;

/**
 * ✅ Funksion për të siguruar që rruga fillon nga një nodë specifike.
 */
function sortPathWithStart(path, startNode) {
  if (!path || path.length === 0) return path;

  // Gjej indeksin e nodës së fillimit
  const startIndex = path.findIndex(city => city.lat === startNode.lat && city.lon === startNode.lon);

  if (startIndex === -1) return path; // Nëse nuk gjendet, kthe rrugën siç është

  // Riorganizo listën që të fillojë nga startNode
  return [...path.slice(startIndex), ...path.slice(0, startIndex)];
}
