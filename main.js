//==============================================================================================
/* CGD260S COMPUTER GRAPHICS 2 
================================================================================================
CREATED BY: Peter Ngesi
STUDENT NUMBER: 250281228
DATE CREATED: 02/02/2026
MOST RECENT UPDATE: 19/04/2026
(Exit dot removed from minimap. The player does not deserve to know where it is.)
PROGRAMMED IN: Visual Studio Code
TARGET:         Google Chrome
=================================================================================================
DESCRIPTION:
    A survival horror first-person shooter game where the 
    player explores a maze and avoids creatures called Seekers,
    which robotically patrol the maze between waypoints, 
    searching for the player. To survive, the player must 
    avoid the Seekers and find the exit of the maze, using 
    tools provided to them. Some of which they are not 
    immediately given and will have to look for.

PRIMARY INSPIRATIONS:
    Maze Runner(2011)
    The Backrooms(Online analog horror series found on YouTube)
    Resident Evil 2(2019)(Horror survival FPS video game)
    Doom 3(Another horror survival FPS video game)
==================================================================================================
GAME FILES(code):
1.  index.html => where the .js and .css code is loaded onto the browser
2.  main.js => logic for game loop, soundtrack, minimap, etc 
3.  maze_generation.js => stores the Kruskal Maze Generation algorithm
4.  maze_setup.js => generates the physical maze using layout and generates the buffer
5.  rectangular.js => stores a versatile class and function to create cubes and rectangular prisms.
6.  triangular.js => stores a versatile function to create triangular prisms
7.  gun.js => stores a class and functions that have the gun's shape, movements and logic for firing
8.  matrices.js => stores the prespective, view, translation and other matrices
9. entity.js => stores class and functions that gives attributes to Seekers
10. collisions.js => stores functions that create collisions against the walls
11. bullets.js => stores class and attributes for bullet objects and how it moves when fired
12. BFS_algorithm.js => stores the function for the BFS pathfinding algorithm for the Seekers
13. ammo.js => stores class for ammo pack objects and as well as how to draw them and how they work
14. conditions.css => stores code for layout of the win and selection screens
15. game-over.css => stores code for the game over screen after death by Seeker
16. stamina.css => stores code for the stamina bar layout
17. gun-interface.css => stores code for the ammo counter for the gun
18. user-interface.css => stores code for the menu
19. minimap.js => stores webgl context for the minimap, in the form of a function and a constant

ASSETS(used, none are original are free taken from online repositories):
1.  wallpaper.color.png
2.  dova_Eternal_Terror_master.mp3
3.  Socapex - Dark ambience.mp3
4.  31904__yewbic__ambience01.wav
5.  33703__yewbic__ambience02.wav
6.  33796__yewbic__ambience03.wav
7.  Strike_003a.wav
8.  heart_beat.wav
9.  grenade_launcher.mp3
10. bloodshot-eye.jpg
    */
//====================================================================================================
import { Gun } from './gun.js'
import { Rectangular } from './rectangular.js'
import { AmmoPack } from './ammo.js';
import { Enemy } from './entity.js';
import { MazeMaker } from './maze_generation.js';
import { checkAABBCollision, getBounds } from './collisions.js';
import { findNextStep } from './BFS_algorithm.js';
import { perspective, viewMatrix, translateMatrix } from './matrices.js';
import { generateMaze, generateMazeBatch} from './maze_setup.js';
import { Bullet } from './bullets.js';
import { drawMinimap } from './minimap.js';

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext(`webgl`);
if (!gl) alert("WebGL not supported");

//=====================================
//Audio Setup for Soundtrack
//=====================================
const soundtrack = [
    new Audio('assets/dova_Eternal Terror_master.mp3'),
    new Audio('assets/Socapex - Dark ambiance.mp3'),
    new Audio('assets/31904__yewbic__ambience01.wav'),
    new Audio('assets/33703__yewbic__ambience02.wav'),
    new Audio('assets/33796__yewbic__ambience03.wav')
];
const jumpscareSound = new Audio('assets/Strike_003a.wav');
let ambienceIndex = 0;
let ambiencePlaying = false;
let jumpscareReady = true;
const JUMPSCARE_RANGE = 3.5;

function startsoundtrack() {
    if(isPaused || isGameOver) return;
    soundtrack[ambienceIndex].currentTime = 0;
    soundtrack[ambienceIndex].play();
    ambiencePlaying = true;
}

function stopsoundtrack() {
    soundtrack[ambienceIndex].pause();
    soundtrack[ambienceIndex].currentTime = 0;
    ambiencePlaying = false;
}

// Wire up auto-advance once, at the top level
soundtrack.forEach((track, i) => {
    track.onended = () => {
        if(!ambiencePlaying) return;
        ambienceIndex = (ambienceIndex + 1) % soundtrack.length;
        startsoundtrack();
    };
});

//========================================================================
//Resize canvas(this is done so that the canvas is the side of the window)
//========================================================================
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener("resize", resize);
resize();

gl.enable(gl.DEPTH_TEST);
gl.clearColor(1, 1, 0.6, 1.0); 

