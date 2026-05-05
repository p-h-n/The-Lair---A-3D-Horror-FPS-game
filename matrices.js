/*Because OOP exists and is possible in Javascript as in Java, I moved all matrices 
required to play the game into a single and made them exports.
This makes it easier to identify issues and reduce the size of the main.js file 
as to not make it obnoxiously large. 
It's still large but not as large as it would be if these things were still inside.*/

//perspective matrix
export function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2);
     const nf = 1 / (near - far);
    return new Float32Array([
        f / aspect, 0, 0, 0, 
        0, f, 0, 0, 
        0, 0, (far + near) * nf, -1, 
        0, 0, (2 * far * near) * nf, 0]);
}
//view matrix for camera.
export function viewMatrix(cam) {
    const cosP = Math.cos(cam.pitch), sinP = Math.sin(cam.pitch);
    const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
    
    // Allowing for First person perspective
    const xAxis = [cosY, 0, -sinY];
    const yAxis = [sinP * sinY, cosP, sinP * cosY];
    const zAxis = [cosP * sinY, -sinP, cosP * cosY];

    return new Float32Array([
        xAxis[0], yAxis[0], zAxis[0], 0,
        xAxis[1], yAxis[1], zAxis[1], 0,
        xAxis[2], yAxis[2], zAxis[2], 0,
        -(xAxis[0] * cam.x + xAxis[1] * cam.y + xAxis[2] * cam.z),
        -(yAxis[0] * cam.x + yAxis[1] * cam.y + yAxis[2] * cam.z),
        -(zAxis[0] * cam.x + zAxis[1] * cam.y + zAxis[2] * cam.z),
        1
    ]);
}
//translation matrix for objects
export function translateMatrix(x, y, z) {
    return new Float32Array(
        [1, 0, 0, 0, 
         0, 1, 0, 0,
         0, 0, 1, 0,
        x, y, z, 1]);
}

//this function is intended for the 
export function invertViewMatrix(m){
    const out = new Float32Array(16);

    const a00=m[0], a01=m[1], a02=m[2],  a03=m[3];
  const a10=m[4], a11=m[5], a12=m[6],  a13=m[7];
  const a20=m[8], a21=m[9], a22=m[10], a23=m[11];
  const a30=m[12],a31=m[13],a32=m[14], a33=m[15];

  const b00 = a00*a11 - a01*a10;
  const b01 = a00*a12 - a02*a10;
  const b02 = a00*a13 - a03*a10;
  const b03 = a01*a12 - a02*a11;
  const b04 = a01*a13 - a03*a11;
  const b05 = a02*a13 - a03*a12;
  const b06 = a20*a31 - a21*a30;
  const b07 = a20*a32 - a22*a30;
  const b08 = a20*a33 - a23*a30;
  const b09 = a21*a32 - a22*a31;
  const b10 = a21*a33 - a23*a31;
  const b11 = a22*a33 - a23*a32;

  let det = b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06;
  if (!det) return null;
  det = 1.0 / det;

  out[0]  = (a11*b11 - a12*b10 + a13*b09) * det;
  out[1]  = (a02*b10 - a01*b11 - a03*b09) * det;
  out[2]  = (a31*b05 - a32*b04 + a33*b03) * det;
  out[3]  = (a22*b04 - a21*b05 - a23*b03) * det;
  out[4]  = (a12*b08 - a10*b11 - a13*b07) * det;
  out[5]  = (a00*b11 - a02*b08 + a03*b07) * det;
  out[6]  = (a32*b02 - a30*b05 - a33*b01) * det;
  out[7]  = (a20*b05 - a22*b02 + a23*b01) * det;
  out[8]  = (a10*b10 - a11*b08 + a13*b06) * det;
  out[9]  = (a01*b08 - a00*b10 - a03*b06) * det;
  out[10] = (a30*b04 - a31*b02 + a33*b00) * det;
  out[11] = (a21*b02 - a20*b04 - a23*b00) * det;
  out[12] = (a11*b07 - a10*b09 - a12*b06) * det;
  out[13] = (a00*b09 - a01*b07 + a02*b06) * det;
  out[14] = (a31*b01 - a30*b03 - a32*b00) * det;
  out[15] = (a20*b03 - a21*b01 + a22*b00) * det;

  return out;
}

export function transformPoint(m,p){
    const x = m[0]*p.x + m[4]*p.y + m[8]*p.z + m[12];
    const y = m[1]*p.x + m[5]*p.y + m[9]*p.z + m[13];
    const z = m[2]*p.x + m[6]*p.y + m[10]*p.z + m[14];
    return { x, y, z};
}