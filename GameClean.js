import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.min.js';
import { FBXLoader } from '../FBXFiles/FBXLoader.js';
import * as Anims from './animations.js';
const sceneContainer = document.getElementById('scene-container')


// Setup scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

//New Container Position
// document.body.appendChild(renderer.domElement);
const container = document.getElementById('scene-container');
container.appendChild(renderer.domElement);

const cameraOffset = new THREE.Vector3(0,4,3);
// Calculate camera facing direction in x-z plane
const cameraDirection = new THREE.Vector3();
let yaw = 0;
let pitch = 0;
const rotationSpeed = 0.02;
let isDraggingCamera = false;
const previousMousePosition = { x: 0, y: 0 };
let zoomAmount = 3;

const clickableObjects = [];
const obstacles = [];
const animations = {};
const npcs = [];

const loader = new FBXLoader();

const textureLoader = new THREE.TextureLoader();
const grassTexture = textureLoader.load('../myMaterialjpgs/myGrass1.jpg');
const skysphereTexture = textureLoader.load('../myMaterialjpgs/MySunImage.PNG');//'../myMaterialjpgs/cosmicskysphere2.PNG');

const basicGrassMaterial = new THREE.MeshBasicMaterial({map: grassTexture, side: THREE.DoubleSide});
const skysphereMaterial = new THREE.MeshBasicMaterial({map: skysphereTexture, side: THREE.DoubleSide});

export function createSkysphere() {
  const backgroundGeometry = new THREE.SphereGeometry(1200, 64, 64);
  const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.BackSide });
  const skysphere = new THREE.Mesh(backgroundGeometry, skysphereMaterial);
  scene.add(skysphere);
  skysphere.name = 'skysphere 1';
  return skysphere;
}

function createAmbient() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    ambientLight.castShadow = true;
    scene.add(ambientLight);
}

function createGround(posx, posy, posz, lenx, lenz,material) {
    const groundGeometry = new THREE.PlaneGeometry(lenx, lenz);
    const groundMaterial = new THREE.MeshBasicMaterial({color: 0xAAAAAA, side: THREE.DoubleSide});
    const ground = new THREE.Mesh(groundGeometry, material);
    ground.position.set(posx, posy, posz);
    ground.rotation.x = Math.PI / 2;
    scene.add(ground);
    obstacles.push(ground);
}
const wallMaterial = new THREE.MeshBasicMaterial({ color: 0x008080 });
const ceilingMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });

// Assuming you have imported Three.js and set up your scene and camera



const healthMaterial = new THREE.ShaderMaterial({
side: THREE.DoubleSide,
uniforms: {
healthRatio: { value: 1.0 }, // Start with full health (1.0 ratio)
resolution: { value: new THREE.Vector2(renderer.domElement.width, renderer.domElement.height) },
playerHealth: { value: 100.0 } // Initial player health value

},

});

// Create a plane geometry for the health bar
const healthBarGeometry = new THREE.PlaneGeometry(1, 0.1); // Adjust size as needed
// Create a mesh with the health material
// HTML element for health text
// const healthText = document.getElementById('healthText');

function updateHealthBars() {
        [player, ...npcs].forEach(being => {
            if(being.healthBar){
                const healthRatio = being.health / being.maxHealth;
                healthMaterial.uniforms.healthRatio.value = healthRatio;
                // Convert player group's position to screen coordinates
                const vector = new THREE.Vector3();
                being.group.getWorldPosition(vector);
                vector.project(camera);
                healthMaterial.uniforms.healthRatio.value = healthRatio;
                being.healthBar.scale.x = healthRatio
                // Position the health bar above the player's head
                being.healthBar.position.y = being.group.position.y + 3
                being.healthBar.lookAt(camera.position);
            }
        })
        healthText.innerText = `Health: ${player.health}/${player.maxHealth}`;
    }

// Function to update resolution uniform when canvas size changes
function updateResolution() {
    const canvas = renderer.domElement;
    healthMaterial.uniforms.resolution.value.set(canvas.width, canvas.height);
}

function createObstacle(posx,posy,posz,lenx,leny,lenz,material){
    const wall = new THREE.Mesh(new THREE.BoxGeometry(lenx,leny,lenz), material);
    // wall.position.set(0, 5, 50);
    wall.name = `wall ${obstacles.length}`
    wall.position.set(posx,posy,posz)
    scene.add(wall);
    obstacles.push(wall);
    clickableObjects.push(wall)
}