let isPaused = false;
//=================
//Menu Settings
//=================
document.getElementById('volume-slider').addEventListener('input', (e) => {
    const v = e.target.value;
    soundtrack.forEach(t => t.volume = v);
    jumpscareSound.volume = v;
    heartbeat.volume = v;  // heartbeat is already a plain Audio object
});
let lastMouseX = null;
let lastMouseY = null;
function toggleMenu(){
    isPaused = !isPaused;
    const menu = document.getElementById('ui-overlay');
canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
canvas.requestPointerLock();

    if(isPaused){
        menu.style.display = 'flex';
        stopsoundtrack();
        heartbeat.pause();
        lastMouseX = null;
        lastMouseY = null;
    }
    else{
        menu.style.display = 'none';
        heartbeat.play();
    }
}

window.addEventListener('keydown', (e) => {if(e.key.toLowerCase() === 'm') toggleMenu();});

//==================
//Crosshairs
//==================
const crosshairEl = document.getElementById('crosshair');
const ammoDisplayEl = document.getElementById('ammo-display');
const ammoCountEl = document.getElementById('ammo-count');

//==================
//Stamina Bar
//==================
const staminaBarEl = document.getElementById('stamina-bar');

//==============================
//Elements for win-lose condition
//==============================
const startScreen = document.getElementById('start-screen');
const winScreen = document.getElementById('win-screen');
const killCountGameOverEl = document.getElementById('kill-count-gameover');
const killCountWinEl = document.getElementById('kill-count-win');
const deathCountEl = document.getElementById('death-count');

let gameStarted = false;

// ============================================================
// Shaders
// =============================================================
const vertexSrc = `
attribute vec3 position;
attribute vec2 texCoord; // New attribute for UVs
uniform mat4 projection;
uniform mat4 view;
uniform mat4 model;
varying vec3 vPos;
varying vec2 vTexCoord; // Pass to fragment shader
void main() {
    vPos = position;
    vTexCoord = texCoord;
    gl_Position = projection * view * model * vec4(position, 1.0);
}
`;

const fragmentSrc = `
precision mediump float;
varying vec2 vTexCoord;
varying vec3 vPos;
uniform sampler2D uTexture;
uniform float uAmbient;   // controlled from JS per draw call

void main() {
    vec4 texColor = texture2D(uTexture, vTexCoord);
    float heightFactor = clamp(vPos.y * 0.2, 0.5, 1.0);
    gl_FragColor = vec4(texColor.rgb * heightFactor * uAmbient, texColor.a);
}
`;
//function to compile retrive shadersource and compile shaders
function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
        console.error("Shader Error:", gl.getShaderInfoLog(s));
        //error checker for shaders
    }
    return s;
}
//===========================
//function to load textures
//===========================
function loadTexture(gl, url){
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    const image = new Image();
   
image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    const isPow2 = v => (v & (v - 1)) === 0;
    if(isPow2(image.width) && isPow2(image.height)){
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
};
    image.src = url;
    return texture;
}
//========================================================================================
//function to create solid textures for the guns, the bullets, the ground and the ammopack
//========================================================================================
function createSolidTexture(gl, r, g, b, a) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const pixel = new Uint8Array([r, g, b, a]); // e.g., [0, 255, 0, 255] for green
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    return tex;
}

// Because the environment, down to the ammopacks and the seekers inherit the texture of the wall, I need to make sure everything without a texture currently,
// has a placeholder texture, that is just one color 
const bulletTex = createSolidTexture(gl, 0, 255, 0, 255);
const groundTex = createSolidTexture(gl, 255, 255, 153, 255);
const ammopackTex = createSolidTexture(gl, 255, 204, 0, 255);
const gunTex = createSolidTexture(gl, 255, 0, 0, 255);


//Loading textures for the walls to make them look like the backrooms
const wallTex = loadTexture(gl, 'assets/wallpaper_color.png');
//Loading textures for the surface of the seekers
const seekerTex = loadTexture(gl, 'assets/bloodshot-eye.jpg');

const program = gl.createProgram();
gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSrc));
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSrc));
gl.linkProgram(program);
if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
    console.error("Program Link Error:", gl.getProgramInfoLog(program));
    //error checker for linking program
}
gl.useProgram(program);

//Uniforms
const projectionMatrixLoc = gl.getUniformLocation(program, "projection");
const viewMatrixLoc = gl.getUniformLocation(program, "view");
const modelMatrixLoc = gl.getUniformLocation(program, "model");
const posLoc = gl.getAttribLocation(program, "position");
const colorLoc = gl.getUniformLocation(program, "uColor");
const TexCoordLoc = gl.getAttribLocation(program, "texCoord");
const ambientLoc = gl.getUniformLocation(program, "uAmbient");
const texLoc = gl.getUniformLocation(program, "uTexture");

// 4 UV corners per face, 6 faces = 24 UV pairs per cuboid
function getWallUVs(){
    const faceUVs = [
        0,0,  1,0,  1,1,  0,1
    ];
    let allUVs = [];
    for(let i=0; i < 6; i++){
        allUVs = allUVs.concat(faceUVs);
    }
    return new Float32Array(allUVs);
}

// =====================
// Shared Index Buffer
// (one cuboid = 36 indices. reused for seekers, gun, bullets, ammopacks)
// =====================
const sharedCube = new Rectangular();
const sharedIndexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sharedIndexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sharedCube.getIndices(), gl.STATIC_DRAW);

//=====================
// Shared UV Buffer
// (24 UV pairs — 4 corners × 6 faces — reused for gun, bullets, ammopacks)
//=====================
const uvBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.bufferData(gl.ARRAY_BUFFER, getWallUVs(), gl.STATIC_DRAW);

