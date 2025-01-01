import * as THREE from "three";

export default class Player {
  constructor(id, x, z) {
    this.id = id;
    this.mesh = this.createPlayerMesh();
    this.mesh.position.set(x, 0.25, z); // Set initial position
    this.positionBuffer = [{ x, z, timestamp: Date.now() }];
    this.lastUpdateTime = Date.now();
    this.velocity = new THREE.Vector3();
  }

  addPosition(x, z, timestamp) {
    this.positionBuffer.push({ x, z, timestamp });
    if (this.positionBuffer.length > 10) {
      this.positionBuffer.shift();
    }
    this.lastUpdateTime = timestamp;

    // Immediately update the mesh position for the local player
    if (this.id === userId) {
      this.mesh.position.set(x, 0.25, z);
    }
  }

  updatePosition(deltaTime) {
    this.mesh.position.x += this.velocity.x * deltaTime;
    this.mesh.position.z += this.velocity.z * deltaTime;
  }

  interpolate(renderTime) {
    if (this.positionBuffer.length < 2) return;

    const interpolationTime = renderTime - INTERPOLATION_DELAY;

    // Find the two positions to interpolate between
    let position1, position2;
    for (let i = 0; i < this.positionBuffer.length - 1; i++) {
      if (this.positionBuffer[i + 1].timestamp > interpolationTime) {
        position1 = this.positionBuffer[i];
        position2 = this.positionBuffer[i + 1];
        break;
      }
    }

    if (!position1 || !position2) {
      // If we don't have two points to interpolate between, use the latest known position
      const latestPosition =
        this.positionBuffer[this.positionBuffer.length - 1];
      this.mesh.position.set(latestPosition.x, 0.25, latestPosition.z);
      return;
    }

    // Calculate how far we are between position1 and position2
    const timeBetweenPoints = position2.timestamp - position1.timestamp;
    const timeFromPoint1 = interpolationTime - position1.timestamp;

    // If we're extrapolating too far, cap it
    const t = Math.min(
      timeFromPoint1 / timeBetweenPoints,
      1 + MAX_EXTRAPOLATION_TIME / timeBetweenPoints
    );

    // Hermite interpolation
    const t2 = t * t;
    const t3 = t2 * t;
    const h1 = 2 * t3 - 3 * t2 + 1;
    const h2 = -2 * t3 + 3 * t2;
    const h3 = t3 - 2 * t2 + t;
    const h4 = t3 - t2;

    const dx = position2.x - position1.x;
    const dz = position2.z - position1.z;

    const x = h1 * position1.x + h2 * position2.x + h3 * dx + h4 * dx;
    const z = h1 * position1.z + h2 * position2.z + h3 * dz + h4 * dz;

    this.mesh.position.set(x, 0.25, z);
  }

  createPlayerMesh() {
    const playerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true;
    return playerMesh;
  }
}
