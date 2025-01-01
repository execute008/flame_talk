import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { fireFragmentShader, fireVertexShader } from "../data/shaders";
import Player from "../game/Player";

export default {
  mounted() {
    const canvas = this.el.querySelector("#game-canvas");
    const roomId = this.el.dataset.roomId;
    const userId = this.el.dataset.userId;

    console.log("userId", userId);

    let composer;
    const bloomParams = {
      exposure: 1,
      bloomStrength: 1.5,
      bloomThreshold: 0,
      bloomRadius: 0,
    };

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

    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      bloomParams.bloomStrength,
      bloomParams.bloomRadius,
      bloomParams.bloomThreshold
    );

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.renderToScreen = true

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

    const fireLight = new THREE.PointLight(0xff2200, 1, 100, 2);
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

    

    const players = new Map();

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

        if (playerId === userId) {
          // For local player, lerp towards the server position
          const lerpFactor = 0.3;
          player.mesh.position.x +=
            (playerData.x - player.mesh.position.x) * lerpFactor;
          player.mesh.position.z +=
            (playerData.z - player.mesh.position.z) * lerpFactor;
        } else {
          player.addPosition(playerData.x, playerData.z, currentTime);
        }
      });
    });

    const inputDelay = 50;
    const jumpPower = 10;

    let lastInputTime = 0;
    let lastShift = 0;
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

        const speed =
          keys["Shift"] && lastShift < currentTime - 1000 ? 0.2 : 0.1;
        lastShift = keys["Shift"] ? currentTime : lastShift;

        const localPlayer = players.get(userId);
        if (localPlayer) {
          localPlayer.velocity.set(
            (input.right - input.left) * speed,
            0,
            (input.down - input.up) * speed
          );
        }

        this.pushEvent("player_input", { input: input });
        lastInputTime = currentTime;
      }
    };

    let lastTime = 0;
    const animate = (time) => {
      requestAnimationFrame(animate);

      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      const renderTime = Date.now();

      // Update local player position immediately
      const localPlayer = players.get(userId);
      if (localPlayer) {
        localPlayer.updatePosition(deltaTime);

        // Update camera position to follow player
        // camera.position.set(
        //   localPlayer.mesh.position.x,
        //   5,
        //   localPlayer.mesh.position.z + 5
        // );
        // camera.lookAt(
        //   localPlayer.mesh.position.x,
        //   0,
        //   localPlayer.mesh.position.z
        // );
      }

      // Interpolate other players
      players.forEach((player) => {
        if (player.id !== userId) {
          player.interpolate(renderTime);
        }
      });

      updatePlayerInput();

      fireMaterial.uniforms.time.value = time * 0.001;

      const intensity = 20 + 0.5 * Math.sin(time * 0.01);
      fireLight.intensity = intensity;

      composer.render();
    };
    animate();

    window.addEventListener("resize", () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    });
  },
};
