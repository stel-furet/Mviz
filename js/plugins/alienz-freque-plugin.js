/**
 * AlienZ - Classic Arcade Alien Invasion Visualizer
 * 
 * Audio-reactive Space Invaders style visualization with pixelated sprites,
 * two-state animation, and classic arcade gameplay mechanics.
 * 
 * @version 1.0.0
 * @author Freque Plugin (converted from Space Invaders Remix v1.5)
 */

class AlienZ extends FrequePluginBase {
    constructor(visualizer) {
        super('alienz', visualizer, {
            version: '1.0.0',
            author: 'Freque Plugin',
            description: 'Classic arcade alien invasion with audio-reactive movement and combat',
            targetFPS: 60,
            dialFillColor: '--accent-secondary'
        });
        
        // Game state arrays
        this.aliens = [];
        this.lasers = [];
        this.explosions = [];
        this.barriers = [];
        this.stars = [];
        
        // Game stats
        this.score = 0;
        this.wave = 1;
        this.lives = 3;
        this.shipAlive = true;
        this.shipRespawnTime = 0;
        
        // Ship position
        this.shipX = 0;
        this.shipTargetX = 0;
        
        // Alien movement state
        this.alienFrame = 0;
        this.alienDirection = 1;
        this.alienMoveX = 0;
        this.lastAlienAnim = 0;
        this.totalAliens = 0;
        
        // Audio data (populated from Freque)
        this.audioLevel = 0;
        this.bassLevel = 0;
        this.midLevel = 0;
        this.trebleLevel = 0;
        this.beatDetected = false;
        
        // Initialize control variables with default values
        this.alienSize = 40;
        this.alienCount = 33;
        this.moveSpeed = 1.0;
        this.dropDistance = 20;
        this.audioMoveAmount = 10;
        this.laserFreq = 30;
        this.explosionSizeParam = 50;
        this.starDens = 200;
        this.beatSens = 1.5;
        this.colorReactivity = 20;
        this.colorScheme = 'classic';
        this.displayScore = true;
        this.displayBarriers = true;
        this.displayShip = true;
        
        this.setupControls();
        this.setupPresets();
    }
    
    setupControls() {
        // Alien Grid Controls
        this.addControl('alienSize', {
            type: 'dial',
            label: 'Alien Size',
            min: 20,
            max: 80,
            step: 2,
            value: 40,
            onChange: (value) => {
                this.alienSize = value;
                if (this.canvas) {
                    this.recreateAliens();
                }
            }
        });
        
        this.addControl('alienCount', {
            type: 'dial',
            label: 'Alien Count',
            min: 20,
            max: 55,
            step: 1,
            value: 33,
            onChange: (value) => {
                this.alienCount = value;
                if (this.canvas) {
                    this.recreateAliens();
                }
            }
        });
        
        // Movement Controls
        this.addControl('moveSpeed', {
            type: 'dial',
            label: 'Move Speed',
            min: 0.5,
            max: 3.0,
            step: 0.1,
            value: 1.0,
            onChange: (value) => {
                this.moveSpeed = value;
            }
        });
        
        this.addControl('dropDistance', {
            type: 'dial',
            label: 'Drop Distance',
            min: 10,
            max: 50,
            step: 5,
            value: 20,
            onChange: (value) => {
                this.dropDistance = value;
            }
        });
        
        this.addControl('audioMove', {
            type: 'dial',
            label: 'Audio Move',
            min: 0,
            max: 30,
            step: 1,
            value: 10,
            onChange: (value) => {
                this.audioMoveAmount = value;
            }
        });
        
        // Effects Controls
        this.addControl('laserFrequency', {
            type: 'dial',
            label: 'Laser Frequency',
            min: 0,
            max: 100,
            step: 5,
            value: 30,
            onChange: (value) => {
                console.log('Laser Frequency changed to:', value);
                this.laserFreq = value;
            }
        });
        
        this.addControl('explosionSize', {
            type: 'dial',
            label: 'Explosion Size',
            min: 20,
            max: 100,
            step: 5,
            value: 50,
            onChange: (value) => {
                this.explosionSizeParam = value;
            }
        });
        
        this.addControl('starDensity', {
            type: 'dial',
            label: 'Star Density',
            min: 50,
            max: 500,
            step: 10,
            value: 200,
            onChange: (value) => {
                this.starDens = value;
                if (this.canvas) {
                    this.createStars();
                }
            }
        });
        
        this.addControl('beatSensitivity', {
            type: 'dial',
            label: 'Beat Sensitivity',
            min: 1.0,
            max: 3.0,
            step: 0.1,
            value: 1.5,
            onChange: (value) => {
                this.beatSens = value;
            }
        });
        
        this.addControl('colorReact', {
            type: 'dial',
            label: 'Color React %',
            min: 0,
            max: 50,
            step: 5,
            value: 20,
            onChange: (value) => {
                console.log('Color React changed to:', value);
                this.colorReactivity = value;
            }
        });
        
        // Color Scheme Dropdown
        this.addControl('colorScheme', {
            type: 'dropdown',
            label: 'Color Scheme',
            className: 'dropdown-selector-mixer',
            options: [
                { value: 'classic', label: 'Classic' },
                { value: 'rainbow', label: 'Rainbow' },
                { value: 'neon', label: 'Neon' },
                { value: 'retro', label: 'Retro' },
                { value: 'plasma', label: 'Plasma' },
                { value: 'monochrome', label: 'Monochrome' }
            ],
            value: 'classic',
            onChange: (value) => {
                console.log('Color scheme changed to:', value);
                this.colorScheme = value;
            }
        });
        
        // Display Toggles
        this.addControl('showScore', {
            type: 'checkbox',
            label: 'Show Score',
            value: true,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.displayScore = value;
            }
        });
        