// Ground UV buffer — 6 vertices, simple 0-to-1 mapping
const groundUVData = new Float32Array([
    0,0,  1,0,  0,1,
    1,0,  1,1,  0,1
]);
const groundUVBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, groundUVBuffer);
gl.bufferData(gl.ARRAY_BUFFER, groundUVData, gl.STATIC_DRAW);

// Seeker UV buffer — 24 UV pairs (4 corners × 6 faces)
const rectUVBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, rectUVBuffer);
gl.bufferData(gl.ARRAY_BUFFER, getWallUVs(), gl.STATIC_DRAW);
//==================
//Create Ground
//==================
const SIZE = 2000;//to prevent clipping beneath ground, the size is increased drastically
const groundVerts = new Float32Array([
    -SIZE, 0, -SIZE, 
    SIZE, 0, -SIZE, 
    -SIZE, 0, SIZE,
    SIZE, 0, -SIZE, 
    SIZE, 0, SIZE, 
    -SIZE, 0, SIZE
]);
const groundBuffer = gl.createBuffer();//buffer for ground
gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
gl.bufferData(gl.ARRAY_BUFFER, groundVerts, gl.STATIC_DRAW);

// =============================
// Maze Generation
// =============================
let worldCubes = [];
let staticMazeBuffer = null;
let staticMazeUVBuffer = null;
let staticMazeIndexBuffer = null;
let staticMazeIndexCount = 0;
//===========================
//Waypoints for entity patrol
//===========================
const layout = MazeMaker.blueprint;
//inbetween waypoints will be the places that the Seekers patrol.
let waypoints = [];

//============================
// Win Condition Setup
//============================
/*Coordinates for the exit of the maze are randomized, but dummy coordinates are given */
let EXIT_X = 0;
let EXIT_Z = 0;
const EXIT_RADIUS = 1.5;

/*Trackers for killcount and death count are set */
let killCount = 0;
let deathCount = 0;
function updateKillDisplay(){
    killCountGameOverEl.textContent = killCount;
    killCountWinEl.textContent = killCount;
}
//this function displays the win screen when the player, by some miracle reaches the end of the maze
function showWinScreen(){
    isGameOver = true;
    updateKillDisplay();
    deathCountEl.textContent = deathCount;
    winScreen.classList.remove('hidden');
    document.exitPointerLock();
}

// ===========================================================
// Camera & Physics
// (this is where settings for the player and entity are made)
/* (because of the multiplier in the maze_setup.js file multiplies
 x positions and z positions by the wall size, the true coordinates
 of objects and the player are multiplied by two)*/
// ===========================================================
const PLAYER_HEIGHT = 1.2;
const PLAYER_WIDTH = 0.5;
const WALK_SPEED = 3;       //player walking speed.
const RUN_SPEED = 6;        //player running speed
const MAX_STAMINA = 100;    //Maximum Stamina
const STAM_DRAIN = 20;      //Stamina drain per second
const STAM_REGEN = 15;      //Stamina regen when not running
const px = 2;               //starting position of player on x-axis
const pz = 2;               //starting position of player on z-axis
const PATROL = 0;           //Patrol boolean
const HUNT = 1;             //Hunt boolean
const DETECT_RANGE = 10.0;  //Distance that the Seekers can detect the player's heartbeat
const FORGET_RANGE = 15.0;  //Distance that the Seekers lose the player's heartbeat.
const X2 = MazeMaker.WALL_SIZE 
/* This is a multiplier. The grid for the maze isn't the same as world coordinates due to the size
of the rectagular prisms used to make it. The wall size is 2, hence everything.
Meaning every coordinate for every item is multiplied by 2. */

// Start player at index [1,3] which is a 0 (walkable)
let camera = { x: px * X2, y: PLAYER_HEIGHT, z: pz * X2, yaw: 0, pitch: 0};
let isSprinting = false;
let stamina = MAX_STAMINA;
let stamDepleted = false; //prevented from spinning until stamina is full

//========================
//Weapons and Objects
//========================
const gunOffset = { x: 0.4, y: -0.6, z: 0.4};
let worldObjects = [];//array for world objects
let packPositions = [];//array for pack positions

//Alkaline Gun => A weapon that fires an alkaline bullet. Hit a Seeker enough times and they die.
let gun = new Gun(0, 0, 0, [0.5, 0, 0]);
gun.initBuffer(gl);

function updateGunUI() {
    if (gun.pickedUp) {
        crosshairEl.classList.remove('hidden');
        ammoDisplayEl.classList.remove('hidden');
        ammoCountEl.textContent = gun.ammo;
    } else {
        crosshairEl.classList.add('hidden');
        ammoDisplayEl.classList.add('hidden');
    }
}

const bullets = [];//array for bullets

