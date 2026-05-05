import { MazeMaker } from './maze_generation.js';

// ============================================================
// Canvas & Context
// ============================================================
const miniMapcanvas = document.getElementById('minimap');
const mmgl = miniMapcanvas.getContext('webgl');
if (!mmgl) console.error("Minimap WebGL not supported");

const MINIMAP_VIEW = 10; // tiles visible in every direction from player
const TILE_NUMBER = miniMapcanvas.width / (MINIMAP_VIEW * MazeMaker.WALL_SIZE);// 180/(10*2) = 9 pixels. Every tile is 9pixels by 9pixels
const MM_W = miniMapcanvas.width;//180 pixels
const MM_H = miniMapcanvas.height;//180 pixels

// ============================================================
// Visited Cells
// Exported so main.js can import it. The Set is written to
// inside drawMinimap() and read from the same place.
// ============================================================
//export const visitedCells = new Set();//set storing visited cells

// ============================================================
// Shaders
// Flat-color, no textures, no lighting, no world matrices.
// Positions are passed in as clip-space coords [-1, 1].
// ============================================================
const mmVertSrc = `
    attribute vec2 pos;
    uniform vec2 offset;   /* tile centre in clip space  */
    uniform vec2 scale;    /* tile half-size in clip space */
    void main() {
        gl_Position = vec4(pos * scale + offset, 0.0, 1.0);//2d looking map; no z coordinates
    }
`;

const mmFragSrc = `
    precision mediump float;
    uniform vec4 color;
    void main() { 
    gl_FragColor = color * 0.3;//float for ambience, too lazy to add another variable like in the main.js file. code still works
    }
`;

// ============================================================
// Shader compilation helper (local — not exported)
// ============================================================
function mmCompile(type, src) {
    const s = mmgl.createShader(type);
    mmgl.shaderSource(s, src);
    mmgl.compileShader(s);
    if (!mmgl.getShaderParameter(s, mmgl.COMPILE_STATUS))
        console.error('Minimap shader error:', mmgl.getShaderInfoLog(s));
    return s;
}

// ============================================================
// Program
// ============================================================
const mmProgram = mmgl.createProgram();
mmgl.attachShader(mmProgram, mmCompile(mmgl.VERTEX_SHADER,   mmVertSrc));
mmgl.attachShader(mmProgram, mmCompile(mmgl.FRAGMENT_SHADER, mmFragSrc));
mmgl.linkProgram(mmProgram);
if (!mmgl.getProgramParameter(mmProgram, mmgl.LINK_STATUS))
    console.error('Minimap program link error:', mmgl.getProgramInfoLog(mmProgram));
mmgl.useProgram(mmProgram);

// ============================================================
// Attribute / Uniform locations
// ============================================================
const mmPosLoc    = mmgl.getAttribLocation(mmProgram,  'pos');
const mmOffsetLoc = mmgl.getUniformLocation(mmProgram, 'offset');
const mmScaleLoc  = mmgl.getUniformLocation(mmProgram, 'scale');
const mmColorLoc  = mmgl.getUniformLocation(mmProgram, 'color');

// ============================================================
// Reusable unit quad [-1, 1]
// Shared by every tile draw call and the player dot.
// The direction line temporarily overwrites this buffer then
// restores it at the end of drawMinimap().
// ============================================================
const Universal_SQ = new Float32Array([
//  x   y   (this is all you really need, what purpose would a z coordinate serve here) 
    -1, -1,   
    1, -1,  
    -1,  1,
    1, -1,   
    1,  1,  
    -1,  1
]);
//buffer for the universal square
const mmQuadBuf = mmgl.createBuffer();
mmgl.bindBuffer(mmgl.ARRAY_BUFFER, mmQuadBuf);
mmgl.bufferData(mmgl.ARRAY_BUFFER, Universal_SQ, mmgl.STATIC_DRAW);

// ============================================================
// Helpers
// ============================================================

/**
 * Draws a pixel-space rectangle in a given RGBA color.
 * px, py  — top-left pixel origin
 * pw, ph  — pixel width and height
 * r,g,b,a — color components in [0, 1]
 */

