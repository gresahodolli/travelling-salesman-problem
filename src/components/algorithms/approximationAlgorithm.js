import { calculateDistance } from './geneticAlgorithm';

export const approximationAlgorithm = (cities) => {
  if (cities.length === 0) return [];

  const remainingCities = [...cities];
  const path = [];
  let currentCity = remainingCities.shift();
  path.push(currentCity);

  while (remainingCities.length > 0) {

    let nearestCity = findNearestCity(currentCity, remainingCities);

    if (nearestCity) {
      path.push(nearestCity);
      currentCity = nearestCity;
      remainingCities.splice(remainingCities.indexOf(nearestCity), 1);
    }
  }

  path.push(path[0]);

  return twoOptOptimization(path);
};

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


const twoOptOptimization = (path) => {
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < path.length - 2; i++) {
      for (let j = i + 1; j < path.length - 1; j++) {
        if (
          calculateDistance(path[i - 1].lat, path[i - 1].lon, path[j].lat, path[j].lon) +
          calculateDistance(path[i].lat, path[i].lon, path[j + 1].lat, path[j + 1].lon) <
          calculateDistance(path[i - 1].lat, path[i - 1].lon, path[i].lat, path[i].lon) +
          calculateDistance(path[j].lat, path[j].lon, path[j + 1].lat, path[j + 1].lon)
        ) {
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
