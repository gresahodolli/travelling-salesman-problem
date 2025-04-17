// Haversine formula to calculate distance between two coordinates (in kilometers)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

// Calculates the total path distance including return to the starting city
export const totalDistance = (path) => {
  let distance = 0;
  for (let i = 0; i < path.length - 1; i++) {
      distance += calculateDistance(
          path[i].lat, path[i].lon,
          path[i + 1].lat, path[i + 1].lon
      );
  }
  // Add return trip to starting city
  distance += calculateDistance(
      path[path.length - 1].lat, path[path.length - 1].lon,
      path[0].lat, path[0].lon
  );
  return distance;
};

// Fisher-Yates Shuffle — randomly shuffles cities in an array
export const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Crossover operator for genetic algorithm — ordered crossover
export const crossover = (parent1, parent2) => {
  const start = Math.floor(Math.random() * parent1.length);
  const end = Math.floor(Math.random() * (parent1.length - start)) + start;
  const child = parent1.slice(start, end);
  parent2.forEach((city) => {
      if (!child.includes(city)) child.push(city);
  });
  return child;
};

// Mutation using 2-opt — reverses a segment of the path to explore new solutions
export const mutate2Opt = (path) => {
  const size = path.length;
  const i = Math.floor(Math.random() * size);
  const j = (i + 1 + Math.floor(Math.random() * (size - 1))) % size;

  if (i < j) {
      path = [...path.slice(0, i), ...path.slice(i, j).reverse(), ...path.slice(j)];
  } else {
      path = [...path.slice(0, j), ...path.slice(j, i).reverse(), ...path.slice(i)];
  }
  return path;
};

// Genetic Algorithm Main Process
export const geneticAlgorithm = (cities, populationSize = 100, generations = 500, mutationRate = 0.1) => {
  let population = createInitialPopulation(cities, populationSize);
  let bestDistance = Infinity;
  let noImprovementCount = 0;

  for (let generation = 0; generation < generations; generation++) {
      // Sort population based on path distance (fitness)
      population.sort((a, b) => totalDistance(a) - totalDistance(b));
      const newPopulation = population.slice(0, populationSize / 2); // Keep the best half

      const currentBestDistance = totalDistance(newPopulation[0]);
      if (currentBestDistance < bestDistance) {
          bestDistance = currentBestDistance;
          noImprovementCount = 0; 
      } else {
          noImprovementCount++;
      }
      
      // Stop early if no improvement for 50 generations
      if (noImprovementCount >= 50) {
          console.log(`Stopping early at generation ${generation} due to no improvements.`);
          break;
      }

      // Create children by crossover + possible mutation
      while (newPopulation.length < populationSize) {
          const parent1 = newPopulation[Math.floor(Math.random() * (populationSize / 2))];
          const parent2 = newPopulation[Math.floor(Math.random() * (populationSize / 2))];
          const child = crossover(parent1, parent2);

          if (Math.random() < mutationRate) {
              mutate2Opt(child); 
          }

          newPopulation.push(child);
      }

      // Fill in remaining population if needed (e.g., due to duplicates)
      while (newPopulation.length < populationSize) {
          newPopulation.push(shuffle([...cities]));
      }

      population = newPopulation;
  }

  population.sort((a, b) => totalDistance(a) - totalDistance(b));
  return population[0]; // Return the best path
};

// Creates a population of unique random paths (chromosomes)
export const createInitialPopulation = (cities, populationSize) => {
  const population = [];
  const uniquePaths = new Set();

  while (population.length < populationSize) {
      let path = shuffle([...cities]);
      let pathString = JSON.stringify(path);

      if (!uniquePaths.has(pathString)) {
          uniquePaths.add(pathString);
          population.push(path);
      }
  }
  return population;
};
