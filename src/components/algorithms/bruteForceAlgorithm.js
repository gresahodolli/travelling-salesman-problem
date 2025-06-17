import { totalDistance } from './geneticAlgorithm';

// Brute-force TSP solver — checks all possible permutations of cities
export const bruteForceAlgorithm = (cities) => {
  const actualCities =
    cities.length > 1 &&
    cities[0].lat === cities[cities.length - 1].lat &&
    cities[0].lon === cities[cities.length - 1].lon
      ? cities.slice(0, -1)
      : cities;
      
  if (actualCities.length >= 10) {
    console.error("BruteForce algorithm is too slow for more than 9 cities.");
    return [];
  }

  // Generate all permutations of the city array
  const permute = (arr) => {
    if (arr.length <= 1) return [arr];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (let perm of permute(rest)) {
        result.push([arr[i], ...perm]);
      }
    }
    return result;
  };

  // Get all possible city routes
  const allPaths = permute(actualCities);

  // Initialize best path as the first one
  let bestPath = allPaths[0];
  let bestDistance = totalDistance(bestPath);

  // Find the path with the smallest total distance
  for (let path of allPaths) {
    const dist = totalDistance(path);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestPath = path;
    }
  }

  return bestPath;
};