//Check Collision With Obstacles
function checkCollisions(position) {
    for (let obstacle of obstacles) {
        const obstacleBB = new THREE.Box3().setFromObject(obstacle);
        if (obstacleBB.containsPoint(position)) {
            return true;
        }
    }
    return false;
}

function getNearestObstacleBelow(position) {
    let nearestY = -Infinity;
    for (let obstacle of obstacles) {
        const obstacleBB = new THREE.Box3().setFromObject(obstacle);
        if (obstacleBB.max.x > position.x && obstacleBB.min.x < position.x &&
            obstacleBB.max.z > position.z && obstacleBB.min.z < position.z) {
            if (obstacleBB.max.y > nearestY && obstacleBB.max.y < position.y) {
                nearestY = obstacleBB.max.y;
            }
        }
    }
    return nearestY;
}
const jumpSpeed = 1;
const gravity = 0.1;
const fallSpeed = 0.2;
const speed = .1;
let isJumping = false;
let velocityY = 0;
const player = {
    group: new THREE.Group(),
    mesh: null,
    fbx: null,
    mixer: null,
    actions: {},
    currentAction: null,
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 100,
    stamina: 50,
    maxStamina:100,
    meleeRange: 5,
    longRange: null,
    AoE: null,
    alive: true,
    respawnPosition: [0,.1,0],
    canAttack: true,
    attacking: false,
    meleeDamage: 34,
};

function createCube() {
    const cubeGeometry = new THREE.BoxGeometry(2, 2, 2);
    const cubeMaterial = new THREE.MeshBasicMaterial({color: 0xFFF000, side: THREE.BackSide});
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.name = 'cube 1';
    return cube;
}


function setupAnimations(being,animationSet){
    // Load the idle animation
    loader.load(animationSet.idle, (fbx) => {
        being.mixer = new THREE.AnimationMixer(fbx);
        const idleAction = being.mixer.clipAction(fbx.animations[0]);
        idleAction.play();
        being.currentAction = idleAction;
        being.actions.idle = idleAction
        fbx.scale.set(0.01, 0.01, 0.01); // Adjust the scale as needed
        // fbx.rotation.y += 3.14159;
        being.fbx = fbx;
        being.group.add(being.fbx);
    });
    // Load the run animation
    loader.load(animationSet.run, (fbx) => {
        const runAction = being.mixer.clipAction(fbx.animations[0]);
        animations.run = runAction;
        being.actions.run = runAction;
    });
    loader.load(animationSet.death, (fbx) => {
        const deathAction = being.mixer.clipAction(fbx.animations[0]);
        animations.death = deathAction;
        deathAction.setLoop(THREE.LoopOnce);
        deathAction.clampWhenFinished = true
        being.actions.death = deathAction;
    })
    loader.load(animationSet.fightIdle, (fbx) => {
        const fightIdleAction = being.mixer.clipAction(fbx.animations[0]);
        animations.fightIdle = fightIdleAction;
        being.actions.fightIdle = fightIdleAction;
    })
    loader.load(animationSet.punch1, (fbx) => {
        const punch1Action = being.mixer.clipAction(fbx.animations[0]);
        animations.punch1 = punch1Action;
        being.actions.punch1 = punch1Action;
    })
}

function createPlayer() {
    // Attach the health bar mesh to the player's group position
    const healthRatio = player.health / player.maxHealth;
    healthMaterial.uniforms.healthRatio.value = healthRatio;
    player.healthBar = new THREE.Mesh(healthBarGeometry, healthMaterial);
    player.group.add(player.healthBar);    
    scene.add(player.group);
    player.group.position.set(0, 1, 0);
    setupAnimations(player,Anims.baseAnimations)
    updateStatsUI(player)
    playerControls(player)

}

