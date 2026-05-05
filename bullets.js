import { Triangular } from "./triangular.js";

//Gravitation constant
const GRAVITY = 0.008;

export class Bullet{
    constructor(x, y, z, vx, vy, vz){
        this.pos = {x: x, y: y, z: z};//position along x, y, z
        this.velocity = {x: vx, y: vy, z: vz};//velocity along x, y, z
        this.alive = true;//alive is essentially live, meaning it is fired and can damaged Seekers

        const v = new Triangular();//The class Triangular has a pre-built function to make tetrahedrons
        this.vertices = v.createPrism(0.08);//0.08 for a very small bullet.
        this.vertexCount = this.vertices.length / 3;
    }
    //Having a function to make a buffer inside of the class is easier than making more buffers in the main file
     initBuffer(gl) {
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    }
    
     
    update(worldCubes) {
        if (!this.alive) return;
        //changing the position of the bullet depending on the velocity.
        this.velocity.y -= GRAVITY;//the velocity of y is always decreased by gravity.
        this.pos.x += this.velocity.x;
        this.pos.y += this.velocity.y;
        this.pos.z += this.velocity.z;

        // Floor collision
        if (this.pos.y === 0.05) {
            //this.pos.y = 0.05;
            this.alive = false;//to prevent the bullets/projectiles from sliding across the floor
            return;
        }

        // Wall collision — check against maze cube bounds
        //Bullets vanish when hitting make
        for (const cube of worldCubes) {
            const b = cube.bounds;
            if (
                this.pos.x > b.minX && this.pos.x < b.maxX &&
                this.pos.y > b.minY && this.pos.y < b.maxY &&
                this.pos.z > b.minZ && this.pos.z < b.maxZ
            ) {
                this.alive = false;
                return;
            }
        }
    }

    render(gl, posLoc, modelLoc, colorLoc){
        if(!this.alive) return;//if the bullet isn't live, do nothing
        const m = new Float32Array([
            1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            this.pos.x, this.pos.y, this.pos.z, 1
        ]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);
        gl.uniform3fv(colorLoc, [0.4, 1.0, 0.4]);//green color
        gl.uniformMatrix4fv(modelLoc, false, m);
        //Almost every has indices being used, but not here. This is because i am kind lazy and the bullets still work
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);
    }
    
}