function mmDrawQuad(px, py, pw, ph, r, g, b, a) {
    // Convert pixel rect centre to clip space.
    // Note: clip-space Y is flipped relative to pixel Y (top-left origin).
    const cx =  (px + pw * 0.5) / MM_W * 2 - 1;
    const cy = -((py + ph * 0.5) / MM_H * 2 - 1);
    const sx = pw / MM_W;
    const sy = ph / MM_H;

    mmgl.uniform2f(mmOffsetLoc, cx, cy);
    mmgl.uniform2f(mmScaleLoc,  sx, sy);
    mmgl.uniform4f(mmColorLoc,  r,  g,  b,  a);
    mmgl.drawArrays(mmgl.TRIANGLES, 0, 6);
}

// ============================================================
// drawMinimap(camera)
// Call once per frame from the main game loop.
// camera — the player camera object { x, z, yaw }
// ============================================================
export function drawMinimap(camera) {
    const maze = MazeMaker.blueprint;
    if (!maze || maze.length === 0) return;

    const rows = maze.length;
    const cols = maze[0].length;
    const ws   = MazeMaker.WALL_SIZE;

    // Convert world coords to grid coords
    const gridR = Math.round(camera.z / ws);
    const gridC = Math.round(camera.x / ws);

    // Mark current cell as visited
    //visitedCells.add(`${gridR},${gridC}`);

    // ── WebGL state ───────────────────────────────────────────
    mmgl.viewport(0, 0, MM_W, MM_H);
    mmgl.clearColor(0.067, 0.067, 0.067, 1); // matches #111 background
    mmgl.clear(mmgl.COLOR_BUFFER_BIT);

    // Bind the unit quad and set up the position attribute
    mmgl.bindBuffer(mmgl.ARRAY_BUFFER, mmQuadBuf);
    mmgl.enableVertexAttribArray(mmPosLoc);
    mmgl.vertexAttribPointer(mmPosLoc, 2, mmgl.FLOAT, false, 0, 0);

    const tiles = TILE_NUMBER;
    const half  = MINIMAP_VIEW;

    // ── Tile grid ─────────────────────────────────────────────
    for (let dr = -half; dr <= half; dr++) {
        for (let dc = -half; dc <= half; dc++) {
            const r  = gridR + dr;
            const c  = gridC + dc;
            const px = (dc + half) * tiles;
            const py = (dr + half) * tiles;

            // Color of the area beyond the maze layout
            if (r < 0 || r >= rows || c < 0 || c >= cols) {
                mmDrawQuad(px, py, tiles, tiles, 0.06, 0.06, 0.06, 1);
                continue;
            }

            const isWall = maze[r][c] === 1;//1s are walls in the grid
           // const seen   = visitedCells.has(`${r},${c}`);//any grid in the visitedCells set

            if (isWall) {
                //Similar color of the walls texture
                mmDrawQuad(px, py, tiles, tiles, 1.53, 1.48, 0.79, 1);
            } else {
              //seen path
              //unseen path
              //divided by 0.3 to cancel out ambience in the fragment, as of writing, not sure if it works
                mmDrawQuad(px, py, tiles, tiles, 0.2/0.3, 0.1/0.3, 0, 1);
            }
        }
    }

    // ── Player dot ────────────────────────────────────────────
    // Drawn as a square quad centered on the minimap.
    // A true circle would require a distance check in the fragment
    // shader, but at this scale the difference is invisible.
    const cx   = (half + 0.5) * tiles;//this keeps the map tracking the players immediate position.
    const cy   = (half + 0.5) * tiles;//without the + 0.5, the player on the map is in the walls
    const dotR = tiles * 0.3;
    //white square for the player
    //1 divided by 0.3 which is the ambient float in the fragment shader to cancel multiplication with the float
    mmDrawQuad(cx - dotR, cy - dotR, dotR * 2, dotR * 2, 1/0.3, 1/0.3, 1/0.3, 1);

    mmgl.drawArrays(mmgl.TRIANGLES, 0, 6);

    // Restore the unit quad so mmDrawQuad works correctly next frame
    mmgl.bufferData(mmgl.ARRAY_BUFFER, Universal_SQ, mmgl.STATIC_DRAW);
}