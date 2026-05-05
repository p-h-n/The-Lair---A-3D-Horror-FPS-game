import { MazeMaker } from './maze_generation.js'
export class Enemy{
  constructor(x,z, y, speed){
    this.x = x * MazeMaker.WALL_SIZE;//Multiplier for world coordinates.
    this.z = z * MazeMaker.WALL_SIZE;//Multiplier for world coordinates.
    this.y = y;//y doesn't change
    this.speed = speed;//speed of Seekers
    this.isArmed = true;
    this.hp = 10;//maxHp = hp until it gets shot.
    this.maxHp = 10;
    /* These guys look useless but Imma keep em for now. 
    I genuinely don't want to touch anything.*/
    this.active = true;
    this.trigDist = 6.0;
    this.safeDist = 8.0;
  }

  updateScared(playerX, playerZ, audioCallback){
    const d = Math.hypot(this.x - playerX, this.z - playerZ);
    if(this.isArmed && d < this.trigDist){
      audioCallback();
      this.isArmed = false;
    }
    if(!this.isArmed && d > this.safeDist){
      this.isArmed = true;
    }

  }
/* This project is so massive that I am not entirely sure
that these functions are even bein used, however, since my game
is functioning and working, I'm not going to touch them. */
  getSpeed(){
    const s = this.speed;

    return s;
  }

  getX(){
    const x = this.x;
    return x;
  }
  getZ(){
    const z = this.z;
    return z;
  }
  //function to deduct the health when hit by a bullet.
  takeDamage(amount){
      this.hp -= amount;
      if(this.hp <= 0){
        this.hp = 0;
        this.active = false;
      }
  }
  //function to respawn at the WORLD coordinates. Grid coords != World coords
  respawn(spawnX, spawnZ){
    this.x = spawnX;
    this.z = spawnZ;
    this.hp = this.maxHp;
    this.active = true;
  }
}