/*This function is made to solve the issue of a randomized spawn point.
Before this function, the gun spawn was random. It could spawn far away or close. 
If it was too far, the player was as good as dead and had to rely on running only. */
function placeGunNearPlayer() {
    const spaces = MazeMaker.openSpaces;

    // Need at least 2 open spaces (index 0 is player spawn)
    if (!spaces || spaces.length < 2) {
        console.warn("Not enough open spaces to place gun.");
        return;
    }

    // Pick a random open space that isn't the player's starting tile
    // Bias toward early indices so it's still "nearby" but not on top of player
    const maxSearch = Math.min(spaces.length - 1, 10); // look within first 10 open tiles
    const idx = 1 + Math.floor(Math.random() * maxSearch);
    const spot = spaces[idx];

    const worldX = spot.c * MazeMaker.WALL_SIZE;
    const worldZ = spot.r * MazeMaker.WALL_SIZE;

    gun.updatePosition(worldX, 0.4, worldZ);
    gun.pickedUp = false;
    gun.isLoaded = false;
    gun.bounds = getBounds({ x: worldX, y: 0.4, z: worldZ }, 1);
}
//================================
// Grenade Launcher Sounder Effect
///*This sound effect is made because
// The alkaline gun is a projectile 
// launcher. */
//================================
const fire_shot = new Audio('assets/grenade_launcher.mp3');
//=============================================
//Spawning the Seekers using the Enemy class.
/* Due to the WALL_SIZE being multiplied with 
the x and z coordinates of the maze walls, 
everything in the maze must have its coordinates
multiplied by 2, this results in the spawnX and 
spawnZ values being double the values in the 
new Enemy objects*/
//=============================================
let SELECTED_MAZE_SIZE = 41; //default:medium
let SELECTED_SEEKERS = 1; //default: 1 seeker
const seekers = [];

//==========================================
/* Number of AmmoPacks constant */
//===========================================
/*Reduce ammo pack from 36 to 20 because Seekers
die from less bullets and there is a waiting period
before firing the next shot. */
const pack_num = 20

/*This function creates a randomized blueprint of the maze, 
then the buffer for the maze prisms and textures. one
buffer for each. It places the ammo boxes at 36 random positions, it makes an
exit, it gives random coordinates for the waypoints, it places the gun
at a random position and randomizes the spawn points of the Seekers. */
function initializeNewLevel() {
    MazeMaker.generateKruskalMaze(SELECTED_MAZE_SIZE, SELECTED_MAZE_SIZE);
    
    const mazeData = generateMazeBatch(gl);
    staticMazeBuffer = mazeData.buffer;
    staticMazeUVBuffer = mazeData.uvBuffer;
    staticMazeIndexBuffer = mazeData.indexBuffer;
    staticMazeIndexCount = mazeData.indexCount;
    worldCubes = mazeData.collisionWalls;
    
    EXIT_X = MazeMaker.exitPoint.c * MazeMaker.WALL_SIZE;
    EXIT_Z = MazeMaker.exitPoint.r * MazeMaker.WALL_SIZE;
    
    console.log(`Exit World: X: ${EXIT_X}, Z: ${EXIT_Z}`);
    // 1. Ask for enough random open spaces for ALL entities
    const totalEntities = pack_num + 9 + seekers.length; // Ammo + Waypoints + Seekers
    const safeSpots = MazeMaker.getRandomSpaces(totalEntities); 
    
    // 2. Slice the array to distribute the safe spots safely without overlaps
    packPositions = safeSpots.slice(0, pack_num);
    waypoints = safeSpots.slice(pack_num, pack_num + 9);
    const seekerSpawns = safeSpots.slice(pack_num + 9, totalEntities);

    console.log(`Seekers in the maze: ${seekers.length}`);
    //console.log(packPositions);
    //console.log(waypoints);
    
    // 3. Setup Ammo Packs (Same as before)
    worldObjects.length = 0; 
    packPositions.forEach(p => {
        const pack = new AmmoPack(p.c * MazeMaker.WALL_SIZE, 0.1, p.r * MazeMaker.WALL_SIZE);
        pack.name = "Ammo Pack";
        worldObjects.push(pack);
        pack.initBuffer(gl);
    });

    // 4. Inject the dynamic coordinates into the pre-existing Seeker objects
    seekers.forEach((seeker, i) => {
        const worldX = seekerSpawns[i].c * MazeMaker.WALL_SIZE;
        const worldZ = seekerSpawns[i].r * MazeMaker.WALL_SIZE;
        
        // Update their logical spawn point
        seeker.spawnX = worldX;
        seeker.spawnZ = worldZ;
        
        // Physically move the Enemy instance
        seeker.npc.x = worldX;
        seeker.npc.z = worldZ;
        
        // Ensure they are alive and active for the new level
        seeker.npc.active = true; 
        seeker.npc.health = 10;
    });

    // 5. Move player to the very first available open space (usually top-left)
    const playerStart = MazeMaker.openSpaces[0];
    camera.x = playerStart.c * MazeMaker.WALL_SIZE;
    camera.z = playerStart.r * MazeMaker.WALL_SIZE;

   placeGunNearPlayer();
   
}
//=========================
//Size of Seekers
//=========================
const rect = new Rectangular();
const rectVertices = rect.createRect(1, 1, 1); // Makes seekers smaller

const rectBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, rectBuffer);
gl.bufferData(gl.ARRAY_BUFFER, rectVertices, gl.STATIC_DRAW);

// Seeker index buffer — same 36-index pattern, base vertices 0–23
const rectIndexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rectIndexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, rect.getIndices(), gl.STATIC_DRAW);

//==================
// Input Handling
//==================

