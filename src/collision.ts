import { playCarCrash, stopCarEngine, playCarCrashQuiet } from './audio.js';
import * as THREE from 'three';

function getHitZonePosition(center, angle, clockwise, distance) {
  const directionAngle = angle + (clockwise ? -Math.PI / 2 : +Math.PI / 2);
  return {
    x: center.x + Math.cos(directionAngle) * distance,
    y: center.y + Math.sin(directionAngle) * distance,
  };
}

function getDistance(c1, c2) {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Helper: Mark vehicle as crashed, change appearance, show explosion, and schedule removal
function destroyVehicle(vehicle, scene, otherVehicles, isPlayer = false) {
  vehicle.crashed = true;
  playCarCrashQuiet();
  // Change appearance: blend 70% black with original color, 30% transparent
  vehicle.mesh.traverse(child => {
    if (child.material) {
      if (child.material.color) {
        // Save original color if not already saved
        child.material.userData = child.material.userData || {};
        if (!child.material.userData.originalColor) {
          child.material.userData.originalColor = child.material.color.clone();
        }
        // Blend 70% black with original color
        const orig = child.material.userData.originalColor;
        child.material.color.r = orig.r * 0.3;
        child.material.color.g = orig.g * 0.3;
        child.material.color.b = orig.b * 0.3;
      }
      child.material.opacity = 0.7;
      child.material.transparent = true;
    }
  });
  // Deform: squash and skew
  vehicle.mesh.scale.y *= 0.7;
  vehicle.mesh.scale.x *= 1.2;
  vehicle.mesh.rotation.z += Math.PI / 12;
  // Explosion: add a growing sphere
  const explosion = new THREE.Mesh(
    new THREE.SphereGeometry(20, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8,
    })
  );
  explosion.position.copy(vehicle.mesh.position);
  scene.add(explosion);
  vehicle.explosionMesh = explosion;
  let scale = 1;
  const grow = () => {
    if (!explosion.parent) return;
    scale += 0.2;
    explosion.scale.set(scale, scale, scale);
    explosion.material.opacity *= 0.92;
    if (explosion.material.opacity > 0.05) {
      requestAnimationFrame(grow);
    } else {
      scene.remove(explosion);
    }
  };
  grow();
  if (!isPlayer) {
    // Use a managed timeout that can be cleared on game reset
    if (typeof window !== 'undefined' && (window as any).addTimeout) {
      (window as any).addTimeout(() => {
        scene.remove(vehicle.mesh);
        if (vehicle.explosionMesh) {
          scene.remove(vehicle.explosionMesh);
          vehicle.explosionMesh = null;
        }
        const idx = otherVehicles.indexOf(vehicle);
        if (idx !== -1) otherVehicles.splice(idx, 1);
      }, 2000);
    } else {
      // Fallback to regular setTimeout if timeout management not available
      setTimeout(() => {
        scene.remove(vehicle.mesh);
        if (vehicle.explosionMesh) {
          scene.remove(vehicle.explosionMesh);
          vehicle.explosionMesh = null;
        }
        const idx = otherVehicles.indexOf(vehicle);
        if (idx !== -1) otherVehicles.splice(idx, 1);
      }, 2000);
    }
  }
}

// Helper: Check if two vehicles are close enough to crash
function vehiclesCollide(v1, v2) {
  if (v1.crashed || v2.crashed) return false;
  if (v1.radius !== v2.radius) return false;
  const dx = v1.mesh.position.x - v2.mesh.position.x;
  const dy = v1.mesh.position.y - v2.mesh.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < 60; // Tune as needed
}

