import { totalDistance } from './geneticAlgorithm';

export const bruteForceAlgorithm = (cities) => {
  if (cities.length > 10) {
    // Nëse ka më shumë se 10 qytete, mos ekzekuto algoritmin dhe kthe një mesazh
    console.error("BruteForce algorithm is too slow for more than 10 cities.");
    return [];
  }

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

  const allPaths = permute(cities);
  let bestPath = allPaths[0];
  let bestDistance = totalDistance(bestPath);

  for (let path of allPaths) {
    const dist = totalDistance(path);
    if (dist < bestDistance) {
      bestDistance = dist;
      bestPath = path;
    }
  }
  return bestPath;
};