const keys = {};
document.addEventListener("keydown", e => { keys[e.key.toLowerCase()] = true;});
document.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
canvas.addEventListener("click", () => canvas.requestPointerLock());
document.addEventListener("mousemove", e => {
    //if the game stops, everything stops
    if(isPaused) return;
    //pointer lock check
    if(document.pointerLockElement !== canvas) return;
    //creates the effect of movement with the mouse
    if (document.pointerLockElement !== canvas) return;
    camera.yaw -= e.movementX * 0.002;
   camera.pitch = Math.max(-1.5, Math.min(1.5, camera.pitch - e.movementY * 0.005));
});
//Gun response to  eventlistener
var isCoolingDown = false;
const COOLDOWN_TIME = 1200; //1.2 seconds
canvas.addEventListener('mousedown', (e) => {
    if(e.button === 0 && gun.pickedUp && gun.isLoaded){
        if(isCoolingDown) return;
        const shot = gun.fire(camera);
        if(shot){
            const b = new Bullet(shot.spawnX, shot.spawnY, shot.spawnZ, shot.vx, shot.vy, shot.vz);
            if(b){
            b.initBuffer(gl);
            bullets.push(b);
             fire_shot.play();
             //After a shot is fired, the weapon cannot be fired for 1.2 seconds
             //Rapid firing won't fire the weapon either. You have to pause between shots to fire.
             isCoolingDown = true;
             setTimeout(() => {isCoolingDown= false;}, COOLDOWN_TIME);
            }
        }
    }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

//===============================
//Game Over Conditions and Logic
//================================
function resetPositions(){
    // Player returns to the start of the current maze
    const playerStart = MazeMaker.openSpaces[0];
    camera.x = playerStart.c * MazeMaker.WALL_SIZE;
    camera.z = playerStart.r * MazeMaker.WALL_SIZE;

    gun.ammo = 0;

    // Seekers return to their dynamically assigned spawn points
    seekers.forEach(seeker => {
        seeker.npc.x = seeker.spawnX;
        seeker.npc.z = seeker.spawnZ;
        seeker.npc.active = true;
        seeker.npc.health = 10; // reset health
    });
    // Reset all world objects
   worldObjects.forEach((obj) => {
        obj.collected = false;
        obj.rotationY = 0;
    });
stamina = MAX_STAMINA;
    stamDepleted = false;
    stopsoundtrack();
    ambienceIndex = 0;
    jumpscareReady = true;
//the alert() function does not recognize removed keys after death
//hence the following was included to ensure that all key inputs are false
//when respawning so that the player does not move unprompt
    for(let key in keys){
        keys[key] = false;
    }
}

const gameOverScreen = document.getElementById('game-over-screen');
let isGameOver = false;
//In order to prevent frequent game crashes, the buffer for the maze and the textures is deleted.
//I have tested it to ensure that it works, however, there is always a risk of crashing
//unless your GPU is leagues better than mine.
function cleanMaze(){
    if (staticMazeBuffer) { gl.deleteBuffer(staticMazeBuffer); staticMazeBuffer = null;}
    if (staticMazeUVBuffer) { gl.deleteBuffer(staticMazeUVBuffer); staticMazeUVBuffer = null;}

}

function showGameOver() {
    deathCount++;
    isGameOver = true;
    gameOverScreen.classList.remove('hidden');  // Make it exist in the DOM
    // Small delay lets the browser register the transition start point
    requestAnimationFrame(() => {
        gameOverScreen.classList.add('active'); // Triggers the CSS fade-in
    });
    // Release pointer lock so the cursor reappears for the restart button
    document.exitPointerLock();
}
//Restart button on win-screen. Goes back to start screen
document.getElementById('restart-btn').addEventListener('click', () =>{
    winScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    const menu = document.getElementById('ui-overlay');
    menu.style.display = 'none';
    startScreen.style.display = 'flex';
    // Full reset
    killCount = 0;
    deathCount = 0;
    gameStarted = false;
    isGameOver = false;
    cleanMaze();
    //initializeNewLevel();
    resetPositions();
    //visitedCells.clear();
    stopsoundtrack();
});
//Return to start screen from win screen
document.getElementById('restart-btn2').addEventListener('click', () =>{
    winScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    const menu = document.getElementById('ui-overlay');
    menu.style.display = 'none';
    startScreen.style.display = 'flex';
    // Full reset
    killCount = 0;
    deathCount = 0;
    gameStarted = false;
    isGameOver = false;
    cleanMaze();
    //initializeNewLevel();
    resetPositions();
    //visitedCells.clear();
    stopsoundtrack();
});


document.getElementById('respawn-btn').addEventListener('click', () => {
    isGameOver = false;
    gameOverScreen.classList.remove('active');
    gameOverScreen.classList.add('hidden');
    resetPositions();
    // Recapture pointer lock for gameplay
    canvas.requestPointerLock();
});

//==============================
// HeartBeat Audio
//==============================
const heartbeat = new Audio('assets/heart_beat.wav');
heartbeat.loop = true;
heartbeat.volume = 0;
heartbeat.play();//audio does not play when live server is down


// ================================================
// Selection Screen Logic
// ================================================
const difficultyScreen = document.getElementById('difficulty-screen');

// "SELECTIONS" button — hide start screen, show config screen
/* There's a bug here that keeps it from starting ambience but entering the lair starts the ambience properly
after a few restarts. */
document.getElementById('start-btn').addEventListener('click', () => {
    startScreen.style.display = 'none';
    difficultyScreen.classList.remove('hidden');
    startsoundtrack();//buggy and might not always work.
});

// Back button — return to start screen
document.getElementById('back-btn').addEventListener('click', () => {
    difficultyScreen.classList.add('hidden');
    startScreen.style.display = 'flex';
    stopsoundtrack();
});

// Generic toggle logic for both option groups
function setupOptionGroup(groupId, onSelect) {
    const group = document.getElementById(groupId);
    group.querySelectorAll('.opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            group.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            onSelect(parseInt(btn.dataset.value));
        });
    });
}

