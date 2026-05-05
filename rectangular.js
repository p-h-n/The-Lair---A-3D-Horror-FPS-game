export class Rectangular {
    /* A much more versatile function, upgraded from a function that just made cubes.
    This function creates Rectangule Prisms and evens cubes if all constants are the same. 
    This is used to make the walls, the Seekers, the gun and the ammo packs. */
    createRect(sx, sy, sz){
        const cx = sx;//constant for x
        const cy = sy;//constant for y
        const cz = sz;//constant for z
/* Initially this returned a prism made of triangles, implementation of indices changed this.
So now it just works with faces. */
        return new Float32Array([
        // Front face  (z = +cz)
            -cx, -cy,  cz,   //  0 bottom-left
             cx, -cy,  cz,   //  1 bottom-right
             cx,  cy,  cz,   //  2 top-right
            -cx,  cy,  cz,   //  3 top-left
 
            // Back face   (z = -cz)
            -cx, -cy, -cz,   //  4 bottom-left
            -cx,  cy, -cz,   //  5 top-left
             cx,  cy, -cz,   //  6 top-right
             cx, -cy, -cz,   //  7 bottom-right
 
            // Left face   (x = -cx)
            -cx, -cy, -cz,   //  8 bottom-back
            -cx, -cy,  cz,   //  9 bottom-front
            -cx,  cy,  cz,   // 10 top-front
            -cx,  cy, -cz,   // 11 top-back
 
            // Right face  (x = +cx)
             cx, -cy, -cz,   // 12 bottom-back
             cx,  cy, -cz,   // 13 top-back
             cx,  cy,  cz,   // 14 top-front
             cx, -cy,  cz,   // 15 bottom-front
 
            // Top face    (y = +cy)
            -cx,  cy, -cz,   // 16 back-left
            -cx,  cy,  cz,   // 17 front-left
             cx,  cy,  cz,   // 18 front-right
             cx,  cy, -cz,   // 19 back-right
 
            // Bottom face (y = -cy)
            -cx, -cy, -cz,   // 20 back-left
             cx, -cy, -cz,   // 21 back-right
             cx, -cy,  cz,   // 22 front-right
            -cx, -cy,  cz,   // 23 front-left
        ]);
    }
    //This function retrieves indices so that objects can be drawn. 
    getIndices() {
        const indices = [];
        for (let face = 0; face < 6; face++) {
            const b = face * 4; // base vertex index for this face
            // First triangle:  bottom-left, bottom-right, top-right
            indices.push(b, b + 1, b + 2);
            // Second triangle: bottom-left, top-right,   top-left
            indices.push(b, b + 2, b + 3);
        }
        /* Uint16Array allows for 65535 vertices. Implementation to try and boost this
        number has resulted in failure. Any maze above 200x200 becomes almost unplayable 
        as the frame rate drops. */
        return new Uint16Array(indices);
    }
}