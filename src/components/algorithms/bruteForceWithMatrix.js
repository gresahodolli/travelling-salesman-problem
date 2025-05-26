export const bruteForceWithMatrix = (cities, matrix) => {
  const indices = cities.map((_, i) => i);
  const permutations = permute(indices);

  let bestPath = permutations[0];
  let minDistance = calculatePathDistance(bestPath, matrix);

  for (let path of permutations) {
    const dist = calculatePathDistance(path, matrix);
    if (dist < minDistance) {
      minDistance = dist;
      bestPath = path;
    }
  }

  return bestPath.map(i => cities[i]);
};

function permute(arr) {
  if (arr.length <= 1) return [arr];
  let result = [];
  for (let i = 0; i < arr.length; i++) {
    let rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (let perm of permute(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

export function calculatePathDistance(path, matrix) {
  let dist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    dist += matrix[path[i]][path[i + 1]];
  }
  dist += matrix[path[path.length - 1]][path[0]];
  return dist;
}
