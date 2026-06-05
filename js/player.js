/* 
* @author Niklas von Hertzen <niklas at hertzen.com>
* @created 4.1.2012 
* @website http://hertzen.com
 */



GTA.Player = function ( game, x, y, z ) {

    
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;

    this.registerAnimations( game.spriteNumbers.offset.PED );
    
    this.initPhysics( game );
    
    
    var geom = THREE.GeometryUtils.clone( game.sprites[ this.animationSprites[ 0 ][ 0 ] ].sprite.geometry );
    
    this.sprite = new THREE.Mesh( geom, game.sprites[ this.animationSprites[ 0 ][ 0 ] ].sprite.material );
    
    //this.sprite = THREE.SceneUtils.cloneObject( game.sprites[ this.animationSprites[ 0 ][ 0 ] ].sprite );

    //this.sprite.geometry = THREE.GeometryUtils.clone( this.sprite.geometry );
    this.sprite.geometry.dynamic = true; 
    
    this.spriteAnimator = new GTA.SpriteAnimation( game, this.animationSprites[ 0 ][ 0 ], this.sprite ); 

    this.game =  game;

    this.add( this.sprite );
    this.speed = 700;
    this.rotationSpeed = 0.1;
    this.vehicle = null;
    this.vehicleUseDown = false;
    this.vehicleReverse = false;
    this.vehicleBoost = false;
    this.vehicleSpeed = 9;
    this.vehicleReverseSpeed = 5;
    this.vehicleTurnSpeed = 0.055;
    
 
    
    this.weapon = 0;
    
    this.lastframe = 0;
    
    this.runningFrames = [];
    this.spriteframe = 0;
    
   
    
    
    
    
    this.domElement = document;
    
    
    this.onKeyDown = function ( event ) {
        switch( event.keyCode ) {

            case 38: /*up*/
            case 87: /*W*/
                this.moveForward = true;
                break;

            case 37: /*left*/
            case 65: /*A*/
                this.turnLeft = true;
                break;

            case 40: /*down*/
            case 83: /*S*/
                if (this.vehicle !== null) {
                    this.vehicleBoost = true;
                } else {
                    this.moveBackward = true;
                }
                break;

            case 39: /*right*/
            case 68: /*D*/
                this.turnRight = true;
                break;

            case 82: /*R*/
                if (this.vehicle !== null) {
                    this.vehicleReverse = true;
                } else {
                    this.moveUp = true;
                }
                break;
            case 70: /*F*/
                this.moveDown = true;
                break;
            case 69: /*E*/
                if (!this.vehicleUseDown) {
                    this.vehicleUseDown = true;
                    this.toggleVehicle();
                }
                break;

            case 81: /*Q*/
                this.freeze = !this.freeze;
                break;

        }
        
    };
    
    this.onKeyUp = function ( event ) {

        switch( event.keyCode ) {

            case 38: /*up*/
            case 87: /*W*/
                this.moveForward = false;
                break;

            case 37: /*left*/
            case 65: /*A*/
                this.turnLeft = false;
                break;

            case 40: /*down*/
            case 83: /*S*/
                this.moveBackward = false;
                this.vehicleBoost = false;
                break;

            case 39: /*right*/
            case 68: /*D*/
                this.turnRight = false;
                break;

            case 82: /*R*/
                this.moveUp = false;
                this.vehicleReverse = false;
                break;
            case 70: /*F*/
                this.moveDown = false;
                break;
            case 69: /*E*/
                this.vehicleUseDown = false;
                break;

        }

    };
    
    
    this.domElement.addEventListener( 'keydown', bind( this, this.onKeyDown ), false );
    this.domElement.addEventListener( 'keyup', bind( this, this.onKeyUp ), false );
    
    
};


function bind( scope, fn ) {

    return function () {

        fn.apply( scope, arguments );

    };

};

GTA.Player.prototype = GTA.Pedestrian.prototype;
GTA.Player.prototype.constructor = GTA.Player;

GTA.Player.prototype.toggleVehicle = function () {
    if (this.vehicle !== null) {
        this.exitVehicle();
    } else {
        this.enterNearestVehicle();
    }
};

