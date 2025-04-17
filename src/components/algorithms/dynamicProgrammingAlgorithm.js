import { calculateDistance } from './geneticAlgorithm';

// Held-Karp Dynamic Programming algorithm for solving TSP exactly
export const dynamicProgrammingAlgorithm = (cities) => {
  const n = cities.length;
  if (n === 0) return [];

  // memo[mask][i] = shortest path to reach subset `mask` ending at city i
  const memo = Array(1 << n).fill(null).map(() => Array(n).fill(Infinity));

  // path[mask][i] = previous city before i in optimal path for `mask`
  const path = Array(1 << n).fill(null).map(() => Array(n).fill(-1));

  memo[1][0] = 0; // Base case: only city 0 is visited, cost is 0

  // Iterate through all subsets of cities represented as bitmasks
  for (let mask = 1; mask < (1 << n); mask += 2) { // Always include city 0
    for (let u = 1; u < n; u++) {
      if (mask & (1 << u)) { // City u is in subset
        for (let v = 0; v < n; v++) {
          if ((mask & (1 << v)) && v !== u) { // Previous city v also in subset
            if (memo[mask ^ (1 << u)][v] !== Infinity) { 
              const newDist = memo[mask ^ (1 << u)][v] + calculateDistance(
                cities[v].lat, cities[v].lon, 
                cities[u].lat, cities[u].lon
              );
              
              // Update if this path is better
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

  // Find the optimal path ending at any city, then returning to city 0
  let minDistance = Infinity;
  let lastNode = -1;
  for (let i = 1; i < n; i++) {
    const dist = memo[(1 << n) - 1][i] + calculateDistance(cities[i].lat, cities[i].lon, cities[0].lat, cities[0].lon);
    if (dist < minDistance) {
      minDistance = dist;
      lastNode = i;
    }
  }

  // Reconstruct the optimal path by backtracking through `path`
  const finalPath = [];
  let mask = (1 << n) - 1;
  let currNode = lastNode;

  while (currNode !== -1) {
    finalPath.push(cities[currNode]);
    const nextNode = path[mask][currNode];
    mask ^= (1 << currNode); // Remove current node from subset
    currNode = nextNode;
  }

  finalPath.push(cities[0]); // Return to the starting city
  return finalPath.reverse(); // Reverse to get the correct order
};
