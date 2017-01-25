function Grunt(index, game, player, bullets, x, y) {
    this.game = game;
    this.player = player;
    this.bullets = bullets;
    this.health = 3;
    this.fireRate = 1000;
    this.nextFire = 0;
    this.alive = true;

    this.grunt = game.add.sprite(x, y, 'grunt');
    this.grunt.anchor.setTo(0.5);
    this.grunt.animations.add('draw');
    this.grunt.animations.play('draw', 15, true);

    this.grunt.name = index;
    game.physics.enable(this.grunt, Phaser.Physics.ARCADE);
}

Grunt.prototype.damage = function() {
    this.health -= playerDamage;

    if (this.health <= 0) {
        this.alive = false;
        //this.grunt.kill();
        return true;
    }
    return false;
};

Grunt.prototype.update = function(player, enemies) {
    this.player = player;
    var distance = this.game.physics.arcade.distanceBetween(this.grunt, this.player);
    if (distance < 300) {

        //approach the player without stepping into other grunts
        var approachAng = this.game.math.angleBetween(this.grunt.x, this.grunt.y, this.player.x, this.player.y);
        var avoidDist = 150; //closest allowed to get to other enemies
        var minDist = 150; //closest allowed to get to player
        var avoidAngle = 0;
        for (var i = 0; i < enemies.length; i++) {
            if (this.grunt == enemies[i].grunt)
                break;
            if (avoidAngle !== 0)
                break;
            var dist = this.game.physics.arcade.distanceBetween(this.grunt, enemies[i].grunt);
            if (dist < avoidDist) {
                avoidAngle = Math.PI / 2;
                if (Phaser.Utils.chanceRoll(50))
                    avoidAngle += -1;
            }
        }
        approachAng += avoidAngle;
        if (distance > minDist) {
            this.grunt.body.velocity.x = Math.cos(approachAng) * 125;
            this.grunt.body.velocity.y = Math.sin(approachAng) * 125;
        }
        else {
            this.grunt.body.velocity.setTo(0, 0);
        }
        //shoot the bullets
        if (this.game.time.now > this.nextFire && this.bullets.countDead() > 0 && isPlayerAlive) {
            this.nextFire = this.game.time.now + this.fireRate;

            var bullet = this.bullets.getFirstDead();

            bullet.reset(this.grunt.x, this.grunt.y);
            bullet.animations.add('draw');
            bullet.play('draw', 15, true);

            bullet.rotation = this.game.physics.arcade.moveToObject(bullet, this.player, 500);
            game.sound.play('bullet-fire', sfxVol);
        }
    }
};

var game = new Phaser.Game(800, 600, Phaser.AUTO, '');
var sfxVol = 1;
var musicVol = 1;
var health = 8;
var playerFireRate = 1000;
var playerNextFire = 0;
var playerDamage = 1;
var playerTransformations = [];
var currentTransformation = 'player_square';
var playerItems = [];
var isPlayerAlive = true;
var isInvulnerable = false;
var currentLevel = 0;
var MIN_FIRE_RATE = 100;
var MAX_DAMAGE = 4;
var MAX_HEALTH = 8;

function reset() {
    health = 8;
    playerFireRate = 1000;
    playerNextFire = 0;
    playerDamage = 1;
    playerTransformations = [];
    playerItems = [];
    isPlayerAlive = true;
    isInvulnerable = false;
    currentLevel = 0;
    game.state.start('Game');
}

function advance() {
    isInvulnerable = false;
    currentLevel++;
    game.state.start('Game');
}

