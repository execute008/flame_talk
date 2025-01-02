import * as THREE from "three";

const INTERPOLATION_DELAY = 100; // ms
const MAX_EXTRAPOLATION_TIME = 200; // ms

export default class Player {
  constructor(id, x, z, isLocalPlayer = false) {
    console.log("Creating player", id);
    this.id = id;

    this.initialX = Number.isFinite(x) ? x : 0;
    this.initialZ = Number.isFinite(z) ? z : 0;

    this.mesh = this.createPlayerMesh();
    this.mesh.position.set(this.initialX, 0.25, this.initialZ);

    this.positionBuffer = [
      {
        x: this.initialX,
        z: this.initialZ,
        timestamp: Date.now(),
      },
    ];

    this.lastUpdateTime = Date.now();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.isLocalPlayer = isLocalPlayer;
  }

  addPosition(x, z, timestamp) {
    this.positionBuffer.push({ x, z, timestamp });
    if (this.positionBuffer.length > 10) {
      this.positionBuffer.shift();
    }
    this.lastUpdateTime = timestamp;

    // Immediately update the mesh position for the local player
    if (this.isLocalPlayer) {
      this.mesh.position.set(x, 0.25, z);
    }
  }

  setVelocity(x, z) {
    this.velocity.set(
      Number.isFinite(x) ? x : 0,
      0,
      Number.isFinite(z) ? z : 0
    );
  }

  updatePosition(deltaTime) {
    if (!Number.isFinite(deltaTime)) return;

    const newX = this.mesh.position.x + this.velocity.x * deltaTime;
    const newZ = this.mesh.position.z + this.velocity.z * deltaTime;

    if (Number.isFinite(newX) && Number.isFinite(newZ)) {
      this.mesh.position.set(newX, 0.25, newZ);
    }
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
