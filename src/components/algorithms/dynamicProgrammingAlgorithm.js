import { calculateDistance } from './geneticAlgorithm';

export const dynamicProgrammingAlgorithm = (cities) => {
  const n = cities.length;
  if (n === 0) return [];

  const memo = Array(1 << n).fill(null).map(() => Array(n).fill(Infinity));
  const path = Array(1 << n).fill(null).map(() => Array(n).fill(-1));

  memo[1][0] = 0;

  for (let mask = 1; mask < (1 << n); mask += 2) {
    for (let u = 1; u < n; u++) {
      if (mask & (1 << u)) {
        for (let v = 0; v < n; v++) {
          if ((mask & (1 << v)) && v !== u) {

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

  let minDistance = Infinity;
  let lastNode = -1;
  for (let i = 1; i < n; i++) {
    const dist = memo[(1 << n) - 1][i] + calculateDistance(cities[i].lat, cities[i].lon, cities[0].lat, cities[0].lon);
    if (dist < minDistance) {
      minDistance = dist;
      lastNode = i;
    }
  }

  const finalPath = [];
  let mask = (1 << n) - 1;
  let currNode = lastNode;

  while (currNode !== -1) {
    finalPath.push(cities[currNode]);
    const nextNode = path[mask][currNode];
    mask ^= (1 << currNode);
    currNode = nextNode;
  }

  finalPath.push(cities[0]); 
  return finalPath.reverse(); 
};
