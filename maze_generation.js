class UnionFind {
    constructor(size) {
        this.parent = Array(size).fill(0).map((_, i) => i);
    }
    find(i) {
        if (this.parent[i] === i) return i;
        return this.parent[i] = this.find(this.parent[i]);
    }
    union(i, j) {
        const rootI = this.find(i);
        const rootJ = this.find(j);
        if (rootI !== rootJ) {
            this.parent[rootI] = rootJ;
            return true;
        }
        return false;
    }
}

export class MazeMaker {
    static WALL_SIZE = 2;
    static blueprint = [];
    static exitPoint = { r: 0, c: 0 };
    static openSpaces = []; // Store 0s to safely spawn enemies/items later
    /* This is where the maze generation happens.
    The function below utilizes the Kruskal Algorithm to create the maze. */
    static generateKruskalMaze(rows, cols) {
        // Initialize full grid with walls (1)
        const maze = Array(rows).fill(null).map(() => Array(cols).fill(1));
        const walk_tiles = [];
        const uf = new UnionFind(rows * cols);
        this.openSpaces = [];

        // Define cells (odd indices) and potential walk_tiles (even indices between cells)
        for (let r = 1; r < rows - 1; r += 2) {
            for (let c = 1; c < cols - 1; c += 2) {
                maze[r][c] = 0; // Carve out the isolated cell
                this.openSpaces.push({ r, c });

                // Add edge to the right
                if (c + 2 < cols) {
                    walk_tiles.push({ r, c: c + 1, cell1: { r, c }, cell2: { r, c: c + 2 } });
                }
                // Add edge downwards
                if (r + 2 < rows) {
                    walk_tiles.push({ r: r + 1, c, cell1: { r, c }, cell2: { r: r + 2, c } });
                }
            }
        }

        // Shuffle walk_tiles randomly to create the random maze pattern
        walk_tiles.sort(() => Math.random() - 0.5);

        // Apply Kruskal's algorithm
        for (const edge of walk_tiles) {
            const index1 = edge.cell1.r * cols + edge.cell1.c;
            const index2 = edge.cell2.r * cols + edge.cell2.c;

            // If the cells are not already connected, remove the wall
            if (uf.union(index1, index2)) {
                maze[edge.r][edge.c] = 0; 
                this.openSpaces.push({ r: edge.r, c: edge.c });
            }
        }

        // Create the Exit at the bottom row
        // Find a random walkable cell on the second-to-last row
        const bottomPaths = this.openSpaces.filter(space => space.r === rows - 2);
        const exitPath = bottomPaths[Math.floor(Math.random() * bottomPaths.length)];

        // Break the wall on the bottom boundary
        maze[rows - 1][exitPath.c] = 0;
        this.exitPoint = { r: rows - 1, c: exitPath.c };
        //A check to see if there are even any exits.
        console.log(`Exit Grid: Row ${this.exitPoint.r}, Col ${this.exitPoint.c}`);
        this.blueprint = maze;
        return maze;
    }

    // Helper to get random spawn locations for the objects in the maze.
    static getRandomSpaces(count) {
        const shuffled = [...this.openSpaces].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    //another function to make extra extra sure that there actually is an exit or to make sure my gun spawns on a walkable tile.
    static isPath(r, c) {
    // Check bounds first to prevent errors
    if (r < 0 || r >= this.blueprint.length || c < 0 || c >= this.blueprint[0].length) {
        return false;
    }
    return this.blueprint[r][c] === 0;
}
}