function createNPC(posx,posy,posz){
    const npc = {
        group: new THREE.Group(),
        mesh: null,
        fbx: null,
        mixer: null,
        actions: {},
        currentAction: null, 
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        stamina: 100,
        maxStamina:100,
        name: null,
        type: 'friend',//'enemy',//'friend',
        isMoving: false,
        chasing: false,
        meleeCooldown: false,
        meleeRange: 6,
        alive: true,
        respawnPosition: [posx,posy,posz],
        spawn: null,
        chaseSpeed: .2,
        returning: false,
        attacking: false,
        meleeDamage: 1,
    }
    // npc.mesh = createCube();
    // npc.group.add(npc.mesh);
    const healthRatio = npc.health / npc.maxHealth;
    healthMaterial.uniforms.healthRatio.value = healthRatio;
    npc.healthBar = new THREE.Mesh(healthBarGeometry, healthMaterial);
    npc.group.add(npc.healthBar);    
    scene.add(npc.group);
    npc.group.position.set(posx,posy,posz);
    setupAnimations(npc, Anims.npcAnimations)
    npcs.push(npc)
    npc.name = `npc ${npcs.length}`
    npc.proximityIndicator = createProximityIndicator(npc)
    npc.iconSprite = createIconSprite(npc)
    npc.dialogueBox = createDialogueBox(npc)
}

function switchAnimation(being,newAction) {
    if (being.currentAction && being.currentAction !== newAction) {
        being.currentAction.fadeOut(0.1);
        newAction.reset().fadeIn(0.1).play();
        being.currentAction = newAction;
    }
}

function createProximityIndicator(being){
    const proximityMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide });
    const proximityGeometry = new THREE.RingGeometry(3.5, 4, 32); // Adjust inner and outer radius as needed
    const proximityIndicator = new THREE.Mesh(proximityGeometry, proximityMaterial);
    proximityIndicator.rotation.x = -Math.PI / 2;
    scene.add(proximityIndicator);
    proximityIndicator.visible = false; // Initially hidden
    return proximityIndicator;
}

function createIconSprite(being){
    // Interaction icon (example: a simple sprite)
    const iconTexture = new THREE.TextureLoader().load('../myMaterialjpgs/interact.png'); // Replace with your icon path
    const iconSpriteMaterial = new THREE.SpriteMaterial({ map: iconTexture });
    const iconSprite = new THREE.Sprite(iconSpriteMaterial);
    iconSprite.scale.set(2, 2, 2); // Adjust icon size as needed
    scene.add(iconSprite);
    iconSprite.visible = false; // Initially hidden
    return iconSprite;
}

function createDialogueBox(being){
    const dialogueBox = document.createElement('div');
    dialogueBox.style.position = 'absolute';
    dialogueBox.style.top = '100px';
    dialogueBox.style.left = '100px';
    dialogueBox.style.padding = '10px';
    dialogueBox.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    dialogueBox.style.border = '1px solid black';
    dialogueBox.style.display = 'none';
    container.appendChild(dialogueBox)
    // document.body.appendChild(dialogueBox);
    const dialogueText = document.createElement('div');
    if (being.type == 'friend'){
        dialogueText.textContent = `Hello, I am ${being.name}, and I am a ${being.type}.\nDo you want to duel?`;
    }else if (being.type == 'enemy') {
            dialogueText.textContent = `I am your ${being.type}!`;
        }
    
    dialogueBox.appendChild(dialogueText);
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
    dialogueBox.style.display = 'none';
    });
    dialogueBox.appendChild(closeButton);

    const duelButton = document.createElement('button');
    duelButton.textContent = 'Duel'
    duelButton.addEventListener('click', () =>{
        if (being.type == 'friend'){
        being.type = 'enemy';
        dialogueText.textContent = `I am your ${being.type}!`;
        }else if (being.type == 'enemy') {
            being.type = 'friend';
            dialogueText.textContent = `Hello, I am ${being.name}, and I am a ${being.type}.\nDo you want to duel?`;
        }
    })
    dialogueBox.appendChild(duelButton);

    return dialogueBox;
}

function isPlayerNearNPC(npc) {
    const distance = player.group.position.distanceTo(npc.group.position);
    return distance <= 5; // Adjust the proximity range as needed
}

function canNPCSeePlayer(npc){
    const distance = player.group.position.distanceTo(npc.group.position);
    return distance <= 20; // Adjust the proximity range as needed
}

function DamageNPCinMeleeRange() {
    const distance = player.group.position.distanceTo(npc.group.position);
    if (distance <= player.meleeRange){
        const meleeAttack = new THREE.BoxGeometry(1,1,1)
    }
}

