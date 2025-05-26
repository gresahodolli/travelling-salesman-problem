export async function getDistanceMatrix(cities) {
  const locations = cities.map(c => [c.lon, c.lat]);
  console.log("Sending matrix request with:", locations);

  const response = await fetch('http://localhost:4000/matrix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locations })
  });

  const data = await response.json();
  console.log("Received matrix response:", data); 
  return data.distances;
}
