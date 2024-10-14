import * as THREE from 'three';

export default {
    mounted() {
        const canvas = this.el.querySelector('#game-canvas');
        const roomId = this.el.dataset.roomId;
        const userId = this.el.dataset.userId;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);

        const fireGeometry = new THREE.ConeGeometry(0.5, 1, 8);
        const fireMaterial = new THREE.MeshBasicMaterial({ color: 0xff6600})
        const fire = new THREE.Mesh(fireGeometry, fireMaterial);
        scene.add(fire);

        const groundGeometry = new THREE.PlaneGeometry(10, 10);
        const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x33aa33, side: THREE.DoubleSide})
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = Math.PI / 2;
        scene.add(ground);

        camera.position.set(0, 5, 5);
        camera.lookAt(0, 0, 0);

        const players = new Map();

        const movePlayer = (playerId, x, z) => {
            let player = players.get(playerId);
            if(!player) {
                const playerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                const playerMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff});
                player = new THREE.Mesh(playerGeometry, playerMaterial);
                scene.add(player);
                players.set(playerId, player);
            }
            player.position.set(x, 0.25, z);
        };

        const animate = () => {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.handleEvent("game_update", ({ playerId, x, z }) => {
            movePlayer(playerId, x, z);
        });

        let keys = {};
        window.addEventListener('keydown', (e) => keys[e.key] = true);
        window.addEventListener('keyup', (e) => keys[e.key] = false);

        const updatePlayerPosition = () => {
            let x = 0, z = 0;
            if(keys['ArrowUp']) z -= 0.1;
            if(keys['ArrowDown']) z += 0.1;
            if(keys['ArrowLeft']) x -= 0.1;
            if(keys['ArrowRight']) x += 0.1;

            if(x !== 0 || z !== 0) {
                this.pushEvent("player_move", { x, z });
            }
        }

        setInterval(updatePlayerPosition, 1000 / 60);
    }
};