setupOptionGroup('size-options',   val => { SELECTED_MAZE_SIZE = val; });
setupOptionGroup('seeker-options', val => { SELECTED_SEEKERS   = val; });

// "ENTER THE LAIR" — apply selections and start the game
document.getElementById('enter-btn').addEventListener('click', () => {
    difficultyScreen.classList.add('hidden');

    // Rebuild seekers array to match selected count
    seekers.length = 0;
    for (let i = 0; i < SELECTED_SEEKERS; i++) {
        seekers.push({
            npc: new Enemy(0, 0, 1, 3),
            spawnX: 0,
            spawnZ: 0,
            state: PATROL,
            target: { r: 0, c: 0 },
            timer: 0,
            WaypointIndex: 0
        });
    }

    // Regenerate the maze at the selected size
    cleanMaze();
    MazeMaker.generateKruskalMaze(SELECTED_MAZE_SIZE, SELECTED_MAZE_SIZE);
    initializeNewLevel();

    gameStarted = true;
    isGameOver = false;
    isPaused = false;
   // drawMinimap(camera);
    canvas.requestPointerLock();
    
});

// =====================
// Main Loop
// =====================
let last = 0;
const NPC_THINK_RATE = 0.5;//every 0.5 seconds, the seekers recalculates the player's position and distance
//This choice reduces the load on the CPU while still allowing for responsive enemy behavior.
function loop(t) {
    //pause feature
    if(!gameStarted || isPaused || isGameOver){
        requestAnimationFrame(loop);
        return;
    }

    const dt = Math.min((t - last) / 1000, 0.1); last = t;
    
    // Movement Keys(WASD)
    let moveX = 0, moveZ = 0;
    if (keys.w) { moveX -= Math.sin(camera.yaw); moveZ -= Math.cos(camera.yaw);}//front
    if (keys.s) { moveX += Math.sin(camera.yaw); moveZ += Math.cos(camera.yaw);}//back
    if (keys.a) { moveX -= Math.cos(camera.yaw); moveZ += Math.sin(camera.yaw);}//right
    if (keys.d) { moveX += Math.cos(camera.yaw); moveZ -= Math.sin(camera.yaw);}//left

    //==========================================
    //Movement logic between walking and running
    /* The key to sprint is shift and the player is moving
    whenever movement on x or z is not 0.
    when the shift key is pressed & the player is moving
    & the stamina isn't depleted & stamina is more than 0
    stamin drain will be applied as the player will sprinting
    until stam is depleted.
    Stam regen will happen when the stamina is less than the max stamina
     */
    //==========================================
     const wantsToSprint = keys.shift;
    const isMoving = moveX !== 0 || moveZ !== 0;

if(wantsToSprint && isMoving && !stamDepleted && stamina > 0){
    isSprinting = true;
    stamina -= STAM_DRAIN * dt;
    if(stamina <= 0){
        stamina = 0;
        isSprinting = false;
        stamDepleted = true;
    }
} else {
    isSprinting = false;
    if(stamina < MAX_STAMINA){
        stamina += STAM_REGEN * dt;
        if(stamina >= MAX_STAMINA){
            stamina = MAX_STAMINA;
            stamDepleted = false;
        }
    }
}
//This tenerary operator will check the isSprinting boolean.
//If it is false, then the player speed is WALK_SPEED
//If it is true, then the player speed is RUN_SPEED
const speed = (isSprinting ? RUN_SPEED : WALK_SPEED) * dt;

// Update stamina bar UI
const staminaPct = stamina / MAX_STAMINA;
staminaBarEl.style.width = (staminaPct * 100) + '%';
//A tenerary operator to check the stamDepleted boolean
/* If stamDepleted is true, the bar is red
If stamDepleted is false, the bar is green. */
staminaBarEl.style.background = stamDepleted ? '#ff4444' : '#aaff44';

 //NPC Logic (pG = playerGrid && nG = npcGrid)
 seekers.forEach(seeker => {
    if(!seeker.npc.active) return;
    seeker.timer += 2;//increased timer to allow for smoother movement
    if(seeker.timer >= NPC_THINK_RATE){
        let pG = {
    r: Math.floor(camera.z / MazeMaker.WALL_SIZE + 0.5),
    c: Math.floor(camera.x / MazeMaker.WALL_SIZE + 0.5)
   };
   let nG = {
    r: Math.floor(seeker.npc.z / MazeMaker.WALL_SIZE + 0.5),
    c: Math.floor(seeker.npc.x / MazeMaker.WALL_SIZE + 0.5)
   };
   
   //to make sure that contact with the cube guarantees instant death
   const distanceToPlayer = Math.hypot(seeker.npc.x - camera.x, seeker.npc.z - camera.z);
   
   if(seeker.state === PATROL && distanceToPlayer < DETECT_RANGE){
    seeker.state = HUNT;
   }else if(seeker.state === HUNT && distanceToPlayer > FORGET_RANGE){
    seeker.state = PATROL;
   }

   if(seeker.state === HUNT){
    seeker.target = findNextStep(nG , pG, MazeMaker.blueprint);
    seeker.npc.speed = 4;
   }else{
    let targetWaypoint = waypoints[seeker.WaypointIndex];

    const distToWP = Math.hypot(
        (targetWaypoint.c * MazeMaker.WALL_SIZE) - seeker.npc.x, 
        (targetWaypoint.r * MazeMaker.WALL_SIZE) - seeker.npc.z
    );//A constant storing the distance between Seekers and their waypoints during patrolling

    /* The Seekers cycle between waypoints after being within range of them. */
    if(distToWP < 1.5){
        seeker.WaypointIndex = (seeker.WaypointIndex + 1) % waypoints.length;
        targetWaypoint = waypoints[seeker.WaypointIndex];
    }
    //The BFS pathfinding algorithm uses the maze layout as a way to find out where it can go.
    seeker.target = findNextStep(nG, targetWaypoint, MazeMaker.blueprint);
   
  
    }
   seeker.timer = 0;
        
    }
    
});
    seekers.forEach(seeker => {
    let tx = seeker.target.c * MazeMaker.WALL_SIZE;
   let tz = seeker.target.r * MazeMaker.WALL_SIZE;
   let ndx = tx - seeker.npc.x;
   let ndz = tz - seeker.npc.z;
   let distance = Math.hypot(ndx, ndz);

   if(distance > 0.2){
    const stepX = (ndx/distance) * seeker.npc.speed * dt;
    const stepZ = (ndz/distance) * seeker.npc.speed * dt;
    
    //Move X, then check walls
    seeker.npc.x += stepX;
    let boundsX = getBounds({x: seeker.npc.x, y: seeker.npc.y, z: seeker.npc.z}, 0.5);
    for(let cube of worldCubes){
        if(checkAABBCollision(boundsX, cube.bounds)){
            seeker.npc.x -= stepX;
            break;
        }
    }

    //Move Z, then check walls.
    seeker.npc.z += stepZ;
    let boundsZ = getBounds({x: seeker.npc.x, y: seeker.npc.y, z: seeker.npc.z}, 0.5);
    for(let cube of worldCubes){
        if(checkAABBCollision(boundsZ, cube.bounds)){
            seeker.npc.z -= stepZ;
            break;
        }
    }
   }
   if(!seeker.npc.active){
    seeker.npc.respawn(seeker.spawnX, seeker.spawnZ);
    seeker.state = PATROL;
    seeker.target = { r: 0, c: 0};
    seeker.timer = 0;
   }
   //when the entity has touched/consumed the player, the game ends and their positions are reset
   
const entityDist = Math.hypot(seeker.npc.x - camera.x, seeker.npc.z - camera.z);
   if(entityDist<1.25){
    //following line is to reset the position of all stunners in the map
    //along with npc and player position
   //myStunner.reset(entityDist, myStunner, 2, 7, 0.1);
    resetPositions();
    showGameOver();
    }
});
const distToExit = Math.hypot(camera.x - EXIT_X, camera.z - EXIT_Z);
if(distToExit < EXIT_RADIUS){
    showWinScreen();
}

    // Collision X
    let oldX = camera.x;
camera.x += moveX * speed;

// Create a bounding box for the player's new position
let playerBoundsX = getBounds({ x: camera.x, y: camera.y, z: camera.z }, PLAYER_WIDTH);

for (let cube of worldCubes) {
    if (checkAABBCollision(playerBoundsX, cube.bounds)) {
        camera.x = oldX; // Wall hit, revert position
        break; 
    }
}

    let oldZ = camera.z;
camera.z += moveZ * speed;

// Create a bounding box for the player's new position
let playerBoundsZ = getBounds({ x: camera.x, y: camera.y, z: camera.z }, PLAYER_WIDTH);

for (let cube of worldCubes) {
    if (checkAABBCollision(playerBoundsZ, cube.bounds)) {
        camera.z = oldZ; // Wall hit, revert position
        break;
    }
} 
    //=========================================================
    //Sound effect for heartbeat
    //=========================================================
    const closestDist = Math.min(...seekers.map(s => Math.hypot(s.npc.x - camera.x, s.npc.z - camera.z)));
    const maxDist = FORGET_RANGE;// 15.0 — silence beyond this
    const q = Math.max(0.01, 1 - closestDist / maxDist);// 0.01 = far, 1 = right on top of you
    heartbeat.volume = q * q;// quadratic ramp — subtle at distance, intense when close
    heartbeat.playbackRate = 0.7 + q * 1.3; // slow thud far away, rapid pounding nearby

    if(isGameOver === true){
        heartbeat.pause();
    }
    if(isGameOver === false){
        heartbeat.play();
    }
    //==========================================================
    //Sound Tracks
    /*Play jumpscare sound when seeker is close, resume soundtrack
    if the player survives and doesn't die.*/
    //==========================================================
    if(closestDist <= FORGET_RANGE){
        if(ambiencePlaying) stopsoundtrack();
            if(closestDist <= JUMPSCARE_RANGE && jumpscareReady){
                jumpscareSound.play();
                jumpscareReady = false;
            }
        }
            else{
                if(!ambiencePlaying && !isPaused && !isGameOver){
        startsoundtrack();
            }
            jumpscareReady = true;
    }
/*This logic checks if the gun is picked up. When it isn't, it hovers in a single place on the y-axis */
    gun.checkPickup(camera);
if(!gun.pickedUp){
    gun.hover();
}
updateGunUI();
    // Rendering
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, perspective(Math.PI / 3, canvas.width / canvas.height, 0.1, 1000));
    // above perspective matrix sent to the vertex shader
    gl.uniformMatrix4fv(viewMatrixLoc, false, viewMatrix(camera));
    //above viewing matrix sent to the vertex shader
    
    /*This call is to prevent strain on the GPU, before this the uniform for textures
    was requested before each and every item. This cause the game to crash after a prolonged period of playtime.
     */
    gl.uniform1i(texLoc,0);

    // Draw Ground
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(posLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, groundUVBuffer);
gl.vertexAttribPointer(TexCoordLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(TexCoordLoc);

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, groundTex);
    gl.uniformMatrix4fv(modelMatrixLoc, false, translateMatrix(0, 0, 0));
   gl.uniform1f(ambientLoc, 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    // Draw Maze Walls
    /* Removal of the Loop means that the whole maze has its own buffer
    The buffer reduction ensures that the game does not crash as much 
    and webgl context is not lost as much. */
gl.bindBuffer(gl.ARRAY_BUFFER, staticMazeBuffer);
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(posLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, staticMazeUVBuffer);
gl.vertexAttribPointer(TexCoordLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(TexCoordLoc);

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, wallTex);
gl.uniformMatrix4fv(modelMatrixLoc, false, translateMatrix(0, 1, 0));//taller walls
gl.uniform1f(ambientLoc, 0.3);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, staticMazeIndexBuffer);
gl.drawElements(gl.TRIANGLES, staticMazeIndexCount, gl.UNSIGNED_SHORT, 0);
// World Cubes loop replaced
    
