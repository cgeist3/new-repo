
// Scene, camera, and renderer setup
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
let ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

let directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// FBX Loader
const fbxLoader = new FBXLoader();
let mixer;
let activeAction;
let currentModel;
let animations = {};

// Load FBX from a folder
const fbxFolder = './fbx/';
const fbxFiles = ["Dwarf Idle.fbx"];

// Function to preload all FBX models and animations
function preloadFBXModels() {
    fbxFiles.forEach((filename) => {
        fbxLoader.load(fbxFolder + filename, function (object) {
            object.scale.set(0.03, 0.03, 0.03); // Set scale to 0.05
            scene.add(object);
            object.visible = false; // Hide model initially

            const newMixer = new THREE.AnimationMixer(object);
            const clip = object.animations[0];
            if (clip) {
                const action = newMixer.clipAction(clip);
                action.loop = THREE.LoopRepeat; // Ensure the animation loops indefinitely

                animations[filename] = { object, action, newMixer };
            }
        });
    });
}

let fadeDuration = 0.5; // Duration for fading in/out

function fadeToAction(name, duration) {
    const newAction = animations[name]?.action; // Get the action from the animations object
    console.log(`Fading to action: ${name}`);
    if (newAction && activeAction !== newAction) {
        if (activeAction) {
            activeAction.fadeOut(duration); // Fade out current action
        }

        // Fade in new action and play it
        newAction.reset().fadeIn(duration).play(); 
        activeAction = newAction; // Update the active action
    }
}

// Function to switch between animations with fade in/out
function switchAnimation(filename) {
    const { object } = animations[filename];

    // Fade to the new action
    fadeToAction(filename, fadeDuration);

    // If the model has changed, update visibility
    if (currentModel !== object) {
        if (currentModel) currentModel.visible = false; // Hide the previous model
        object.visible = true; // Show the new model
        currentModel = object; // Update current model
    }
}

// UI: Creating dynamic buttons for each animation
const uiContainer = document.createElement('div');
uiContainer.id = 'ui-container';
document.body.appendChild(uiContainer);
const cameraPositionButton1 = document.createElement('button');
cameraPositionButton1.textContent = 'Swap Camera';
cameraPositionButton1.addEventListener('click', () => {
    console.log(camera.position)
    console.log("camera look at : ",camera)
    if (camera.position.z == 10) {
        camera.position.set(0,4,-10)
        camera.rotation.set(-3.1415926535,0,-3.1415926535)
        }
    else{
        camera.position.set(0,3,10)
        camera.rotation.set(0,0,0)

    }
    // camera.lookAt(0,3,0)

})
uiContainer.appendChild(cameraPositionButton1);

fbxFiles.forEach((filename) => {
    const button = document.createElement('button');
    button.textContent = filename;
    button.addEventListener('click', () => {
        switchAnimation(filename);
    });
    uiContainer.appendChild(button);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update the current mixer for animation
    if (activeAction && activeAction.getMixer()) {
        activeAction.getMixer().update(0.01); // Update the active action's mixer
    }

    renderer.render(scene, camera);
}

animate();

// Preload all models and animations
preloadFBXModels();

// Responsive handling for window resize
window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

camera.position.set(0, 3, 10);
camera.lookAt(0,3,0)
