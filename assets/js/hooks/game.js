import * as THREE from "three";
import { fireFragmentShader, fireVertexShader } from "../data/shaders";

export default {
  mounted() {
    const canvas = this.el.querySelector("#game-canvas");
    const roomId = this.el.dataset.roomId;
    const userId = this.el.dataset.userId;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const fireGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    const fireMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: fireVertexShader,
      fragmentShader: fireFragmentShader,
      transparent: true,
    });
    const fire = new THREE.Mesh(fireGeometry, fireMaterial);
    fire.position.set(0, 0.5, 0);
    fire.rotation.x = -Math.PI / 2;
    scene.add(fire);

    const fireLight = new THREE.PointLight(0xff6600, 1000, 50);
    fireLight.position.set(0, 1.5, 0);
    fireLight.castShadow = true;
    scene.add(fireLight);

    // const helper = new THREE.CameraHelper(fireLight.shadow.camera);
    // scene.add(helper);

    // Improve shadow quality
    fireLight.shadow.mapSize.width = 512;
    fireLight.shadow.mapSize.height = 512;
    fireLight.shadow.camera.near = 0.5;
    fireLight.shadow.camera.far = 15;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Add ground
    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x33aa33 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    camera.position.set(0, 5, 5);
    camera.lookAt(0, 0, 0);

    const INTERPOLATION_DELAY = 100; // ms
    const MAX_EXTRAPOLATION_TIME = 200; // ms

    class Player {
      constructor(id, x, z) {
        this.id = id;
        this.mesh = createPlayerMesh();
        this.mesh.position.set(x, 0.25, z); // Set initial position
        this.positionBuffer = [{ x, z, timestamp: Date.now() }];
        this.lastUpdateTime = Date.now();
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
          this.mesh.position.set(latestPosition.x, 0, latestPosition.z);
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
    }

    const players = new Map();

    const createPlayerMesh = () => {
      const playerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
      player = new THREE.Mesh(playerGeometry, playerMaterial);
      player.castShadow = true;
      player.receiveShadow = true;
      return player;
    };

    const localPlayer = new Player(userId, 0, 0);
    players.set(userId, localPlayer);
    scene.add(localPlayer.mesh);

    this.handleEvent("update_players", ({ players: serverPlayers }) => {
      const currentTime = Date.now();
      Object.entries(serverPlayers).forEach(([playerId, playerData]) => {
        let player = players.get(playerId);
        if (!player) {
          player = new Player(playerId, playerData.x, playerData.z);
          players.set(playerId, player);
          scene.add(player.mesh);
        }
        player.addPosition(playerData.x, playerData.z, currentTime);

        // Update local player's stored position
        if (playerId === userId) {
          this.x = playerData.x;
          this.z = playerData.z;
        }
      });
    });

    let lastInputTime = 0;
    const inputDelay = 50;
    let keys = {};
    window.addEventListener("keydown", (e) => (keys[e.key] = true));
    window.addEventListener("keyup", (e) => (keys[e.key] = false));

    const updatePlayerInput = () => {
      const currentTime = Date.now();
      if (currentTime - lastInputTime > inputDelay) {
        const input = {
          up: keys["ArrowUp"] ? 1 : 0,
          down: keys["ArrowDown"] ? 1 : 0,
          left: keys["ArrowLeft"] ? 1 : 0,
          right: keys["ArrowRight"] ? 1 : 0,
        };

        this.pushEvent("player_input", { input: input });
        lastInputTime = currentTime;
      }
    };

    const animate = (time) => {
      requestAnimationFrame(animate);

      const renderTime = Date.now();

      // Interpolate all players
      players.forEach((player) => {
        // if (player.id !== userId) {
          // Don't interpolate the local player
          player.interpolate(renderTime);
        // }
      });

      // Update local player position immediately
    //   const localPlayer = players.get(userId);
    //   if (localPlayer) {
    //     // Use localPlayer.mesh.position instead of this.x and this.z
    //     localPlayer.mesh.position.y = 0.25; // Set y to 0.5 to raise player above ground

    //     Update camera position to follow player
    //     camera.position.set(
    //       localPlayer.mesh.position.x,
    //       5,
    //       localPlayer.mesh.position.z + 5
    //     );
    //     camera.lookAt(
    //       localPlayer.mesh.position.x,
    //       0,
    //       localPlayer.mesh.position.z
    //     );
    //   }

      updatePlayerInput();

      fireMaterial.uniforms.time.value = time * 0.001;

      const intensity = 1 + 0.2 * Math.sin(time * 0.01);
      fireLight.intensity = intensity;

      renderer.render(scene, camera);
    };
    animate();

    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  },
};