//Draw entity
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, seekerTex);

//Every seeker is drawn and rendered the same way
seekers.forEach(seeker => {
    if(!seeker.npc.active) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, rectBuffer);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, rectUVBuffer);
    gl.vertexAttribPointer(TexCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(TexCoordLoc);

    gl.uniformMatrix4fv(modelMatrixLoc, false, translateMatrix(seeker.npc.x, seeker.npc.y, seeker.npc.z));
    gl.uniform1f(ambientLoc, 0.5);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rectIndexBuffer);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
});
//Drawing Objects
if (!gun.pickedUp) {
    // Attach texture to gun
    gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, gunTex);
gl.uniform1f(ambientLoc, 0.3);

// Also bind the UV buffer so texCoord attribute isn't reading leftover data
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.vertexAttribPointer(TexCoordLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(TexCoordLoc);

    gun.render(gl, posLoc, modelMatrixLoc, colorLoc, sharedIndexBuffer);
} else {
    // Use identity view so the gun sits in front of the camera always
    const identityView = new Float32Array([
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,0,1
    ]);
    // Position in clip space: right side, low, close to camera
    // Held position resembles how guns are held in most FPS video games
    const heldMatrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0.4, -0.35, -0.6, 1  // x: right, y: low, z: forward into screen
    ]);
    gl.uniformMatrix4fv(viewMatrixLoc, false, identityView);
    gl.uniformMatrix4fv(modelMatrixLoc, false, heldMatrix);

    //Bind Position Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, gun.buffer);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(posLoc);

    //Bind UV buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.vertexAttribPointer(TexCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(TexCoordLoc);

