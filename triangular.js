export class Triangular{
    /* This function descends from the Cube class and createCube function, 
    that no longer exist. That class and function layout, created only one type of
    shape at different sizes and so I modified it to create tetrahedrons for the bullets. */
    createPrism(size) {
    const s = size;//size of bullets
    //returns coordinates for the faces
    return new Float32Array([
        //Face 1
        0,s,0,
        -s,0,s,
        s,0,s,

        //Face 2
        0, s, 0,
        s, 0, -s,
        s, 0, s,

        //Face 3
        0, s, 0,
        -s, 0, s,
        s, 0, -s,

        //Face 4
        -s, 0, s,
        s, 0, s,
        s, 0, -s
       
    ]);
}
}