function handleNPCInteraction(npc){
    const proximityRange = 5;
    // Adjust the proximity range as needed
    if (isPlayerNearNPC(npc)){
        if(npc.type =='friend'){
            npc.proximityIndicator.visible = true;
            npc.iconSprite.visible = true;
        }else if (npc.type = 'enemy'){
            npc.proximityIndicator.visible = false;
            npc.iconSprite.visible = false;
        }
        document.addEventListener('keydown', (event) => {
            if (event.key === 'e') {
                // console.log('e')
                if (npc.dialogueBox.style.display == 'block'){
                        npc.dialogueBox.style.display = 'none';
                    } else {npc.dialogueBox.style.display = 'block';
                }
            }
            });
        }
    else {
        if(!npc.chasing && npc.alive){
            switchAnimation(npc, npc.actions.idle);
        }
        npc.proximityIndicator.visible = false;
        npc.iconSprite.visible = false;
        npc.dialogueBox.style.display = 'none';
    }
        // npc.mixer.update(0.01)
        if(npc.type == 'friend'){
            // npc.healthbar.position.copy(npc.group.position).add(new THREE.Vector3(0, 2, 0));
            npc.iconSprite.position.copy(npc.group.position).add(new THREE.Vector3(0, 3.5, 0));
            npc.proximityIndicator.position.copy(npc.group.position).add(new THREE.Vector3(0, -0.49, 0));
        }
        else if(npc.type == ' enemy'){
            npcChasePlayer(npc)
        }
}

function rotateNPCsToFacePlayer() {
    npcs.forEach(npc => {
        let rotationAngle;
        // Calculate direction to the player
        const directionToPlayer = player.group.position.clone().sub(npc.group.position).normalize();
        // Calculate rotation angle based on the direction
        if(player.alive){
        rotationAngle = Math.atan2(directionToPlayer.x, directionToPlayer.z);
    }else if (npc.returning){
        const directionToSpawn = npc.spawn.position.clone().sub(npc.group.position).normalize();
        npc.spawn.position.set(npc.respawnPosition[0],npc.respawnPosition[1],npc.respawnPosition[2])
        rotationAngle = Math.atan2(directionToSpawn.x, directionToSpawn.z);
    } else if (!npc.returning && npc.spawn && npc.group.position == npc.spawn.position){
        npc.spawn = null;
    }
        // Apply rotation to make NPC face the player
        npc.group.rotation.y = rotationAngle;
        npc.group.rotation.y = rotationAngle;
        npc.group.directionToPlayer = directionToPlayer
    });
}

function npcChasePlayer(npc) {
    const directionToPlayer = player.group.position.clone().sub(npc.group.position).normalize();
    // npc.chasing = false;
    const chaseSpeed = 0.2;
    const distanceToPlayer = npc.group.position.distanceTo(player.group.position);
    const minimumDistance = 5;
    const radiusToStartChase = 30;
    const rangedAttackRange = 80;
    if (npc.canMove){
        if (distanceToPlayer <= radiusToStartChase && distanceToPlayer > minimumDistance && npc.alive ) {
            if (npc.chasing == false && npc.attacking == false){
                switchAnimation(npc, npc.actions.run);
                npc.chasing = true;
            }
            npc.mixer.update(0.01)
                const newPosition = npc.group.position.clone().add(directionToPlayer.multiplyScalar(npc.chaseSpeed));
                npc.group.position.copy(newPosition);
        } 
        else{            
            // console.log(npc.chasing)
            if(npc.alive){
            switchAnimation(npc, npc.actions.idle);}
            npc.chasing = false;
        }
    }
    if (npc.type = 'enemy'){
        if(!npc.attacking && distanceToPlayer<=npc.meleeRange && npc.alive && player.alive){
            npc.canMove = false;
            meleeAttack(npc, player)  
            setTimeout(() => {
                // npc.attacking = false;
                npc.canMove = true;

            }, 2000);
        }
    }

}

function npcAttack(npc){

}

function attackNPC(){
    const distance = player.group.position.distanceTo(npc.group.position);
    if (distance<=player.meleeRange){
        const meleeAttack = new THREE.BoxGeometry(1,1,1)

    }
}

