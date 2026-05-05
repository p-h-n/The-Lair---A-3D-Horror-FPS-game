import { Rectangular } from './rectangular.js';
const MAX_AMMO = 5;
const AMMO_PER_PACK = 5;
export class AmmoPack{
    constructor(x, y,z){
        this.pos = {x: x, y: y, z: z};
        this.baseY = y;
        this.collected = false;
        this.rotationY = 0;
        this.modelMatrix = new Float32Array(16);

        const r = new Rectangular();
        this.vertices = r.createRect(0.2, 0.2, 0.2);
    }

    initBuffer(gl) {
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    }
    update(player, gun){
        if(this.collected) return;

        this.rotationY += 0.02;
        this.pos.y = this.baseY + Math.sin(performance.now() * 0.002) * 0.06;//0.002 to slow down the movement and +-0.06 movement on the y axis

        const c = Math.cos(this.rotationY);
        const s = Math.sin(this.rotationY);
        this.modelMatrix.set([
            c, 0, s, 0,
            0, 1, 0, 0,
            -s, 0, c, 0,
            this.pos.x, this.pos.y, this.pos.z, 1
        ]);

        const dist = Math.hypot(
            player.x - this.pos.x,
            player.z - this.pos.z
        );
        //Prevention of overfilling magazine
        if(dist < 1.0 && gun.pickedUp && gun.ammo <= 0){
            gun.ammo += AMMO_PER_PACK;
            this.collected = true;
            gun.isLoaded = true;
        }
    }

     render(gl, posLoc, modelLoc, colorLoc, indexBuffer) {
        if(this.collected) return;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);
        gl.uniform3fv(colorLoc, [1, 0.8, 0]);
        gl.uniformMatrix4fv(modelLoc, false, this.modelMatrix);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }
}