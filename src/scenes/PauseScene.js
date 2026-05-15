import Phaser from 'phaser';

export class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Overlay similar to death but distinct (deep blue/purple tint)
        const bg = this.add.graphics();
        bg.fillStyle(0x000022, 0.8);
        bg.fillRect(0, 0, width, height);
        
        // Neon border
        bg.lineStyle(4, 0x00ffcc, 1);
        bg.strokeRect(width / 4, height / 4, width / 2, height / 2);

        this.add.text(width / 2, height * 0.35, 'JOGO PAUSADO', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '32px',
            color: '#00ffcc',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        const resumeBtn = this._createButton(width / 2, height * 0.5, 'RETOMAR (P)', 0x00ffcc, () => {
            this.scene.resume(this.parentScene);
            this.scene.stop();
        });

        const menuBtn = this._createButton(width / 2, height * 0.62, 'MENU PRINCIPAL', 0xff4444, () => {
            this.scene.stop(this.parentScene);
            this.scene.start('MenuScene');
        });

        // Listen for P key to resume
        this.input.keyboard.on('keydown-P', () => {
            this.scene.resume(this.parentScene);
            this.scene.stop();
        });
    }

    init(data) {
        this.parentScene = data.parentScene;
    }

    _createButton(x, y, label, color, callback) {
        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 320, 50, 0x000000, 0.9)
            .setStrokeStyle(2, color)
            .setInteractive({ useHandCursor: true });
        
        const txt = this.add.text(0, 0, label, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5);

        container.add([bg, txt]);

        bg.on('pointerover', () => { bg.setFillStyle(Phaser.Display.Color.IntegerToColor(color).darken(50).color); });
        bg.on('pointerout', () => { bg.setFillStyle(0x000000); });
        bg.on('pointerdown', callback);

        return container;
    }
}