function meleeAttack(attacker, target) {
    // const distance = attacker.group.position.distanceTo(target.group.position);
    // if (distance <= attacker.meleeRange) {
        // Create melee attack box
    if(attacker.attacking == false){
        attacker.attacking = true
        switchAnimation(attacker, attacker.actions.punch1)
        attacker.mixer.update(0.01)
        const meleeGeometry = new THREE.BoxGeometry(1, 2, 2);
        const meleeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const meleeAttack = new THREE.Mesh(meleeGeometry, meleeMaterial);

        // Position melee attack box in front of the attacker
        const direction = new THREE.Vector3();
        attacker.group.getWorldDirection(direction);
        meleeAttack.position.copy(attacker.group.position).add(direction.multiplyScalar(4)); // Adjust 1 to control distance from attacker
        // Add melee attack box to the scene
        scene.add(meleeAttack);
        meleeAttack.rotation.copy(attacker.group.rotation)//set(player.group.rotation.x,0,player.group.rotation.z)

        if(target){
        // Check for collision with target
            const targetBox = new THREE.Box3().setFromObject(target.group);
            const meleeBox = new THREE.Box3().setFromObject(meleeAttack);

            if (meleeBox.intersectsBox(targetBox)) {
                target.health = Math.max(0, target.health - attacker.meleeDamage); // Reduce target health by 10
                // updateAllStats(); // Update the UI
                updateStatsUI(player)
                console.log(target.health)
                updateHealthBars()
            }
        }
        // Remove melee attack box after 1 second
        setTimeout(() => {
            scene.remove(meleeAttack);
            attacker.attacking = false
        }, 1000);
        attacker.meleeCooldown = true
        if(target.health<=0){
            death(target)
        }
    }
    }

const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false
};

function updatePlayerMovement() {
    
    // else{player.alive = true}
    if(player.alive){
            const speed = 0.1;
            const direction = new THREE.Vector3()

            if (keys.w || keys.ArrowUp) direction.z -= 1;
            if (keys.s || keys.ArrowDown) direction.z += 1;
            if (keys.a || keys.ArrowLeft) direction.x -= 1;
            if (keys.d || keys.ArrowRight) direction.x += 1;
            // updateFBXs()
            if (direction.length() > 0) {
            direction.normalize();
            const angle = Math.atan2(cameraOffset.x, cameraOffset.z);
            const rotationMatrix = new THREE.Matrix4().makeRotationY(angle);
            direction.applyMatrix4(rotationMatrix);
            // Rotate player to face the direction of movement
            player.group.rotation.y = Math.atan2(direction.x, direction.z);
            switchAnimation(player, player.actions.run);
            const nextPosition = player.group.position.clone().add(direction.multiplyScalar(speed*3));
            if (!checkCollisions(nextPosition)) {
                player.group.position.copy(nextPosition);
            }
            } else {
                if(!player.attacking){
            switchAnimation(player, player.actions.idle);
            } else {switchAnimation(player,player.actions.punch1)
            }
        }

            // Handle jumping and gravity
            if (keys[' '] && !isJumping) {
                if(player.stamina>=10){
                    isJumping = true;
                    velocityY = jumpSpeed;
                    player.stamina-=10
                    updateStatsUI(player)
                }
            }
            if (isJumping) {
            player.group.position.y += velocityY;
            velocityY -= gravity;
            if (player.group.position.y <= 0.5) {
                player.group.position.y = 0.5;
                isJumping = false;
                velocityY = 0;
            }
            obstacles.forEach(obstacle => {
                const obstacleBB = new THREE.Box3().setFromObject(obstacle);
                if (obstacleBB.containsPoint(player.group.position)) {
                    player.group.position.y = obstacleBB.max.y + 0.5; // Adjust player height based on obstacle height
                    isJumping = false;
                    velocityY = 0;
                }
            });
            } else {
            // Handle falling when not jumping
            const nearestY = getNearestObstacleBelow(player.group.position);
            if (player.group.position.y > nearestY + 0.5) {
                player.group.position.y -= fallSpeed;
                if (player.group.position.y < nearestY + 0.5) {
                    player.group.position.y = nearestY + 0.5;
                }
            }
            // Check if player has fallen off the ground or below -50 in y-axis
            if (player.group.position.y < -20 || !getNearestObstacleBelow(player.group.position)) {
                player.group.position.set(0, 0.5, 0); // Reset player position to starting position
                isJumping = false;
                velocityY = 0;
            }
            }
}
}

