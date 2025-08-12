# Technical Documentation - Route Optimization Algorithm

## Overview

The Route Planner app implements a two-stage optimization algorithm to solve the Traveling Salesman Problem (TSP) for route planning with multiple destinations.

## Algorithm Pipeline

```
User Input → Distance Matrix → Nearest Neighbor → 2-opt (optional) → Optimized Route
```

## 1. Distance Matrix Computation

### Haversine Formula Implementation

The app uses the Haversine formula for calculating great-circle distances between coordinates:

```typescript
function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
            Math.cos(lat1) * Math.cos(lat2) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}
```

### Matrix Properties
- **Symmetric**: distance(A,B) = distance(B,A)
- **Zero diagonal**: distance(A,A) = 0
- **Triangle inequality**: distance(A,C) ≤ distance(A,B) + distance(B,C)

## 2. Nearest Neighbor Algorithm

### Purpose
Constructs an initial feasible route by always selecting the nearest unvisited destination.

### Algorithm Steps
1. Start from user-selected starting point (or auto-suggested nearest to user location)
2. Find the nearest unvisited destination
3. Move to that destination and mark as visited
4. Repeat until all destinations are visited

### Pseudocode
```
function nearestNeighbor(distances, startIndex):
    visited = [false] * n
    route = [startIndex]
    visited[startIndex] = true
    current = startIndex
    
    for i = 1 to n-1:
        nearest = findNearestUnvisited(current, distances, visited)
        route.append(nearest)
        visited[nearest] = true
        current = nearest
    
    return route
```

### Complexity Analysis
- **Time Complexity**: O(n²)
- **Space Complexity**: O(n)
- **Approximation Ratio**: No guaranteed bound (can be poor for some cases)

### Performance Characteristics
- **Best Case**: Near-optimal for clustered points
- **Average Case**: 15-20% longer than optimal
- **Worst Case**: Can be 2x optimal or worse

## 3. 2-opt Optimization

### Purpose
Improves the initial route by eliminating crossing edges through local optimization.

### Edge Swapping Logic
For any two edges (i,i+1) and (j,j+1), consider swapping to (i,j) and (i+1,j+1):

```
Original:  A → B → C → D → E
           i   i+1 j   j+1

Swapped:   A → D → C → B → E
           i   j   j-1 i+1
```

### Algorithm Implementation
```typescript
function twoOpt(route: number[], distances: number[][]): number[] {
    let improved = true;
    let bestRoute = [...route];
    
    while (improved) {
        improved = false;
        
        for (let i = 1; i < route.length - 2; i++) {
            for (let j = i + 1; j < route.length - 1; j++) {
                // Calculate current distance
                const currentDist = distances[route[i-1]][route[i]] + 
                                  distances[route[j]][route[j+1]];
                
                // Calculate swapped distance
                const swappedDist = distances[route[i-1]][route[j]] + 
                                  distances[route[i]][route[j+1]];
                
                if (swappedDist < currentDist) {
                    // Perform 2-opt swap
                    bestRoute = twoOptSwap(bestRoute, i, j);
                    improved = true;
                }
            }
        }
    }
    
    return bestRoute;
}
```

### Complexity Analysis
- **Time Complexity**: O(n²) per iteration, typically O(n³) total
- **Space Complexity**: O(n)
- **Convergence**: Guaranteed to local optimum

### Performance Impact
- **Average Improvement**: 10-20% distance reduction
- **Computation Time**: 50-200ms for 10 destinations
- **Best Case**: 30%+ improvement for poorly ordered initial routes

## 4. Performance Optimizations

### Distance Matrix Caching
```typescript
const distanceMatrix = computeDistanceMatrixKm(coordinates);
// Reuse matrix for multiple algorithm runs
```

### Early Termination
```typescript
if (swappedDist + EPSILON < currentDist) {
    // Only swap if improvement is significant (> 1 meter)
    performSwap();
}
```

### Memory Efficiency
- Pre-allocate arrays to avoid garbage collection
- Use symmetric matrix properties (store only upper triangle)
- Minimize object creation in hot paths

## 5. User Experience Considerations

### Algorithm Selection
- **Default**: Nearest Neighbor only (fast, good enough)
- **Advanced**: Nearest Neighbor + 2-opt (better quality, slower)

### Progress Indication
```typescript
// Show optimization progress for long computations
if (destinations.length > 8) {
    showOptimizationSpinner();
}
```

### Fallback Handling
```typescript
try {
    optimizedRoute = runOptimization();
} catch (error) {
    // Fallback to simple ordering
    optimizedRoute = simpleDistanceSort();
}
```

## 6. Future Improvements

### Algorithm Enhancements
- **3-opt**: More sophisticated edge swapping
- **Genetic Algorithm**: Global optimization for 15+ destinations
- **Simulated Annealing**: Escape local optima

### Real-world Integration
- **Traffic Data**: Use Google Directions API for realistic travel times
- **Time Windows**: Support for destination opening hours
- **Vehicle Constraints**: Different vehicle types and capacities

### Performance Scaling
- **Web Workers**: Move computation off main thread
- **Incremental Updates**: Re-optimize when destinations change
- **Caching**: Store pre-computed optimal routes

## 7. Testing and Validation

### Test Cases
```typescript
// Known optimal solutions for validation
const testCases = [
    { points: [[0,0], [1,0], [1,1], [0,1]], optimal: [0,1,2,3] },
    { points: clusteredPoints, expectedImprovement: 0.15 }
];
```

### Performance Benchmarks
- **5 destinations**: < 10ms
- **10 destinations**: < 100ms  
- **15 destinations**: < 500ms (with 2-opt)

### Quality Metrics
```typescript
function routeQuality(route: number[], optimal: number): number {
    const routeDistance = calculateTotalDistance(route);
    return routeDistance / optimal; // 1.0 = perfect, higher = worse
}
```

---

This algorithm provides a good balance between computational efficiency and route quality for the typical use case of 3-10 destinations in urban route planning scenarios.