//bind texture to sampler
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, gunTex);
gl.uniform1f(ambientLoc, 0.3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sharedIndexBuffer);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

}
// Restore world view for everything rendered after
    gl.uniformMatrix4fv(viewMatrixLoc, false, viewMatrix(camera));

//Bind textures for the bullets
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, bulletTex);
gl.uniform1f(ambientLoc, 0.3);
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.vertexAttribPointer(TexCoordLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(TexCoordLoc);

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
    b.update(worldCubes);
    b.render(gl, posLoc, modelMatrixLoc, colorLoc);
    if (b.alive){
        for(const seeker of seekers){
            if(!seeker.npc.active) continue;
            const dx = Math.abs(b.pos.x - seeker.npc.x);
            const dz = Math.abs(b.pos.z - seeker.npc.z);
            if(dx < 0.9 && dz < 0.9){
                seeker.npc.takeDamage(5);
                //Because of added gun reload time, the player does not have time to fire 5 shots to kill the Seeker.
                //Two shots kills Seekers now, to make it difficult and stressful during an encounter
                //but also manageable enough to survive
                b.alive = false;
                if(!seeker.npc.active){
                    killCount++;
                    updateKillDisplay();
                }
                break;
            }
        }
    }
    if(!b.alive) {
        /* Dead bullets were not having their buffers removed,
        causing GPU overhead and crashing. Deleting a bullets buffer
        after every shot fire is meant to mitigate that. */
        gl.deleteBuffer(b.buffer);
        bullets.splice(i,1);
    }
}
//Bind Textures for AmmoPacks
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, ammopackTex);
gl.uniform1f(ambientLoc, 0.3);
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
gl.vertexAttribPointer(TexCoordLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(TexCoordLoc);

worldObjects.forEach( packPositions=>{
    packPositions.update(camera, gun);
    packPositions.render(gl, posLoc, modelMatrixLoc, colorLoc, sharedIndexBuffer);
});

 if(gameStarted || !isGameOver) drawMinimap(camera);
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);