function playerControls(player){
    document.addEventListener('keydown', (event) => {
        if (event.key === 'h') {
            if(player.health<player.maxHealth && player.mana>=10){
                player.health+=10
                player.mana-=10
                updateStatsUI(player)

            }else if(player.health>=player.maxHealth){
                player.health = player.maxHealth
                updateStatsUI(player)

            }
        }
        if (event.key === 'g') {
            if(player.health>0){
                player.health-=10
                updateStatsUI(player)
            }else if(player.health<=0){
                death(player)
                updateStatsUI(player)
            }
        }
        if (event.key === 'f') {
            // if (player.canAttack == true){
            //     player.canAttack = false
                meleeAttack(player,npcs[0])
                // setTimeout(() => {
                //     player.canAttack = true
                // }, 1500)
            // }
        }

    });
}

function updateCameraDirection() {
const x = Math.sin(yaw) * Math.cos(pitch);
const y = Math.sin(pitch);
const z = Math.cos(yaw) * Math.cos(pitch);
cameraOffset.set(x, y, z).multiplyScalar(zoomAmount);
}

function updateCamera() {
camera.position.copy(player.group.position).add(cameraOffset);
// Check for camera collisions
const raycaster = new THREE.Raycaster(player.group.position, cameraOffset.clone().normalize(), 0, cameraOffset.length());
const intersections = raycaster.intersectObjects(obstacles, true);
if (intersections.length > 0) {
const distance = intersections[0].distance;
camera.position.copy(player.group.position).add(cameraOffset.clone().normalize().multiplyScalar(distance * 0.9));
}
camera.lookAt(player.group.position.x,player.group.position.y+1,player.group.position.z,);
}

function resetCamera() {
yaw = 0;
pitch = 0;
updateCameraDirection();
cameraOffset.set(0, 2, 3);
}

function death(being){
    const respawnPosition = being.respawnPosition
    if(being.alive){
        switchAnimation(being, being.actions.death)
        console.log(being.fbx.scale)
        // setTimeout(() => {
        //     being.actions.death.pause()//stop()
        //     }, 2000);
    }
    being.chasing = false,
    // setTImeout()
    being.alive = false;

    setTimeout(() => {
        being.health = being.maxHealth
        being.alive = true;
        switchAnimation(being, being.actions.idle)
        being.fbx.scale.set(.01,.01,.01)

        being.group.position.set(being.respawnPosition[0],being.respawnPosition[1],being.respawnPosition[2])


        // createNPC(being.respawnPosition.x,being.respawnPosition.y,being.respawnPosition.z);
    }, 6000);

    
}
function updatePlayer(){
    if (player.mixer) {
        player.mixer.update(0.01);
    }
    updatePlayerMovement()
}
function updateNPCS(){
npcs.forEach(npc => {
    handleNPCInteraction(npc);
    rotateNPCsToFacePlayer()
        if(player.alive){
            if(npc.type =='enemy'){
            npcChasePlayer(npc)
        }
        }else{    
            npcRunToSpawn(npc)
        }
        if (npc.mixer){
            npc.mixer.update(0.01);
        }
        if(npc.healthBar){

        }
});    
}

function returning(npc){
    if(npc.returning){
        const distanceToPlayer = npc.group.position.distanceTo(player.group.position);
        if((!distanceToPlayer<5) && npc.group.position !==npc.spawn.position){
        const directionToSpawn = npc.spawn.position.clone().sub(npc.group.position).normalize();
        const newPosition = npc.group.position.clone().add(directionToSpawn.multiplyScalar(npc.chaseSpeed));
        npc.group.position.copy(newPosition);
        }
    }
    npc.mixer.update(0.01)

}

function npcRunToSpawn(npc){
    if(npc.spawn && npc.returning == true){
        if(npc.group.position==npc.spawn.position ){
            npc.returning = false
            scene.remove(npc.spawn)
            npc.spawn = null
            npc.group.position.set(npc.respawnPosition[0],npc.respawnPosition[1],npc.respawnPosition[2])
            switchAnimation(npc, npc.actions.idle)
        }
    }
    else if (npc.returning == false){
        npc.spawn = createCube()
        switchAnimation(npc, npc.actions.run);
        npc.returning = true;
    }
    returning(npc)
}

