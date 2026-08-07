# The-Lair---A-3D-Horror-FPS-game
The Lair is a first-person psychological horror maze game built entirely with raw WebGL — no Three.js, no 2D canvas, no external libraries. The maze is procedurally generated each run. Your objective is to find the exit while avoiding the Seekers that patrol the corridors.

Originally submitted as a course project for Computer Graphics 2 (CGD260S), this is now an ongoing passion project with plans for a full standalone release.
On launch, select your maze size (20×20 to 200×200) and the number of Seekers (1–10). Each run generates a new maze. Navigate to the exit using the minimap in the bottom-left corner — and don't get caught.

Seekers patrol the maze autonomously. If one finds you, it's over.

Scattered through the maze are rotating ammo packages. Each contains 5 rounds for the Alkaline Gun. You can only pick up a package when your magazine is empty.

Controls for the game: 
W/A/S/D for movement forward/left/backward/right.
Mouse is for looking around as game is first person
W+Shift allows for runnning 
LMB fires the Alkaline Gun

How to Run:
The game so far runs using the Live Server extension on VS code and boots up on a browser tab. To load the game, you will need to have the index.html file selected on VS code and open the Live Server.

Since the submission version of this project has been submitted, I am now intending to utilize more aspects of JavaScript to expand it. This involves doing the following:
1. Replacing solid-color textures with proper texture maps.
2. Do more rendering and object creation with Three.js and other external libraries.
3. Transition the project from an arcade like game to something with an actual narrative like what was imagined earlier in the project's creation.
4. Export as a standalone file using Electron.js or something similar.

To have a look at how the game was made, what inspirations there were and a better deep dive into the mechanics that went into it, please have a look at the Report_on_The_Lair.pdf in the Report branch.
