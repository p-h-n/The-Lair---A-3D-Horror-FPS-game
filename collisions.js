//Functions were moved here to reduce size of main.js file. These guys just make sure that nothing phases through the walls.
export function checkAABBCollision(boxA, boxB){
    return (boxA.minX <= boxB.maxX && boxA.maxX >= boxB.minX) &&
           (boxA.minY <= boxB.maxY && boxA.maxY >= boxB.minY) &&
           (boxA.minZ <= boxB.maxZ && boxA.maxZ >= boxB.minZ);
}
export function getBounds(pos, size){
    const half = size/2;
    return {
        minX: pos.x - half, maxX: pos.x + half,
        minY: pos.y - half, maxY: pos.y + half,
        minZ: pos.z - half, maxZ: pos.z + half
    };
}