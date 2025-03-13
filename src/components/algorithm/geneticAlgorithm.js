// Haversine formula to calculate distance between two coordinates
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Function to calculate the total distance of a given path
export const totalDistance = (path) => {
  let distance = 0;
  for (let i = 0; i < path.length - 1; i++) {
      distance += calculateDistance(
          path[i].lat, path[i].lon,
          path[i + 1].lat, path[i + 1].lon
      );
  }
  distance += calculateDistance(
      path[path.length - 1].lat, path[path.length - 1].lon,
      path[0].lat, path[0].lon
  ); // Return to the starting city
  return distance;
};

// Shuffle function for creating random paths
export const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Crossover function (simple ordered crossover)
export const crossover = (parent1, parent2) => {
  const start = Math.floor(Math.random() * parent1.length);
  const end = Math.floor(Math.random() * (parent1.length - start)) + start;
  const child = parent1.slice(start, end);
  parent2.forEach((city) => {
      if (!child.includes(city)) child.push(city);
  });
  return child;
};

// 2-opt mutation: improve path by reversing a segment
export const mutate2Opt = (path) => {
  const size = path.length;
  const i = Math.floor(Math.random() * size);
  const j = (i + 1 + Math.floor(Math.random() * (size - 1))) % size;

  // Reverse the path between city i and city j
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
      population.sort((a, b) => totalDistance(a) - totalDistance(b)); // Sort by shortest path
      const newPopulation = population.slice(0, populationSize / 2); // Keep the best half

      // Check for improvement
      const currentBestDistance = totalDistance(newPopulation[0]);
      if (currentBestDistance < bestDistance) {
          bestDistance = currentBestDistance;
          noImprovementCount = 0; // Reset the counter
      } else {
          noImprovementCount++;
      }

      // Early stopping: stop if no improvement for 50 generations
      if (noImprovementCount >= 50) {
          console.log(`Stopping early at generation ${generation} due to no improvements.`);
          break;
      }

      // Crossover and mutation
      while (newPopulation.length < populationSize) {
          const parent1 = newPopulation[Math.floor(Math.random() * (populationSize / 2))];
          const parent2 = newPopulation[Math.floor(Math.random() * (populationSize / 2))];
          const child = crossover(parent1, parent2);

          if (Math.random() < mutationRate) {
              mutate2Opt(child); // Use the advanced 2-opt mutation
          }

          newPopulation.push(child);
      }

      // Add random individuals to keep population diversity
      while (newPopulation.length < populationSize) {
          newPopulation.push(shuffle([...cities]));
      }

      population = newPopulation;
  }

  population.sort((a, b) => totalDistance(a) - totalDistance(b));
  return population[0]; // Return the best solution
};

// Function to create initial population
export const createInitialPopulation = (cities, populationSize) => {
  const population = [];
  const uniquePaths = new Set();

  while (population.length < populationSize) {
      let path = shuffle([...cities]);
      let pathString = JSON.stringify(path);

      // Add only unique paths
      if (!uniquePaths.has(pathString)) {
          uniquePaths.add(pathString);
          population.push(path);
      }
  }
  return population;
};
