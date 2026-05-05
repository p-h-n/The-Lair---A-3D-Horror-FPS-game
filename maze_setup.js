import { MazeMaker } from './maze_generation.js'
import { getBounds } from './collisions.js'
import { Rectangular } from './rectangular.js'

export function generateMaze(){
    const layout = MazeMaker.blueprint;//the grid for the maze
    const WALL_SIZE = MazeMaker.WALL_SIZE;//the multiplier to ensure that the walls look like walls
    const worldGrid = [];//the array that will store the worldGrid

    //Safety check: to ensure data is in the array
    if(!Array.isArray(layout)||layout.length===0){
        console.error("Maze data missing.");
        return;
    }
    layout.forEach((row, grid_z)=> {
        row?.forEach((cell, grid_x) => {
            if(cell===1){
                /*The world position of everything is multiplied by the 
                WALL_SIZE. For every wall(for every 1 in the grid)
                , the grid cooridnates are multiplied by 2 to give worldPosition
                coordinates which are pushed into the array for worldGrid*/
                const worldPosx = grid_x * WALL_SIZE;
                const worldPosz = grid_z * WALL_SIZE;

                worldGrid.push({
                    position: { x: worldPosx, y: 1, z: worldPosz },
                    size: WALL_SIZE,
                    bounds: getBounds({ x: worldPosx, y: 1, z: worldPosz }, WALL_SIZE)
                });
            }
        });
    });
    return worldGrid;
}
/* This function generates a buffer for the entire maze as a single shape. 
This is because buffers for every element of the walls will cause my game to crasha as my GPU is
garbage. */
export function generateMazeBatch(gl) {
    const layout = MazeMaker.blueprint;//the grid for the maze
    const WALL_SIZE = MazeMaker.WALL_SIZE;//the multiplier to ensure that the walls look like walls
    
    /* To give the entire maze a single buffer,
    arrays are made for the vertices, UVs, indices and the prisms
    used to make the walls */
    const allVertices = [];
    const allUVs = [];
    const allIndices = [];
    const wallObjects = [];

    /* The prisms are made for the above arrays as reference */
    const rect_prism = new Rectangular();
    const prism_shape = rect_prism.createRect(1, 4, 1);//tall walls to dwarf the player

    // 4 UV corners per face, 6 faces per prism
    const faceUVs = [0,0,  1,0,  1,1,  0,1];
    const cubeUVs = [];
    for (let i = 0; i < 6; i++) cubeUVs.push(...faceUVs); // 24 UV pairs

    let wallCount = 0;
    //This function essentially finds the walls are just allows for UVs and vertices to be applied to the walls.
     layout.forEach((row, grid_z)=> {
        row?.forEach((cell, grid_x) => {
            if(cell===1){
               const worldPosx = grid_x * WALL_SIZE;
                const worldPosz = grid_z * WALL_SIZE;

                // Push the 24 translated vertices for this wall
                for (let i = 0; i <  prism_shape.length; i += 3) {
                    allVertices.push(
                        prism_shape[i]     + worldPosx,
                         prism_shape[i + 1],
                         prism_shape[i + 2] + worldPosz
                    );
                }

                // Push 24 UV pairs for this wall
                allUVs.push(...cubeUVs);

                // Push 36 indices for this wall (6 faces × 2 tris × 3 verts)
                // Each wall has 24 vertices, so offset by wallCount * 24
                for (let face = 0; face < 6; face++) {
                    const b = wallCount * 24 + face * 4;
                    allIndices.push(b, b+1, b+2,  b, b+2, b+3);
                }

                wallObjects.push({
               position: { x: worldPosx, y: 1, z: worldPosz },
                    bounds: getBounds({ x: worldPosx, y: 1, z: worldPosz }, WALL_SIZE)
                });

                wallCount++;
            }
        });
    });

    // Vertex position buffer. The sole buffer for the vertices of the maze.
    const masterBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, masterBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allVertices), gl.STATIC_DRAW);

    // UV buffer. The sole buffer for the maze
    const masterUVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, masterUVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(allUVs), gl.STATIC_DRAW);

    // Index buffer. The triangles make the walls and the textures look weird. So indices were used to replace them.
    const masterIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, masterIndexBuffer);
    /* Uint16Array stays. Thanks to the characteristic of Kruskal's Algorithm
    to produce a large amount of dead ends, a small percentage of the maze consists of walls. 
    This means that the size can be pushed to a define limit, without having to 
    spend time forcing Uint32Array to replace it. Tha maximum size that can be played
    smoothly that I know of is 200x200 mazes. 250x250 might be the ultimate 
    maximum though.*/
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(allIndices), gl.STATIC_DRAW);
    /*200 × 200 = 40000 cells
    40000 × 36 = 1,440,000 indices needed
    1,440,000 / 65535 = ~22 walls worth of actual density
    22 / 40000 = ~0.055 = roughly 5-6% of cells are walls */
    return {
        buffer: masterBuffer,
        uvBuffer: masterUVBuffer,
        indexBuffer: masterIndexBuffer,
        indexCount: allIndices.length,
        collisionWalls: wallObjects
    };
}