        this.addControl('showBarriers', {
            type: 'checkbox',
            label: 'Show Barriers',
            value: true,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.displayBarriers = value;
            }
        });
        
        this.addControl('showShip', {
            type: 'checkbox',
            label: 'Show Ship',
            value: true,
            className: 'btn-primary-mixer',
            onChange: (value) => {
                this.displayShip = value;
            }
        });
    }
    
    setupPresets() {
        // Main presets
        this.addPreset('classic', {
            name: 'Classic',
            values: {
                alienSize: 40,
                alienCount: 33,
                moveSpeed: 0.8,
                dropDistance: 20,
                audioMove: 10,
                laserFrequency: 25,
                explosionSize: 50,
                starDensity: 200,
                beatSensitivity: 1.5,
                colorReact: 15,
                colorScheme: 'Classic',
                showScore: true,
                showBarriers: true,
                showShip: true
            }
        });
        
        this.addPreset('intense', {
            name: 'Intense',
            values: {
                alienSize: 35,
                alienCount: 45,
                moveSpeed: 2.0,
                dropDistance: 30,
                audioMove: 25,
                laserFrequency: 70,
                explosionSize: 80,
                starDensity: 350,
                beatSensitivity: 2.0,
                colorReact: 40,
                colorScheme: 'Neon',
                showScore: true,
                showBarriers: true,
                showShip: true
            }
        });
        
        this.addPreset('minimal', {
            name: 'Minimal',
            values: {
                alienSize: 50,
                alienCount: 20,
                moveSpeed: 0.6,
                dropDistance: 15,
                audioMove: 5,
                laserFrequency: 15,
                explosionSize: 40,
                starDensity: 100,
                beatSensitivity: 1.3,
                colorReact: 10,
                colorScheme: 'Monochrome',
                showScore: false,
                showBarriers: false,
                showShip: true
            }
        });
        
        // Color scheme presets with classic gameplay
        this.addPreset('classic-rainbow', {
            name: 'Classic Rainbow',
            values: {
                alienSize: 40,
                alienCount: 33,
                moveSpeed: 0.8,
                dropDistance: 20,
                audioMove: 10,
                laserFrequency: 25,
                explosionSize: 50,
                starDensity: 200,
                beatSensitivity: 1.5,
                colorReact: 15,
                colorScheme: 'Rainbow',
                showScore: true,
                showBarriers: true,
                showShip: true
            }
        });
        
        this.addPreset('classic-neon', {
            name: 'Classic Neon',
            values: {
                alienSize: 40,
                alienCount: 33,
                moveSpeed: 0.8,
                dropDistance: 20,
                audioMove: 10,
                laserFrequency: 25,
                explosionSize: 50,
                starDensity: 200,
                beatSensitivity: 1.5,
                colorReact: 15,
                colorScheme: 'Neon',
                showScore: true,
                showBarriers: true,
                showShip: true
            }
        });
        
        this.addPreset('classic-retro', {
            name: 'Classic Retro',
            values: {
                alienSize: 40,
                alienCount: 33,
                moveSpeed: 0.8,
                dropDistance: 20,
                audioMove: 10,
                laserFrequency: 25,
                explosionSize: 50,
                starDensity: 200,
                beatSensitivity: 1.5,
                colorReact: 15,
                colorScheme: 'Retro',
                showScore: true,
                showBarriers: true,
                showShip: true
            }
        });
        
        this.addPreset('classic-plasma', {
            name: 'Classic Plasma',
            values: {
                alienSize: 40,
                alienCount: 33,
                moveSpeed: 0.8,
                dropDistance: 20,
                audioMove: 10,
                laserFrequency: 25,
                explosionSize: 50,
                starDensity: 200,
                beatSensitivity: 1.5,
                colorReact: 15,
                colorScheme: 'Plasma',
                showScore: true,
                showBarriers: true,
                showShip: true
            }
        });
        
        this.addPreset('classic-monochrome', {
            name: 'Classic Monochrome',
            values: {
                alienSize: 40,
                alienCount: 33,
                moveSpeed: 0.8,
                dropDistance: 20,
                audioMove: 10,
                laserFrequency: 25,
                explosionSize: 50,
                starDensity: 200,
                beatSensitivity: 1.5,
                colorReact: 15,
                colorScheme: 'Monochrome',
                showScore: true,
                showBarriers: true,
                showShip: true
            }
        });
    }
    
    onInitialize() {
        // Initialize ship position at center
        this.shipX = this.canvas.width / 2;
        this.shipTargetX = this.canvas.width / 2;
        
        // Create initial game objects
        this.createAliens();
        this.createBarriers();
        this.createStars();
    }
    
    onResize(width, height) {
        // Update ship position for new canvas size
        this.shipX = width / 2;
        this.shipTargetX = width / 2;
        
        // Recreate barriers for new size
        this.createBarriers();
    }
    
    onUpdate(deltaTime, timestamp, sharedAudioData) {
        // Safety check - make sure canvas is ready
        if (!this.canvas || !this.aliens) {
            return;
        }
        
        // Update color morphing if active
        this.morphData = null;
        if (this.colorMorphing) {
            this.morphData = this.updateColorMorphing(deltaTime);
        }
        
        // Get audio data from Freque (direct access works fine)
        this.audioLevel = this.getAudioEnergy() || 0;
        this.bassLevel = (sharedAudioData.bass !== undefined) ? sharedAudioData.bass : 0;
        this.midLevel = (sharedAudioData.mid !== undefined) ? sharedAudioData.mid : 0;
        this.trebleLevel = (sharedAudioData.treble !== undefined) ? sharedAudioData.treble : 0;
        this.beatDetected = sharedAudioData.beat || false;
        
        // Update game logic
        this.updateAliens(deltaTime);
        this.updateLasers(deltaTime);
        this.updateExplosions(deltaTime);
        this.updateStars(deltaTime);
        this.updateShip();
    }
    
    onRender(deltaTime, timestamp, sharedAudioData) {
        // Safety check
        if (!this.canvas || !this.ctx) {
            return;
        }
        
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw layers (back to front)
        this.drawStars();
        
        if (this.displayBarriers && this.barriers && this.barriers.length > 0) {
            for (let barrier of this.barriers) {
                this.drawBarrier(barrier);
            }
        }
        
        if (this.aliens && this.aliens.length > 0) {
            for (let alien of this.aliens) {
                if (alien.alive) {
                    this.drawAlien(alien, alien.x, alien.y);
                }
            }
        }
        
        if (this.lasers && this.lasers.length > 0) {
            for (let laser of this.lasers) {
                this.drawLaser(laser);
            }
        }
        
        if (this.explosions && this.explosions.length > 0) {
            for (let explosion of this.explosions) {
                this.drawExplosion(explosion);
            }
        }
        
        if (this.displayShip) {
            this.drawShip();
        }
        
        if (this.displayScore) {
            this.drawScore();
        }
    }
    
    // ===== GAME OBJECT CREATION =====
    
    createAliens() {
        this.aliens = [];
        this.alienMoveX = 0;
        this.alienDirection = 1;
        
        // Calculate grid dimensions based on alien count
        const cols = Math.ceil(Math.sqrt(this.alienCount * 1.5));
        const rows = Math.ceil(this.alienCount / cols);
        
        const spacing = this.alienSize * 1.5;
        const gridWidth = (cols - 1) * spacing + this.alienSize;
        const startX = (this.canvas.width - gridWidth) / 2;
        const startY = 100;
        
        let alienIndex = 0;
        for (let row = 0; row < rows && alienIndex < this.alienCount; row++) {
            for (let col = 0; col < cols && alienIndex < this.alienCount; col++) {
                const alienX = startX + col * spacing;
                const alienY = startY + row * this.alienSize * 1.2;
                
                this.aliens.push({
                    x: alienX,
                    y: alienY,
                    type: row % 3,
                    alive: true,
                    baseX: alienX,
                    baseY: alienY
                });
                
                alienIndex++;
            }
        }
        
        this.totalAliens = this.aliens.length;
    }
    
    recreateAliens() {
        // Preserve score and wave when recreating aliens
        const currentScore = this.score;
        const currentWave = this.wave;
        this.createAliens();
        this.score = currentScore;
        this.wave = currentWave;
    }
    
    createBarriers() {
        this.barriers = [];
        const barrierY = this.canvas.height - 250;
        const spacing = this.canvas.width / 5;
        
        for (let i = 1; i <= 4; i++) {
            const blocks = [];
            const pattern = [
                [0,1,1,1,1,1,1,0],
                [1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1],
                [1,1,0,0,0,0,1,1]
            ];
            
            const blockSize = 8;
            for (let row = 0; row < pattern.length; row++) {
                for (let col = 0; col < pattern[row].length; col++) {
                    if (pattern[row][col]) {
                        blocks.push({
                            x: Math.floor(i * spacing + col * blockSize),
                            y: Math.floor(barrierY + row * blockSize),
                            size: blockSize,
                            alive: true
                        });
                    }
                }
            }
            this.barriers.push({ blocks });
        }
    }
    
    createStars() {
        this.stars = [];
        for (let i = 0; i < this.starDens; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                speed: Math.random() * 2 + 0.5,
                brightness: Math.random()
            });
        }
    }
    
    createExplosion(x, y, scale = 1) {
        this.explosions.push({
            x: x,
            y: y,
            age: 0,
            maxAge: 20,
            scale: scale
        });
    }
    
    // ===== UPDATE METHODS =====
    
    getAnimationSpeed() {
        const aliveCount = this.aliens.filter(a => a.alive).length;
        const aliveRatio = aliveCount / this.totalAliens;
        
        // Classic Space Invaders: Start at 1300ms, speed up to 200ms as aliens die
        // Audio reactivity: Mid frequencies affect animation speed
        const baseSpeed = 1300;
        const minSpeed = 200;
        const speedFromCount = baseSpeed - ((1 - aliveRatio) * (baseSpeed - minSpeed));
        
        // Mid frequencies make animation faster
        const midSpeedBoost = this.midLevel * 300;
        return Math.max(minSpeed, speedFromCount - midSpeedBoost);
    }
    
    updateAliens(deltaTime) {
        const now = Date.now();
        
        const aliveAliens = this.aliens.filter(a => a.alive);
        if (aliveAliens.length === 0) {
            this.wave++;
            this.createAliens();
            this.moveSpeed = Math.min(this.moveSpeed * 1.1, 3.0);
            return;
        }
        
        // Animation frame switching (affected by mid frequencies)
        const animSpeed = this.getAnimationSpeed();
        if (now - this.lastAlienAnim > animSpeed) {
            this.alienFrame = 1 - this.alienFrame;
            this.lastAlienAnim = now;
        }
        
        // Movement speed (affected by bass)
        const bassBoost = this.bassLevel * 0.5;
        const moveAmount = (this.moveSpeed + bassBoost) * deltaTime / 16.67;
        this.alienMoveX += moveAmount * this.alienDirection;
        
        const audioOffset = this.audioLevel * this.audioMoveAmount;
        
        // Edge detection
        let hitEdge = false;
        for (let alien of this.aliens) {
            if (!alien.alive) continue;
            
            const newX = alien.baseX + this.alienMoveX;
            if (newX < 50 || newX > this.canvas.width - 50 - this.alienSize) {
                hitEdge = true;
                break;
            }
        }
        
        if (hitEdge) {
            this.alienDirection *= -1;
            for (let alien of this.aliens) {
                if (alien.alive) {
                    alien.baseY += this.dropDistance;
                }
            }
        }
        
        // Update alien positions with audio-reactive wobble
        for (let alien of this.aliens) {
            if (alien.alive) {
                alien.x = alien.baseX + this.alienMoveX + Math.sin(Date.now() / 500 + alien.baseX) * audioOffset;
                alien.y = alien.baseY + Math.cos(Date.now() / 700 + alien.baseY) * audioOffset * 0.5;
            }
        }
    }
    
    updateLasers(deltaTime) {
        // Alien lasers fire based on mid frequency and laser frequency setting
        // Fire chance is proportional to laserFreq setting
        const baseFireChance = this.laserFreq / 1000; // 0-100 maps to 0-0.1 chance per frame
        const midBoost = 1 + (this.midLevel * 2); // Mid frequencies increase fire rate
        const beatBoost = this.beatDetected ? 3 : 1; // Beats triple the fire rate
        
        const finalFireChance = baseFireChance * midBoost * beatBoost;
        
        if (Math.random() < finalFireChance) {
            const aliveAliens = this.aliens.filter(a => a.alive);
            if (aliveAliens.length > 0) {
                const randomAlien = aliveAliens[Math.floor(Math.random() * aliveAliens.length)];
                this.lasers.push({
                    x: randomAlien.x + this.alienSize / 2,
                    y: randomAlien.y + this.alienSize,
                    speed: 5 + this.trebleLevel * 3,
                    direction: 'down'
                });
            }
        }
        
        // Ship fires automatically based on audio level
        if (this.shipAlive && this.audioLevel > 0.3 && Math.random() < 0.15) {
            this.lasers.push({
                x: this.shipX,
                y: this.canvas.height - 100,
                speed: 8,
                direction: 'up'
            });
        }
        
        // Update laser positions and check collisions
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const laser = this.lasers[i];
            
            if (laser.direction === 'up') {
                laser.y -= laser.speed;
                
                // Check alien collisions
                let hitAlien = false;
                for (let j = 0; j < this.aliens.length; j++) {
                    const alien = this.aliens[j];
                    if (!alien.alive) continue;
                    
                    if (laser.x > alien.x - 5 && 
                        laser.x < alien.x + this.alienSize + 5 &&
                        laser.y > alien.y - 5 && 
                        laser.y < alien.y + this.alienSize + 5) {
                        
                        alien.alive = false;
                        this.createExplosion(alien.x + this.alienSize / 2, alien.y + this.alienSize / 2, 1.5);
                        this.score += 10;
                        this.lasers.splice(i, 1);
                        hitAlien = true;
                        break;
                    }
                }
                
                if (!hitAlien && laser.y < 0) {
                    this.lasers.splice(i, 1);
                }
            } else {
                laser.y += laser.speed;
                
                // Check ship collision
                if (this.shipAlive) {
                    const shipY = this.canvas.height - 100;
                    const shipSize = 40;
                    const shipLeft = this.shipX - shipSize / 2;
                    const shipRight = this.shipX + shipSize / 2;
                    
                    if (laser.x > shipLeft && laser.x < shipRight &&
                        laser.y > shipY && laser.y < shipY + shipSize * 0.7) {
                        this.shipAlive = false;
                        this.lives--;
                        this.createExplosion(this.shipX, shipY + shipSize / 2, 2.0);
                        this.lasers.splice(i, 1);
                        
                        if (this.lives <= 0) {
                            this.lives = 3;
                            this.shipRespawnTime = Date.now() + 2000;
                        } else {
                            this.shipRespawnTime = Date.now() + 2000;
                        }
                        continue;
                    }
                }
                
                if (laser.y > this.canvas.height) {
                    this.lasers.splice(i, 1);
                    continue;
                }
                
                // Check barrier collisions
                if (this.displayBarriers) {
                    for (let barrier of this.barriers) {
                        for (let j = barrier.blocks.length - 1; j >= 0; j--) {
                            const block = barrier.blocks[j];
                            if (!block.alive) continue;
                            
                            if (laser.x > block.x && laser.x < block.x + block.size &&
                                laser.y > block.y && laser.y < block.y + block.size) {
                                block.alive = false;
                                this.createExplosion(block.x, block.y, 0.5);
                                this.lasers.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    
    updateExplosions(deltaTime) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            this.explosions[i].age += deltaTime / 16.67;
            this.explosions[i].scale += 0.05;
            
            if (this.explosions[i].age > this.explosions[i].maxAge) {
                this.explosions.splice(i, 1);
            }
        }
    }
    
    updateStars(deltaTime) {
        // Stars scroll faster with bass
        for (let star of this.stars) {
            star.y += star.speed * (1 + this.bassLevel);
            if (star.y > this.canvas.height) {
                star.y = 0;
                star.x = Math.random() * this.canvas.width;
            }
        }
    }
    
    updateShip() {
        // Respawn ship if time has elapsed
        if (!this.shipAlive && Date.now() > this.shipRespawnTime) {
            this.shipAlive = true;
        }
        
        if (!this.shipAlive) return;
        
        // Ship tracks nearest alien (affected by bass for responsiveness)
        const aliveAliens = this.aliens.filter(a => a.alive);
        if (aliveAliens.length > 0) {
            let closestAlien = null;
            let closestDistance = Infinity;
            
            for (let alien of aliveAliens) {
                const distance = Math.abs(alien.x - this.shipX);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestAlien = alien;
                }
            }
            
            if (closestAlien) {
                // Base target is closest alien
                this.shipTargetX = closestAlien.x + this.alienSize / 2;
                
                // Add sine wave oscillation to vary movement (prevents perfect sync)
                const time = Date.now() / 1000;
                const oscillation = Math.sin(time * 1.3) * 30; // ±30 pixels
                
                // Add bass influence
                const bassInfluence = (this.bassLevel - 0.5) * 50;
                
                // Add slight random drift that changes slowly
                if (!this.shipDriftOffset) this.shipDriftOffset = 0;
                if (!this.shipDriftTime || Date.now() - this.shipDriftTime > 500) {
                    this.shipDriftTarget = (Math.random() - 0.5) * 60;
                    this.shipDriftTime = Date.now();
                }
                this.shipDriftOffset += (this.shipDriftTarget - this.shipDriftOffset) * 0.05;
                
                // Combine all offsets
                this.shipTargetX += oscillation + bassInfluence + this.shipDriftOffset;
            }
        } else {
            this.shipTargetX = this.canvas.width / 2 + (this.bassLevel - 0.5) * 300;
        }
        
        const shipSize = 40;
        this.shipTargetX = Math.max(shipSize, Math.min(this.canvas.width - shipSize, this.shipTargetX));
        
        // Vary the interpolation speed slightly based on mid frequencies
        const baseSpeed = 0.1;
        const speedVariation = this.midLevel * 0.05; // ±5% based on mids
        const interpolationSpeed = baseSpeed + speedVariation;
        
        this.shipX += (this.shipTargetX - this.shipX) * interpolationSpeed;
    }
    
    // ===== DRAW METHODS =====
    
    drawAlien(alien, x, y) {
        const size = this.alienSize;
        const frame = this.alienFrame;
        const ctx = this.ctx;
        
        const color = this.getColor(alien.type);
        ctx.fillStyle = color;
        
        // Two-state sprites: frame0 = legs closed, frame1 = legs open
        const alienSprites = [
            // Type 0 - Squid (top rows)
            {
                frame0: [
                    [0,0,1,0,0,0,0,0,1,0,0],
                    [0,0,0,1,0,0,0,1,0,0,0],
                    [0,0,1,1,1,1,1,1,1,0,0],
                    [0,1,1,0,1,1,1,0,1,1,0],
                    [1,1,1,1,1,1,1,1,1,1,1],
                    [1,0,1,1,1,1,1,1,1,0,1],
                    [1,0,1,0,0,0,0,0,1,0,1],
                    [0,0,0,1,1,0,1,1,0,0,0]
                ],
                frame1: [
                    [0,0,1,0,0,0,0,0,1,0,0],
                    [0,0,0,1,0,0,0,1,0,0,0],
                    [0,0,1,1,1,1,1,1,1,0,0],
                    [0,1,1,0,1,1,1,0,1,1,0],
                    [1,1,1,1,1,1,1,1,1,1,1],
                    [1,0,1,1,1,1,1,1,1,0,1],
                    [1,0,1,0,0,0,0,0,1,0,1],
                    [0,1,0,1,0,0,1,0,0,1,0]
                ]
            },
            // Type 1 - Crab (middle rows)
            {
                frame0: [
                    [0,0,1,0,0,0,0,0,1,0,0],
                    [0,0,0,1,0,0,0,1,0,0,0],
                    [0,0,1,1,1,1,1,1,1,0,0],
                    [0,1,1,0,1,1,1,0,1,1,0],
                    [1,1,1,1,1,1,1,1,1,1,1],
                    [1,0,1,1,1,1,1,1,1,0,1],
                    [1,0,1,0,0,0,0,0,1,0,1],
                    [0,0,0,1,1,0,1,1,0,0,0]
                ],
                frame1: [
                    [0,0,1,0,0,0,0,0,1,0,0],
                    [0,0,0,1,0,0,0,1,0,0,0],
                    [0,0,1,1,1,1,1,1,1,0,0],
                    [0,1,1,0,1,1,1,0,1,1,0],
                    [1,1,1,1,1,1,1,1,1,1,1],
                    [1,0,1,1,1,1,1,1,1,0,1],
                    [1,0,1,0,0,0,0,0,1,0,1],
                    [0,1,0,0,0,0,0,0,0,1,0]
                ]
            },
            // Type 2 - Octopus (bottom rows)
            {
                frame0: [
                    [0,0,0,1,1,1,1,0,0,0],
                    [0,1,1,1,1,1,1,1,1,0],
                    [1,1,1,1,1,1,1,1,1,1],
                    [1,1,1,0,0,1,1,0,1,1],
                    [1,1,1,1,1,1,1,1,1,1],
                    [0,0,1,1,0,0,1,1,0,0],
                    [0,1,0,1,1,1,1,0,1,0],
                    [1,0,1,0,0,0,0,1,0,1]
                ],
                frame1: [
                    [0,0,0,1,1,1,1,0,0,0],
                    [0,1,1,1,1,1,1,1,1,0],
                    [1,1,1,1,1,1,1,1,1,1],
                    [1,1,1,0,0,1,1,0,1,1],
                    [1,1,1,1,1,1,1,1,1,1],
                    [0,0,1,1,0,0,1,1,0,0],
                    [0,1,0,0,1,1,0,0,1,0],
                    [0,0,1,1,0,0,1,1,0,0]
                ]
            }
        ];
        
        const spriteData = alienSprites[alien.type % 3];
        const sprite = frame === 0 ? spriteData.frame0 : spriteData.frame1;
        const pixelSize = size / 11;
        
        for (let row = 0; row < sprite.length; row++) {
            for (let col = 0; col < sprite[row].length; col++) {
                if (sprite[row][col]) {
                    ctx.fillRect(
                        x + col * pixelSize,
                        y + row * pixelSize,
                        pixelSize,
                        pixelSize
                    );
                }
            }
        }
    }
    
    drawShip() {
        if (!this.shipAlive) return;
        
        const size = 40;
        const x = this.shipX - size / 2;
        const y = this.canvas.height - 100;
        
        this.ctx.fillStyle = '#0f0';
        
        const sprite = [
            [0,0,0,0,0,1,0,0,0,0,0],
            [0,0,0,0,1,1,1,0,0,0,0],
            [0,0,0,0,1,1,1,0,0,0,0],
            [0,1,1,1,1,1,1,1,1,1,0],
            [1,1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1,1,1]
        ];
        
        const pixelSize = Math.floor(size / 11);
        
        for (let row = 0; row < sprite.length; row++) {
            for (let col = 0; col < sprite[row].length; col++) {
                if (sprite[row][col]) {
                    this.ctx.fillRect(
                        Math.floor(x + col * pixelSize),
                        Math.floor(y + row * pixelSize),
                        pixelSize,
                        pixelSize
                    );
                }
            }
        }
    }
    
    drawLaser(laser) {
        // Treble affects laser brightness
        const brightness = 1.0 - (this.trebleLevel * 0.3);
        const color = laser.direction === 'up' ? '#0ff' : '#fff';
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(laser.x - 2, laser.y, 4, 15);
        
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = color;
        this.ctx.globalAlpha = brightness;
        this.ctx.fillRect(laser.x - 1, laser.y, 2, 15);
        this.ctx.shadowBlur = 0;
        this.ctx.globalAlpha = 1.0;
    }
    
    drawExplosion(explosion) {
        const progress = explosion.age / explosion.maxAge;
        const alpha = 1 - progress;
        const size = this.explosionSizeParam * explosion.scale;
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        const particles = 12;
        for (let i = 0; i < particles; i++) {
            const angle = (i / particles) * Math.PI * 2;
            const dist = progress * size;
            const px = explosion.x + Math.cos(angle) * dist;
            const py = explosion.y + Math.sin(angle) * dist;
            
            // Treble affects explosion color intensity
            const trebleBoost = this.trebleLevel * 100;
            if (i % 4 === 0) {
                this.ctx.fillStyle = `rgb(${255}, ${trebleBoost}, 0)`;
            } else if (i % 4 === 1) {
                this.ctx.fillStyle = `rgb(${255}, ${68 + trebleBoost}, 0)`;
            } else if (i % 4 === 2) {
                this.ctx.fillStyle = `rgb(${255}, ${170 + trebleBoost/2}, 0)`;
            } else {
                this.ctx.fillStyle = '#ffff00';
            }
            
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#ff0000';
            this.ctx.fillRect(px - 4, py - 4, 8, 8);
        }
        
        if (progress < 0.3) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#ff0000';
            const centerSize = (1 - progress * 3) * size * 0.3;
            this.ctx.fillRect(explosion.x - centerSize/2, explosion.y - centerSize/2, centerSize, centerSize);
        }
        
        this.ctx.shadowBlur = 0;
        this.ctx.restore();
    }
    
    drawBarrier(barrier) {
        this.ctx.fillStyle = '#0f0';
        for (let block of barrier.blocks) {
            if (block.alive) {
                this.ctx.fillRect(block.x, block.y, block.size, block.size);
            }
        }
    }
    
    drawStars() {
        for (let star of this.stars) {
            const brightness = star.brightness * (0.3 + this.audioLevel * 0.7);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            this.ctx.fillRect(star.x, star.y, 2, 2);
        }
    }
    
    drawScore() {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px "Courier New"';
        this.ctx.fillText(`SCORE: ${this.score.toString().padStart(6, '0')}`, 50, 40);
        this.ctx.fillText(`HI-SCORE: ${(this.score * 2).toString().padStart(6, '0')}`, this.canvas.width - 300, 40);
        this.ctx.fillText(`WAVE: ${this.wave}`, this.canvas.width / 2 - 50, 40);
        
        // Lives indicator (ship icons)
        for (let i = 0; i < this.lives; i++) {
            const x = this.canvas.width - 150 + i * 40;
            const y = this.canvas.height - 40;
            this.ctx.fillRect(x, y, 30, 20);
        }
    }
    
    getColor(alienType) {
        const schemes = {
            classic: ['#0f0', '#0ff', '#fff'],
            rainbow: ['#f0f', '#0ff', '#ff0', '#f00', '#0f0'],
            neon: ['#f0f', '#0ff', '#ff0'],
            retro: ['#ff6b35', '#f7931e', '#fdc82f', '#8ac926'],
            plasma: ['#ff006e', '#8338ec', '#3a86ff', '#fb5607'],
            monochrome: ['#fff', '#ccc', '#999']
        };
        
        let colors = schemes[this.colorScheme] || schemes.classic;
        
        // Handle color morphing - use stored morph data from onUpdate
        if (this.colorMorphing && this.morphData) {
            const currentColors = schemes[this.morphData.currentScheme] || schemes.classic;
            const targetColors = schemes[this.morphData.targetScheme] || schemes.classic;
            const progress = this.morphData.progress;
            
            // Interpolate colors - maintain the larger array's length for proper cycling
            colors = [];
            const maxLength = Math.max(currentColors.length, targetColors.length);
            for (let i = 0; i < maxLength; i++) {
                const currentColor = currentColors[i % currentColors.length];
                const targetColor = targetColors[i % targetColors.length];
                colors.push(this.lerpColor(currentColor, targetColor, progress));
            }
        }
        
        // Get color for this alien type - ensure proper cycling
        const colorIndex = alienType % colors.length;
        let baseColor = colors[colorIndex];
        
        const reactAmount = this.colorReactivity / 100;
        
        // Apply reactivity if amount > 0
        if (reactAmount > 0 && this.trebleLevel > 0) {
            // Shift brightness based on treble
            return this.shiftColorBrightness(baseColor, this.trebleLevel * reactAmount * 2);
        }
        
        return baseColor;
    }
    
    /**
     * Linearly interpolate between two hex colors
     */
    lerpColor(color1, color2, t) {
        // Parse hex or rgb colors
        const parse = (color) => {
            if (color.startsWith('#')) {
                const hex = color.replace('#', '');
                return {
                    r: parseInt(hex.substr(0, 2), 16),
                    g: parseInt(hex.substr(2, 2), 16),
                    b: parseInt(hex.substr(4, 2), 16)
                };
            } else if (color.startsWith('rgb')) {
                const match = color.match(/\d+/g);
                return {
                    r: parseInt(match[0]),
                    g: parseInt(match[1]),
                    b: parseInt(match[2])
                };
            }
            return { r: 255, g: 255, b: 255 };
        };
        
        const c1 = parse(color1);
        const c2 = parse(color2);
        
        const r = Math.floor(c1.r + (c2.r - c1.r) * t);
        const g = Math.floor(c1.g + (c2.g - c1.g) * t);
        const b = Math.floor(c1.b + (c2.b - c1.b) * t);
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    /**
     * Override getColorSchemes to provide available schemes for morphing
     */
    getColorSchemes() {
        return ['classic', 'rainbow', 'neon', 'retro', 'plasma', 'monochrome'];
    }
    
    shiftColorBrightness(hexColor, amount) {
        // Simple brightness adjustment
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const factor = 1 + amount;
        const newR = Math.min(255, Math.floor(r * factor));
        const newG = Math.min(255, Math.floor(g * factor));
        const newB = Math.min(255, Math.floor(b * factor));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
    }
    
    onCleanup() {
        // Clear all arrays
        this.aliens = [];
        this.lasers = [];
        this.explosions = [];
        this.barriers = [];
        this.stars = [];
    }
}

// Auto-register plugin with Freque
setTimeout(() => {
    if (window.visualizer && window.FrequePluginBase) {
        new AlienZ(window.visualizer);
    }
}, 500);