GTA.Player.prototype.enterNearestVehicle = function () {
    var activeObjects = this.game.activeObjects,
        nearest = null,
        nearestDistance = 260,
        hijacked,
        i,
        vehicle,
        dx,
        dy,
        distance;

    for (i = 0; i < activeObjects.length; i += 1) {
        vehicle = activeObjects[i];

        if (vehicle.physics === undefined || this.game.cars[vehicle.type] === undefined) {
            continue;
        }

        dx = vehicle.sprite.position.x - this.position.x;
        dy = vehicle.sprite.position.y - this.position.y;
        distance = Math.sqrt((dx * dx) + (dy * dy));

        if (distance < nearestDistance) {
            nearest = vehicle;
            nearestDistance = distance;
        }
    }

    if (this.game.npcManager !== undefined && this.game.npcManager.hijackNearestCar !== undefined) {
        hijacked = this.game.npcManager.hijackNearestCar(this.position.x, this.position.y, nearestDistance);

        if (hijacked !== null) {
            nearest = hijacked;
        }
    }

    if (nearest === null) {
        return;
    }

    this.enterVehicle(nearest);
};

GTA.Player.prototype.enterVehicle = function (vehicle) {
    if (vehicle === null) {
        return;
    }

    this.vehicle = vehicle;
    this.sprite.visible = false;
    this.physics.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));

    if (this.physics.SetActive !== undefined) {
        this.physics.SetActive(false);
    }
};

GTA.Player.prototype.exitVehicle = function () {
    var vehicle = this.vehicle,
        angle,
        exitX,
        exitY;

    if (vehicle === null) {
        return;
    }

    angle = vehicle.physics.GetAngle();
    exitX = (vehicle.physics.GetPosition().x * GTA.PhysicsScale) - (Math.sin(angle) * 58);
    exitY = -(vehicle.physics.GetPosition().y * GTA.PhysicsScale) + (Math.cos(angle) * 58);

    this.vehicle = null;
    this.sprite.visible = true;
    this.movePedestrian(exitX, exitY, 0);

    if (GTA.Audio !== undefined) {
        GTA.Audio.setDriving(false);
    }

    if (this.physics.SetPosition !== undefined) {
        this.physics.SetPosition(new Box2D.Common.Math.b2Vec2(exitX / GTA.PhysicsScale, -exitY / GTA.PhysicsScale));
    }

    if (this.physics.SetLinearVelocity !== undefined) {
        this.physics.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));
    }

    if (this.physics.SetActive !== undefined) {
        this.physics.SetActive(true);
    }
};

GTA.Player.prototype.updateVehicle = function (delta) {
    var vehicle = this.vehicle,
        angle,
        driveAngle,
        speed = 0,
        velocity;

    if (vehicle === null || vehicle.physics === undefined) {
        this.vehicle = null;
        this.sprite.visible = true;
        return;
    }

    angle = vehicle.physics.GetAngle();

    if (this.turnLeft) {
        vehicle.physics.SetAngle(angle - this.vehicleTurnSpeed);
        angle = vehicle.physics.GetAngle();
    }

    if (this.turnRight) {
        vehicle.physics.SetAngle(angle + this.vehicleTurnSpeed);
        angle = vehicle.physics.GetAngle();
    }

    if (this.moveForward) {
        speed = this.vehicleSpeed * (this.vehicleBoost ? 2 : 1);
    } else if (this.vehicleReverse) {
        speed = -this.vehicleReverseSpeed;
    }

    driveAngle = angle + 1.57079633;

    if (speed !== 0 && this.vehicleWillCrash(driveAngle, speed)) {
        speed = 0;

        if (GTA.Audio !== undefined) {
            GTA.Audio.playCrash();
        }
    }

    if (GTA.Audio !== undefined) {
        GTA.Audio.setDriving(speed !== 0);
    }

    velocity = new Box2D.Common.Math.b2Vec2(
        speed * Math.cos(driveAngle),
        speed * Math.sin(driveAngle)
    );

    vehicle.physics.SetLinearVelocity(velocity);
    this.movePedestrian(
        vehicle.physics.GetPosition().x * GTA.PhysicsScale,
        -vehicle.physics.GetPosition().y * GTA.PhysicsScale,
        0
    );
};

GTA.Player.prototype.vehicleWillCrash = function (driveAngle, speed) {
    var distance = speed > 0 ? 86 : -86,
        x = this.vehicle.physics.GetPosition().x * GTA.PhysicsScale + Math.cos(driveAngle) * distance,
        y = -(this.vehicle.physics.GetPosition().y * GTA.PhysicsScale) + Math.sin(driveAngle) * distance,
        blockX = Math.round(x / 64),
        blockY = Math.round(-y / 64),
        column,
        block;

    if (this.game.map.base[blockX] === undefined || this.game.map.base[blockX][blockY] === undefined) {
        return true;
    }

    column = this.game.map.base[blockX][blockY];
    block = column.blocks[2] || column.blocks[column.blocks.length - 1];

    return block === undefined || block.type === 0 || block.type === 1 || block.type === 5;
};

