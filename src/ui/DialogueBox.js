import Phaser from "phaser";
import { CONFIG } from "../config/constants.js";

export class DialogueBox extends Phaser.GameObjects.Container {
    constructor(scene) {
        super(scene, 0, 0);
        this.scene = scene;
        
        // Background bar
        this.bg = scene.add.rectangle(0, 0, 0, 120, 0x000000, 0.9);
        this.bg.setOrigin(0, 1);
        this.add(this.bg);

        // Portrait Background (Slanted)
        this.portraitBg = scene.add.graphics();
        this.add(this.portraitBg);

        // Portrait
        this.portrait = scene.add.image(0, 0, 'portrait-mj');
        this.portrait.setScale(0.15); 
        this.add(this.portrait);

        // Text
        this.text = scene.add.text(0, 0, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#ffffff',
            wordWrap: { width: 0 },
            lineSpacing: 8
        });
        this.add(this.text);

        // Prompt
        this.prompt = scene.add.text(0, 0, 'PRESSIONE ESPAÇO', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#00ffcc'
        });
        this.prompt.setOrigin(1, 1);
        this.add(this.prompt);

        this.setScrollFactor(0);
        this.setDepth(5000);
        this.setVisible(false);
        
        scene.add.existing(this);
        
        this.isTyping = false;
        this.fullText = "";
        this.dialogueQueue = [];
        this.onComplete = null;

        this.updateLayout();
    }




    updateLayout() {
        if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) return;
        const { width, height } = this.scene.cameras.main;
        const boxHeight = 140;
        
        this.bg.width = width;
        this.bg.height = boxHeight;
        this.bg.setPosition(0, height);

        // Update Portrait Frame (replacing the slanted bg)
        this.portraitBg.clear();
        this.portraitBg.lineStyle(3, 0x00ffcc, 1);
        this.portraitBg.strokeRect(width - 180, height - 160, 160, 160);
        this.portraitBg.fillStyle(0x000000, 0.5);
        this.portraitBg.fillRect(width - 180, height - 160, 160, 160);

        // Update Portrait Position and fixed size
        this.portrait.setDisplaySize(150, 150);
        this.portrait.setPosition(width - 100, height - 80);

        // Update Text
        this.text.setPosition(40, height - boxHeight + 40);
        this.text.setWordWrapWidth(width - 250);


        // Update Prompt
        this.prompt.setPosition(width - 250, height - 20);
    }


    startDialogue(content, onComplete = null) {
        if (Array.isArray(content)) {
            this.dialogueQueue = [...content];
        } else {
            this.dialogueQueue = [content];
        }
        
        this.onComplete = onComplete;
        this.showNext();
    }

    showNext() {
        if (this.dialogueQueue.length === 0) {
            this.hide();
            if (this.onComplete) this.onComplete();
            return;
        }

        const content = this.dialogueQueue.shift();
        this.setVisible(true);
        this.fullText = content;
        this.text.setText("");
        this.prompt.setAlpha(0);
        this.isTyping = true;
        
        let charIndex = 0;
        if (this.typingTimer) this.typingTimer.remove();

        this.typingTimer = this.scene.time.addEvent({
            delay: 30,
            callback: () => {
                charIndex++;
                this.text.setText(this.fullText.substring(0, charIndex));
                
                if (charIndex === this.fullText.length) {
                    this.isTyping = false;
                    this.scene.tweens.add({
                        targets: this.prompt,
                        alpha: 1,
                        duration: 500,
                        yoyo: true,
                        repeat: -1
                    });
                }
            },
            repeat: this.fullText.length - 1
        });
    }

    handleInput() {
        if (!this.visible) return false;

        if (this.isTyping) {
            // Finish typing immediately
            if (this.typingTimer) this.typingTimer.remove();
            this.text.setText(this.fullText);
            this.isTyping = false;
            this.scene.tweens.add({
                targets: this.prompt,
                alpha: 1,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
            return true;
        } else {
            this.showNext();
            return true;
        }
    }

    hide() {
        this.setVisible(false);
        this.text.setText("");
        if (this.typingTimer) this.typingTimer.remove();
    }

    destroy(fromScene) {
        this.scene.scale.off('resize', this.updateLayout, this);
        super.destroy(fromScene);
    }
}
