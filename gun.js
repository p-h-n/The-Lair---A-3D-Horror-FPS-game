import { Rectangular } from './rectangular.js';
//import { invertViewMatrix, transformPoint } from './matrices.js';
export class Gun {
        constructor (x, y, z, color){
    this.pos = {x: x, y: y, z: z};
    this.basePos = {x: x, y: y, z: z};
    this.color = color;
    this.ammo = 0;
    this.pickedUp = false;
    this.isLoaded = false; //only true when first ammo pack picked up
    this.rotationY = 0;

    this.modelMatrix = new Float32Array([
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        x,y,z,1//set position of gun to spawn immediately
    ]);

    const gun = new Rectangular();
    this.vertices = gun.createRect(0.1, 0.1, 0.5);
}

    //function to create buffer for weapon
    initBuffer(gl) {
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
    }

    hover(){
        this.rotationY += 0.015;
        this.pos.y = this.basePos.y + Math.sin(performance.now() * 0.002) * 0.06;
        this.buildHoverMatrix();
    }
    buildHoverMatrix(){
        const c = Math.cos(this.rotationY);
        const s = Math.sin(this.rotationY);

        this.modelMatrix.set([
            c, 0, s, 0,
            0, 1, 0, 0,
            -s, 0, c, 0,
            this.pos.x, this.pos.y, this.pos.z, 1
        ]);
    }
/*
    followCamera(viewMatrix, offset){
        const invView = invertViewMatrix(viewMatrix);
        if(!invView) return;
        const worldPos = transformPoint(invView, offset);
        this.pos.x = worldPos.x;
        this.pos.y = worldPos.y;
        this.pos.z = worldPos.z;

        this.modelMatrix.set([
            1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            this.pos.x, this.pos.y, this.pos.z, 1
        ]);
    }*/
checkPickup(player){
    if(this.pickedUp) return;
    const dist = Math.hypot(player.x - this.pos.x,
        player.z - this.pos.z
    );
    if(dist < 1){
        this.pickedUp = true;
    }
}
fire(camera){
    if(!this.isLoaded || this.ammo <= 0){
        this.isLoaded = false;
        return null;
    }
    this.ammo--;
    if(this.ammo <= 0) this.isLoaded = false;

    const speed = 0.18;
    const lob = 0.06;// upward kick for the Demoman arc

  
        const vx = -Math.sin(camera.yaw)  * Math.cos(camera.pitch) * speed;
        const vy =  Math.sin(camera.pitch) * speed + lob;
        const vz = -Math.cos(camera.yaw)  * Math.cos(camera.pitch) * speed;

        // Spawn in front of the player so it clears the camera origin
        const spawnX = camera.x - Math.sin(camera.yaw) * 0.5;
        const spawnY = camera.y - 0.1; //infront of player
        const spawnZ = camera.z - Math.cos(camera.yaw) * 0.5;

        return { spawnX, spawnY, spawnZ, vx, vy, vz };
}
    render(gl, posLoc, modelLoc, colorLoc, indexBuffer) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);
        gl.uniform3fv(colorLoc, this.color);
        gl.uniformMatrix4fv(modelLoc, false, this.modelMatrix);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }
    updatePosition(newX, newY, newZ) {
    this.pos.x = newX;
    this.pos.y = newY;
    this.pos.z = newZ;
    
    // Update basePos so the hovering doesn't "snap" back to (0,0,0)
    this.basePos.x = newX;
    this.basePos.y = newY;
    this.basePos.z = newZ;

    // Refresh the model matrix immediately
    this.modelMatrix.set([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        newX, newY, newZ, 1
    ]);
}

}