export function checkCollision({
  playerCar,
  playerAngleInitial,
  playerAngleMoved,
  otherVehicles,
  showResults,
  stopAnimationLoop,
  scene, // Pass scene for explosion
}) {
  // Track vehicles involved in player collision
  const playerCollidedVehicles = new Set();
  const playerHitZone1 = getHitZonePosition(
    playerCar.position,
    playerAngleInitial + playerAngleMoved,
    true,
    15
  );
  const playerHitZone2 = getHitZonePosition(
    playerCar.position,
    playerAngleInitial + playerAngleMoved,
    true,
    -15
  );
  let hit = false;
  let collidedVehicle = null;
  otherVehicles.forEach(vehicle => {
    if (vehicle.crashed) return;
    let vehicleHit = false;
    if (vehicle.type === 'car') {
      const vehicleHitZone1 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        15
      );
      const vehicleHitZone2 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        -15
      );
      if (getDistance(playerHitZone1, vehicleHitZone1) < 40) vehicleHit = true;
      if (getDistance(playerHitZone1, vehicleHitZone2) < 40) vehicleHit = true;
      if (getDistance(playerHitZone2, vehicleHitZone1) < 40) vehicleHit = true;
    }
    if (vehicle.type === 'truck') {
      const vehicleHitZone1 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        35
      );
      const vehicleHitZone2 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        0
      );
      const vehicleHitZone3 = getHitZonePosition(
        vehicle.mesh.position,
        vehicle.angle,
        vehicle.clockwise,
        -35
      );
      if (getDistance(playerHitZone1, vehicleHitZone1) < 40) vehicleHit = true;
      if (getDistance(playerHitZone1, vehicleHitZone2) < 40) vehicleHit = true;
      if (getDistance(playerHitZone1, vehicleHitZone3) < 40) vehicleHit = true;
      if (getDistance(playerHitZone2, vehicleHitZone1) < 40) vehicleHit = true;
    }
    if (vehicleHit) {
      playerCollidedVehicles.add(vehicle);
      vehicle.crashed = true; // Stop moving
      collidedVehicle = vehicle;
      hit = true;
    }
  });
  if (hit) {
    // Destroy both the player's car and the collided vehicle BEFORE game over
    if (collidedVehicle) destroyVehicle(collidedVehicle, scene, otherVehicles);
    destroyVehicle({ mesh: playerCar, crashed: false }, scene, [], true);
    playCarCrash();
    stopCarEngine();
    // Use managed timeout for game over delay
    if (typeof window !== 'undefined' && (window as any).addTimeout) {
      (window as any).addTimeout(() => {
        showResults(true);
        stopAnimationLoop();
        
        // Track game over
        if (typeof window !== 'undefined' && window.trackEvent) {
          window.trackEvent('game_over', {
            game_id: 'traffic_run',
            game_name: 'Traffic Run',
            final_score: Math.floor(Math.abs(playerAngleMoved) / (Math.PI * 2)),
            event_category: 'game_interaction'
          });
        }
      }, 1000); // Delay game over by 1s for animation
    } else {
      // Fallback to regular setTimeout
      setTimeout(() => {
        showResults(true);
        stopAnimationLoop();
        
        // Track game over
        if (typeof window !== 'undefined' && window.trackEvent) {
          window.trackEvent('game_over', {
            game_id: 'traffic_run',
            game_name: 'Traffic Run',
            final_score: Math.floor(Math.abs(playerAngleMoved) / (Math.PI * 2)),
            event_category: 'game_interaction'
          });
        }
      }, 1000);
    }
    return true;
  }
  // Car-to-car collisions in the same lane (skip vehicles involved in player collision)
  for (let i = 0; i < otherVehicles.length; ++i) {
    for (let j = i + 1; j < otherVehicles.length; ++j) {
      const v1 = otherVehicles[i];
      const v2 = otherVehicles[j];
      if (playerCollidedVehicles.has(v1) || playerCollidedVehicles.has(v2))
        continue;
      if (vehiclesCollide(v1, v2)) {
        destroyVehicle(v1, scene, otherVehicles);
        destroyVehicle(v2, scene, otherVehicles);
      }
    }
  }
  return false;
}