export function updateStatsUI(being) {
    const healthBar = document.getElementById(`health-bar`);
    const manaBar = document.getElementById(`mana-bar`);
    const staminaBar = document.getElementById('stamina-bar');

    // Update the widths based on the current and maximum values
    healthBar.style.width = `${(being.health / being.maxHealth) * 100}%`;
    manaBar.style.width = `${(being.mana / being.maxMana) * 100}%`;
    staminaBar.style.width = `${(being.stamina / being.maxStamina) * 100}%`;
}

function regenerateStats() {
    // Object.values(players).forEach(player => {
        if (player.mana < player.maxMana) {
            player.mana = Math.min(player.maxMana, player.mana + 1);
        }
        if (player.stamina < player.maxStamina) {
            player.stamina = Math.min(player.maxStamina, player.stamina + 2);
        }
        updateStatsUI(player);
    }

//BEGIN GAMNE CONTROLS
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

// Mouse button events
document.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
    isDraggingCamera = true; // Left mouse button
    } else if (event.button === 2) {
    isRightClickDown = true; // Right mouse button
    }
    previousMousePosition.x = event.clientX;
    previousMousePosition.y = event.clientY;
});

document.addEventListener('mouseup', (event) => {
    if (event.button === 0) {
    isDraggingCamera = false; // Left mouse button
    } else if (event.button === 2) {
    isRightClickDown = false; // Right mouse button
    }
});

document.addEventListener('mousemove', (event) => {
    let deltaX;
    let deltaY;
    if (isDraggingCamera) {
        if(previousMousePosition.x != 0){
        deltaX = event.clientX - previousMousePosition.x;
    }
    if(previousMousePosition.y != 0){
        deltaY = event.clientY - previousMousePosition.y;
    }
    yaw -= deltaX * rotationSpeed * 3;
    pitch += deltaY * rotationSpeed; // Invert the pitch calculation by changing the sign
    // Limit pitch to avoid flipping upside down
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    updateCameraDirection();
}

previousMousePosition.x = event.clientX;
previousMousePosition.y = event.clientY;
});

document.addEventListener('keydown', (event) => {
    keys[event.key.toLowerCase()] = true;
    // Reset camera on 'R' key press
    if (event.key.toLowerCase() === 'r') {
    resetCamera();
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
    if((!keys['w'] && !keys['a'] && !keys['s'] && !keys['d']) && player.moving){
    switchAnimation(player, 'idle')
    player.moving = false;
    }
});

// Function to handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
// Zooming in and out with mouse wheel
document.addEventListener('wheel', (event) => {
    if (event.deltaY > 0) {
        zoomAmount += 0.5; // Zoom out when scrolling down
    } else {
        zoomAmount -= 0.5; // Zoom in when scrolling up
    }
    updateCameraDirection()
});

function animate() {
    requestAnimationFrame(animate);

    updateCamera();
    updateNPCS()
    updatePlayer();
    updateHealthBars()

    renderer.render(scene, camera);
}

setInterval(regenerateStats, 1000);

function createMultipleGrounds(){
    createGround(0, -1, 0, 100, 100,basicGrassMaterial);
    createGround(50, -1, 50, 100, 100,basicGrassMaterial);
    createGround(-50, -1, -50, 100, 100,basicGrassMaterial);
    createGround(50, -1, -50, 100, 100,basicGrassMaterial);
    createGround(-50, -1, 50, 100, 100,basicGrassMaterial);
    // createGround(0, -1, 0, 100, 100,basicGrassMaterial);
    // createGround(0, -1, 0, 100, 100,basicGrassMaterial);
}

function createMultipleWalls(){
    createObstacle(0,0,-100, 200,10,2,wallMaterial)
    createObstacle(0,0,100, 200,10,2,wallMaterial)
    createObstacle(-100,0,0, 20,10,200,wallMaterial)
    createObstacle(100,0,0, 20,10,200,wallMaterial)

}

export function init() {
    createMultipleGrounds()
    createMultipleWalls()
    createSkysphere()
    createPlayer();
    createAmbient();
    createNPC(0,-.5,-31);
    animate();
}