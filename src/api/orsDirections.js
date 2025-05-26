export async function getORSRoutePolyline(from, to) {
  const response = await fetch('http://localhost:4000/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: [
        [from.lon, from.lat],
        [to.lon, to.lat]
      ]
    })
  });

  const data = await response.json();
  
  if (!data || !data.features || !data.features[0]) {
    throw new Error("Invalid ORS route response");
  }

  // Extract coordinates: [lon, lat] → transform to [lat, lon] for Leaflet
  const coords = data.features[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
  return coords;
}
