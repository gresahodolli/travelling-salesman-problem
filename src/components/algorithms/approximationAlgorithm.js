import { calculateDistance } from './geneticAlgorithm';

// Approximation algorithm using Nearest Neighbor + 2-opt improvement
export const approximationAlgorithm = (cities) => {
  if (cities.length === 0) return [];

  const remainingCities = [...cities]; // Cities left to visit
  const path = [];
  let currentCity = remainingCities.shift(); // Start from the first city
  path.push(currentCity);

  // Build initial path using the Nearest Neighbor heuristic
  while (remainingCities.length > 0) {

    let nearestCity = findNearestCity(currentCity, remainingCities);

    if (nearestCity) {
      path.push(nearestCity);
      currentCity = nearestCity;
      remainingCities.splice(remainingCities.indexOf(nearestCity), 1);
    }
  }

  path.push(path[0]); // Complete the loop by returning to the starting city

  // Improve the path using 2-opt local search
  return twoOptOptimization(path);
};

// Finds the closest city to the current one from the list
const findNearestCity = (currentCity, cities) => {
  let nearestCity = null;
  let nearestDistance = Infinity;

  for (let city of cities) {
    const distance = calculateDistance(
      currentCity.lat, currentCity.lon,
      city.lat, city.lon
    );

    if (distance < nearestDistance) {
      nearestCity = city;
      nearestDistance = distance;
    }
  }
  
  return nearestCity;
};

// 2-opt: Try to improve path by swapping two edges if it shortens the path
const twoOptOptimization = (path) => {
  let improved = true;
  
  while (improved) {
    improved = false;
    for (let i = 1; i < path.length - 2; i++) {
      for (let j = i + 1; j < path.length - 1; j++) {
        const beforeSwap =
          calculateDistance(path[i - 1].lat, path[i - 1].lon, path[i].lat, path[i].lon) +
          calculateDistance(path[j].lat, path[j].lon, path[j + 1].lat, path[j + 1].lon);

        const afterSwap =
          calculateDistance(path[i - 1].lat, path[i - 1].lon, path[j].lat, path[j].lon) +
          calculateDistance(path[i].lat, path[i].lon, path[j + 1].lat, path[j + 1].lon);

        // If swapping improves total distance, perform the swap
        if (afterSwap < beforeSwap) {
          path = [
            ...path.slice(0, i),
            ...path.slice(i, j + 1).reverse(),
            ...path.slice(j + 1),
          ];
          improved = true;
        }
      }
    }
  }
  
  return path;
};
