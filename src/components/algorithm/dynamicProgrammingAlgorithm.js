import { calculateDistance } from './geneticAlgorithm';

export const dynamicProgrammingAlgorithm = (cities) => {
  const n = cities.length;
  if (n === 0) return [];

  // Krijo një matricë për të mbajtur distancat minimale
  const memo = Array(1 << n).fill(null).map(() => Array(n).fill(Infinity));
  const path = Array(1 << n).fill(null).map(() => Array(n).fill(-1));

  // Rruga fillestare nga qyteti 0
  memo[1][0] = 0;

  for (let mask = 1; mask < (1 << n); mask += 2) { // Vetëm rastet ku qyteti 0 është vizituar
    for (let u = 1; u < n; u++) {
      if (mask & (1 << u)) { // Nëse qyteti `u` është vizituar
        for (let v = 0; v < n; v++) {
          if ((mask & (1 << v)) && v !== u) { // Nëse qyteti `v` është vizituar dhe nuk është `u`

            // **Shto këtë pjesën për të shmangur rastet e pavlefshme**
            if (memo[mask ^ (1 << u)][v] !== Infinity) { 
              const newDist = memo[mask ^ (1 << u)][v] + calculateDistance(
                cities[v].lat, cities[v].lon, 
                cities[u].lat, cities[u].lon
              );
              
              if (newDist < memo[mask][u]) {
                memo[mask][u] = newDist;
                path[mask][u] = v;
              }
            }

          }
        }
      }
    }
  }

  // Rikuperimi i rrugës më të mirë nga matrica
  let minDistance = Infinity;
  let lastNode = -1;
  for (let i = 1; i < n; i++) {
    const dist = memo[(1 << n) - 1][i] + calculateDistance(cities[i].lat, cities[i].lon, cities[0].lat, cities[0].lon);
    if (dist < minDistance) {
      minDistance = dist;
      lastNode = i;
    }
  }

  // Ndërto rrugën nga rezultati
  const finalPath = [];
  let mask = (1 << n) - 1;
  let currNode = lastNode;

  while (currNode !== -1) {
    finalPath.push(cities[currNode]);
    const nextNode = path[mask][currNode];
    mask ^= (1 << currNode);
    currNode = nextNode;
  }

  finalPath.push(cities[0]); // Rikthemi te qyteti fillestar
  return finalPath.reverse(); // Rikthe rrugën në rendin e duhur
};