var Dungeon = {
        //Dungeon creation algorithm based off of https://github.com/plissken2013es/phaserRandomDungeon
        create: function() {
            game.physics.startSystem(Phaser.Physics.ARCADE);
            game.world.setBounds(0, 0, 4200, 4200);
            game.physics.arcade.sortDirection = Phaser.Physics.Arcade.SORT_NONE;

            this.erase = game.sound.add('erase', sfxVol);

            this.keyboard = game.input.keyboard;

            this.walls = game.add.group();
            this.walls.enableBody = true;
            this.walls.physicsBodyType = Phaser.Physics.ARCADE;
            this.floors = game.add.group();
            this.items = game.add.group();

            this.room_max = 8;
            this.room_min = 4;
            this.max_rooms = this.rand(8, 16);
            this.roomCenters = [];
            this.roomCoords = [];
            this.rooms = [];

            this.lastRoom = {
                x: 0,
                y: 0
            };
            this.numRooms = 0;

            this.exit = {};
            this.exit = game.add.sprite(this.exit.x, this.exit.y, 'exit');
            this.exit.anchor.setTo(0.5);
            this.exit.animations.add('draw');
            this.exit.animations.play('draw', 15, true);
            game.physics.arcade.enable(this.exit);

            this.enemyBullets = game.add.group();
            this.enemyBullets.enableBody = true;
            this.enemyBullets.physicsBodyType = Phaser.Physics.ARCADE;
            this.enemyBullets.createMultiple(100, 'enemy-bullet');

            this.enemyBullets.setAll('anchor.x', 0.5);
            this.enemyBullets.setAll('anchor.y', 0.5);
            this.enemyBullets.setAll('outOfBoundsKill', true);
            this.enemyBullets.setAll('checkWorldBounds', true);

            this.bullets = game.add.group();
            this.bullets.enableBody = true;
            this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
            this.bullets.createMultiple(100, 'bullet');

            this.bullets.setAll('anchor.x', 0.5);
            this.bullets.setAll('anchor.y', 0.5);
            this.bullets.setAll('outOfBoundsKill', true);
            this.bullets.setAll('checkWorldBounds', true);

            this.player = {};


            this.enemies = [];
            this.enemiesTotal = this.rand(12, 25);
            this.enemiesAlive;

            this.itemsTotal = this.rand(8, 12);

            this.makeMap();
            this.populate();
            this.enemiesAlive = this.enemies.length;

            this.player = game.add.sprite(this.player.x, this.player.y, currentTransformation);

            this.player.animations.add('draw', [0, 1, 2, 3, 99]); //player's idle animation after having changed
            this.player.animations.add('change', Phaser.ArrayUtils.numberArrayStep(4, 100)); //player animation for transformation
            this.player.animations.add('erase', Phaser.ArrayUtils.numberArrayStep(99, 115)); //player's death animation
            this.player.animations.play('draw', 15, true);
            this.player.anchor.setTo(0.5);
            game.physics.arcade.enable(this.player);
            this.player.body.setSize(70, 70);
            this.healthPos = 8 - health;
            this.healthUI = game.add.sprite(50, 50, 'health', this.healthPos);
            this.healthUI.fixedToCamera = true;
            this.damagenotif = game.add.sprite(game.world.centerX, game.world.centerY + 150, 'damagenotif');
            this.frnotif = game.add.sprite(game.world.centerX, game.world.centerY + 150, 'frnotif');
            this.damagenotif.fixedToCamera = true;
            this.frnotif.fixedToCamera = true;
            this.damagenotif.kill();
            this.frnotif.kill();

            game.camera.follow(this.player, Phaser.Camera.FOLLOW_TOPDOWN_TIGHT);
        },
        rand: function(min, max) {
            return Math.floor(Math.random() * (max - min)) + min;
        },
        populate: function() {
            //fill map with enemies
            var entityMap = [];

            this.exit.x = this.roomCenters[this.numRooms - 1].x;
            this.exit.y = this.roomCenters[this.numRooms - 1].y;

            entityMap.push({
                x: this.exit.x,
                y: this.exit.y
            });

            for (var i = 0; i < this.enemiesTotal; i++) {
                var randIndex = this.rand(0, this.roomCoords.length - 1);
                var randX = this.roomCoords[randIndex].x + 50;
                var randY = this.roomCoords[randIndex].y + 50;
                while (this.roomCoords[randIndex].room === 0) {
                    randIndex = this.rand(1, this.roomCoords.length - 1);
                    randX = this.roomCoords[randIndex].x + 50;
                    randY = this.roomCoords[randIndex].y + 50;
                }
                if (entityMap.length > 0) {
                    for (var j = 0; j < entityMap.length; j++) {
                        if (randX === entityMap[j].x && randY === entityMap[j].y) {
                            randIndex = this.rand(1, this.roomCoords.length - 1);
                            randX = this.roomCoords[randIndex].x + 50;
                            randY = this.roomCoords[randIndex].y + 50;
                        }
                    }
                }
                this.enemies.push(new Grunt(i, game, this.player, this.enemyBullets, randX, randY));
                game.physics.arcade.overlap(this.enemies[i].grunt, this.walls, function(grunt, wall) {
                    grunt.x -= wall.body.overlapX;
                    grunt.y -= wall.body.overlapY;
                });
                entityMap.push({
                    x: this.enemies[i].grunt.x,
                    y: this.enemies[i].grunt.y
                });
            }
            //fill map with items
            for (var i = 0; i < this.itemsTotal; i++) {
                var item;
                var randIndex = this.rand(0, this.roomCoords.length - 1);
                var randX = this.roomCoords[randIndex].x + 50;
                var randY = this.roomCoords[randIndex].y + 50;
                while (this.roomCoords[randIndex].room === 0) {
                    randIndex = this.rand(1, this.roomCoords.length - 1);
                    randX = this.roomCoords[randIndex].x + 50;
                    randY = this.roomCoords[randIndex].y + 50;
                }
                if (entityMap.length > 0) {
                    for (var j = 0; j < entityMap.length; j++) {
                        if (randX === entityMap[j].x && randY === entityMap[j].y) {
                            randIndex = this.rand(1, this.roomCoords.length - 1);
                            randX = this.roomCoords[randIndex].x + 50;
                            randY = this.roomCoords[randIndex].y + 50;
                        }
                    }
                }
                if (Phaser.Utils.chanceRoll(50)) {
                    item = this.items.create(randX, randY, 'damageIncrease');
                }
                else {
                    item = this.items.create(randX, randY, 'fireRateUp');
                }
                game.physics.arcade.enable(item);
            }
    },
    // Room: function(x, y, w, h) {
    //     this.x1 = x;
    //     this.y1 = y;
    //     this.x2 = x + w;
    //     this.y2 = y + h;

    //     var center_x = (this.x1 + this.x2) / 2;
    //     var center_y = (this.y1 + this.y2) / 2;
    //     this.center_coords = {
    //         x: center_x,
    //         y: center_y
    //     };
    // },
    createFloor: function(x, y) {
        var fl = this.floors.create(x, y, 'floor');
        game.physics.arcade.enable(fl);
        game.physics.arcade.overlap(fl, this.walls, function(floor, wall) {
            wall.destroy();
        });
    },

    createRoom: function(x1, x2, y1, y2, roomNum) {
        for (var x = x1; x < x2; x += 100) {
            for (var y = y1; y < y2; y += 100) {
                this.createFloor(x, y);
                this.roomCoords.push({
                    x: x,
                    y: y,
                    room: roomNum
                });
            }
        }
    },

    createHTunnel: function(x1, x2, y) {
        var min = Math.min(x1, x2);
        var max = Math.max(x1, x2);
        for (var x = min; x < max + 100; x += 100) {
            this.createFloor(x, y);
        }
    },

    createVTunnel: function(y1, y2, x) {
        var min = Math.min(y1, y2);
        var max = Math.max(y1, y2);
        for (var y = min; y < max + 100; y += 100) {
            this.createFloor(x, y);
        }
    },

    makeMap: function() {
        //fill the world with walls
        for (var y = 0; y < game.world.height; y += 100) {
            for (var x = 0; x < game.world.width; x += 100) {
                var wall = this.walls.create(x, y, 'wall');
                wall.body.immovable = true;
                wall.animations.add('draw');
                wall.play('draw', 15, true);
            }
        }
        //carving out the rooms
        for (var r = 0; r < this.max_rooms; r++) {
            var w = this.rand(this.room_min, this.room_max) * 100;
            var h = this.rand(this.room_min, this.room_max) * 100;
            x = this.rand(1, ((game.world.width / 100) - (w / 100 + 1))) * 100;
            y = this.rand(1, ((game.world.height / 100) - (h / 100 + 1))) * 100;
            this.createRoom(x, x + w, y, y + h, this.numRooms);
            if (this.numRooms === 0) {
                this.player.x = x + (w / 2);
                this.player.y = y + (h / 2);
            }
            else {
                var new_x = game.math.snapToFloor(x + (w / 2), 100);
                var new_y = game.math.snapToFloor(y + (h / 2), 100);
                var prev_x = game.math.snapToFloor(this.lastRoom.x, 100);
                var prev_y = game.math.snapToFloor(this.lastRoom.y, 100);
                this.createHTunnel(prev_x, new_x, prev_y);
                this.createVTunnel(prev_y, new_y, new_x);
            }
            this.lastRoom = {
                x: x + (w / 2),
                y: y + (h / 2)
            };
            this.roomCenters.push(this.lastRoom);
            this.numRooms++;
        }
    },
    update: function() {
        this.game.physics.arcade.TILE_BIAS = 40;
        game.physics.arcade.collide(this.walls, this.player);
        game.physics.arcade.overlap(this.player, this.items, this.itemsHandler, null, this);
        game.physics.arcade.overlap(this.enemyBullets, this.player, this.bulletHitPlayer, null, this);
        game.physics.arcade.overlap(this.exit, this.player, this.exitLevel, null, this);
        game.physics.arcade.overlap(this.enemyBullets, this.walls, this.bulletHitWall, null, this);
        game.physics.arcade.overlap(this.bullets, this.walls, this.bulletHitWall, null, this);
        for (var i = 0; i < this.enemies.length; i++) {
            if (this.enemies[i].alive) {
                game.physics.arcade.collide(this.player, this.enemies[i].grunt);
                game.physics.arcade.collide(this.enemies[i].grunt, this.walls);
                game.physics.arcade.overlap(this.bullets, this.enemies[i].grunt, this.bulletHitEnemy, null, this);
                game.physics.arcade.overlap(this.enemies[i].grunt, this.walls, function(grunt, wall) {
                    grunt.x -= wall.body.overlapX;
                    grunt.y -= wall.body.overlapY;
                });
                this.enemies[i].update(this.player, this.enemies);
            }
            else {
                this.enemiesAlive--;
            }
        }

        //set horizontal movement to left and right arrow keys
        if (isPlayerAlive){
        if (this.keyboard.isDown(Phaser.KeyCode.LEFT)) {
            this.player.body.velocity.x = -175;
        }
        else if (this.keyboard.isDown(Phaser.KeyCode.RIGHT)) {
            this.player.body.velocity.x = 175;
        }
        else {
            this.player.body.velocity.x = 0;
        }
        //set vertical movement to up and down arrow keys        
        if (this.keyboard.isDown(Phaser.KeyCode.UP)) {
            this.player.body.velocity.y = -175;
        }
        else if (this.keyboard.isDown(Phaser.KeyCode.DOWN)) {
            this.player.body.velocity.y = 175;
        }
        else {
            this.player.body.velocity.y = 0;
        }
        //TODO add player shooting input
        if (game.input.activePointer.isDown) {
            if (game.time.now > playerNextFire && this.bullets.countDead() > 0) {
                playerNextFire = game.time.now + playerFireRate;

                var bullet = this.bullets.getFirstDead();

                bullet.reset(this.player.x, this.player.y);
                bullet.animations.add('draw');
                bullet.play('draw', 15, true);

                bullet.rotation = this.game.physics.arcade.moveToPointer(bullet, 500);
                game.sound.play('bullet-fire', sfxVol);
            }
        }
        }
    },
    bulletHitEnemy: function(enemy, bullet) {
        bullet.kill();
        var destroyed = this.enemies[enemy.name].damage();
        if (destroyed) {
            //TODO add death animation
            if (Phaser.Utils.chanceRoll(25)) {
                var item = this.items.create(enemy.x, enemy.y, 'healthup');
                game.physics.arcade.enable(item);
            }
            enemy.kill();
        }
    },
    bulletHitPlayer: function(player, bullet) {
        bullet.kill();
        //TODO make player take damage
        if (!isInvulnerable) {
            health -= 1;
            this.healthUI.frame++;
        }
        if (health <= 0) {
            isPlayerAlive = false;
            isInvulnerable = true;
            game.physics.arcade.isPaused = true;
            this.erase.play();
            player.play('erase', 15, false, true);
            game.physics.arcade.isPaused = false;
            this.erase.onStop.add(function(sound) {
                game.state.start('GameOver');
            });
        }
    },
    bulletHitWall: function(bullet, wall) {
        bullet.kill();
    },
    exitLevel: function(exit, player) {
        isInvulnerable = true;
        this.erase.play();
        player.play('erase', 15, false, true);
                    this.erase.onStop.add(function(sound) {
                game.state.start('Complete');
            });
    },
    itemsHandler: function(player, item) {
        if (item.key === 'damageIncrease' && playerDamage < MAX_DAMAGE) {
            playerDamage += .5;
            if(this.frnotif.alive){
                this.frnotif.kill();
            }
            if(!this.damagenotif.alive){
                this.damagenotif.revive();
                game.time.events.add(2000, this.damagenotif.kill);
            }
            
        }
        else if (item.key === 'fireRateUp' && playerFireRate > MIN_FIRE_RATE) {
            playerFireRate /= 2;
                        if(this.damagenotif.alive){
                this.damagenotif.kill();
            }
            if(!this.frnotif.alive){
                this.frnotif.revive();
                game.time.events.add(2000, this.frnotif.kill);
            }
        }
        else if (item.key === 'healthup' && health < MAX_HEALTH) {
            health++;
            this.healthUI.frame--;
        }
        item.kill();

    }
};
var GameOverState = {
    create: function() {
        game.world.setBounds(0, 0, 800, 600);
        this.floors = game.add.group();
        for (var y = 0; y < game.world.height; y += 100) {
            for (var x = 0; x < game.world.width; x += 100) {
                this.floors.create(x, y, 'floor');
            }
        }
        this.title = game.add.sprite(game.world.centerX, 60, 'youdied');
        this.title.anchor.setTo(0.5);
        this.title.animations.add('jitter');
        this.title.play('jitter', 15, true);
        this.tryagain = game.add.button(game.world.centerX, game.world.centerY, 'tryagain', reset, this);
        this.tryagain.anchor.setTo(0.5);
        this.tryagain.animations.add('jitter');
    },
    update: function() {
        this.tryagain.events.onInputOver.add(function(button, cursor) {
            button.play('jitter', 15, true);
        });
        this.tryagain.events.onInputOut.add(function(button, cursor) {
            button.animations.stop('jitter');
        });
    }
};
var MainMenuState = {
    create: function() {
        game.world.setBounds(0, 0, 800, 600);
        this.floors = game.add.group();
        for (var y = 0; y < game.world.height; y += 100) {
            for (var x = 0; x < game.world.width; x += 100) {
                this.floors.create(x, y, 'floor');
            }
        }
        this.title = game.add.sprite(game.world.centerX, 60, 'title');
        this.title.anchor.setTo(0.5);
        this.title.animations.add('jitter');
        this.title.play('jitter', 15, true);
        this.start = game.add.button(game.world.centerX, game.world.centerY, 'start', reset, this);
        this.start.anchor.setTo(0.5);
        this.start.animations.add('jitter');
    },
    update: function() {
        this.start.events.onInputOver.add(function(button, cursor) {
            button.play('jitter', 15, true);
        });
        this.start.events.onInputOut.add(function(button, cursor) {
            button.animations.stop('jitter');
        });
    }
};
var CompletedState = {
    create: function() {
        game.world.setBounds(0, 0, 800, 600);
        this.floors = game.add.group();
        for (var y = 0; y < game.world.height; y += 100) {
            for (var x = 0; x < game.world.width; x += 100) {
                this.floors.create(x, y, 'floor');
            }
        }
        this.title = game.add.sprite(game.world.centerX, 60, 'levelcomplete');
        this.title.anchor.setTo(0.5);
        this.title.animations.add('jitter');
        this.title.play('jitter', 15, true);
        this.start = game.add.button(game.world.centerX, game.world.centerY, 'start', advance, this);
        this.start.anchor.setTo(0.5);
        this.start.animations.add('jitter');
    },
    update: function() {
        this.start.events.onInputOver.add(function(button, cursor) {
            button.play('jitter', 15, true);
        });
        this.start.events.onInputOut.add(function(button, cursor) {
            button.animations.stop('jitter');
        });
    }
};
var BootState = {
    preload: function() {
        game.load.bitmapFont('baskerville', './assets/baskerville_0.png', './assets/baskerville.xml');
        game.load.spritesheet('title', './assets/title.png', 401, 121);
        game.load.spritesheet('tryagain', './assets/tryagain.png', 288, 121);
        game.load.spritesheet('start', './assets/start.png', 288, 121);
        game.load.spritesheet('options', './assets/options.png', 288, 121);
    },
    create: function() {
        game.state.start('Load');
    }
};
var LoadState = {
    preload: function() {
        var loadLabel = game.add.bitmapText(80, 150, 'baskerville', 'Loading...', 32);
        game.load.spritesheet('player_square', './assets/player_square.png', 70, 70);
        game.load.spritesheet('wall', './assets/wall_scribble.png', 100, 100);
        game.load.image('floor', './assets/floor_graph.png');
        game.load.spritesheet('bullet', './assets/player_bullet.png', 16, 16);
        game.load.spritesheet('enemy-bullet', './assets/enemy_bullet.png', 16, 16);
        game.load.spritesheet('grunt', './assets/enemy_square.png', 70, 70);
        game.load.spritesheet('youdied', './assets/youdied.png', 401, 121);
        game.load.spritesheet('damagenotif', './assets/damagenotif.png', 401, 121);
        game.load.spritesheet('frnotif', './assets/frnotif.png', 401, 121);
        game.load.spritesheet('damageIncrease', './assets/damageIncrease.png', 50, 50);
        game.load.spritesheet('fireRateUp', './assets/fireRateUp.png', 50, 50);
        game.load.spritesheet('healthup', './assets/healthup.png', 50, 50);
        game.load.spritesheet('health', './assets/health.png', 100, 100);
        game.load.spritesheet('exit', './assets/exit.png', 100, 100);
        game.load.spritesheet('levelcomplete', './assets/levelcomplete.png', 401, 121);
        game.load.audio('bullet-fire', './assets/fire_bullet.ogg');
        game.load.audio('erase', './assets/erase.ogg');
        game.sound.add('bullet-fire', sfxVol);

    },
    create: function() {
        game.state.start('MainMenu');
    }
};
game.state.add('Boot', BootState);
game.state.add('Load', LoadState);
game.state.add('Game', Dungeon);
game.state.add('GameOver', GameOverState);
game.state.add('MainMenu', MainMenuState);
game.state.add('Complete', CompletedState);
game.state.start('Boot');