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

    const players = new Map();

    const movePlayer = (playerId, x, z) => {
      let player = players.get(playerId);
      if (!player) {
        const playerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        player = new THREE.Mesh(playerGeometry, playerMaterial);
        player.castShadow = true;
        player.receiveShadow = true;
        scene.add(player);
        players.set(playerId, player);
      }
      player.position.set(x, 0.25, z);
    };

    const animate = (time) => {
      requestAnimationFrame(animate);

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

    this.handleEvent("game_update", ({ playerId, x, z }) => {
      movePlayer(playerId, x, z);
    });

    let keys = {};
    window.addEventListener("keydown", (e) => (keys[e.key] = true));
    window.addEventListener("keyup", (e) => (keys[e.key] = false));

    const updatePlayerPosition = () => {
      let x = 0,
        z = 0;
      if (keys["ArrowUp"]) z -= 0.1;
      if (keys["ArrowDown"]) z += 0.1;
      if (keys["ArrowLeft"]) x -= 0.1;
      if (keys["ArrowRight"]) x += 0.1;

      if (x !== 0 || z !== 0) {
        this.pushEvent("player_move", { x, z });
      }
    };

    setInterval(updatePlayerPosition, 1000 / 60);
  },
};
