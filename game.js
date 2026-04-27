const GAME_WIDTH = 960;
const GAME_HEIGHT = 640;
const ROUND_SECONDS = 45;

const THEMES = {
  classic: {
    title: "Sprinkled Cupcakes",
    subtitle: "Tap each cupcake while the bakery rush is hot.",
    instruction: "Click the sprinkled cupcakes before they leave the counter.",
    missText: "miss",
    expireText: "too slow",
    overlayColor: 0xfff1d6,
    overlayText: "#4c2d26",
    overlaySubtext: "#6c4a42",
    button: 0xff7aa2,
    buttonHover: 0xff93b4,
    buttonText: "#3d2730",
    hud: "#4c2d26",
    hudStroke: "#fff2df",
    combo: "#d84f80",
    footer: "#7c5a51",
    floating: "#d84f80",
    missColor: "#ff746b",
    targetKeys: ["classic-pink", "classic-mint", "classic-lemon", "classic-berry"],
  },
  spooky: {
    title: "Spooky Sprinkled Cupcakes",
    subtitle: "Tap each spooky cupcake before it disappears.",
    instruction: "Click the spooky cupcakes before they vanish.",
    missText: "boo!",
    expireText: "vanished",
    overlayColor: 0x160f22,
    overlayText: "#fff3c7",
    overlaySubtext: "#f6d7ff",
    button: 0xff8a1f,
    buttonHover: 0xffa340,
    buttonText: "#160f22",
    hud: "#fff3c7",
    hudStroke: "#160f22",
    combo: "#9bff6a",
    footer: "#cda7de",
    floating: "#9bff6a",
    missColor: "#ff8a1f",
    targetKeys: ["spooky-pumpkin", "spooky-candy", "spooky-bat", "spooky-witch"],
  },
};

class PlayScene extends Phaser.Scene {
  constructor() {
    super("PlayScene");
    this.selectedTheme = "classic";
  }

  init(data = {}) {
    this.selectedTheme = data.theme || this.selectedTheme || "classic";
    this.score = 0;
    this.combo = 0;
    this.timeLeft = ROUND_SECONDS;
    this.isPlaying = false;
    this.isCountingDown = false;
    this.target = null;
    this.audioContext = null;
  }

  preload() {}

  create() {
    this.createTextures();
    this.createBackground();
    this.createHud();
    this.createStartOverlay();

    this.input.on("pointerdown", (pointer, targets) => {
      if (!this.isPlaying || targets.length > 0) {
        return;
      }

      this.combo = 0;
      this.cameras.main.shake(80, 0.004);
      const theme = THEMES[this.selectedTheme];
      this.playMissSound();
      this.showFloatingText(pointer.x, pointer.y, theme.missText, theme.missColor, 18);
    });
  }

  getAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }
      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    return this.audioContext;
  }

  playTone(frequency, duration = 0.1, type = "sine", volume = 0.08, delay = 0) {
    const audio = this.getAudioContext();
    if (!audio) {
      return;
    }

    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  playMouseClickSound() {
    const audio = this.getAudioContext();
    if (!audio) {
      return;
    }

    const duration = 0.018;
    const sampleCount = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, sampleCount, audio.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < sampleCount; i += 1) {
      const envelope = Math.pow(1 - i / sampleCount, 3);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.18;
    }

    const source = audio.createBufferSource();
    const gain = audio.createGain();
    source.buffer = buffer;
    gain.gain.value = 0.018;
    source.connect(gain);
    gain.connect(audio.destination);
    source.start();
  }


  playClickSound() {
    this.playTone(620, 0.08, "triangle", 0.09);
    this.playTone(920, 0.1, "sine", 0.06, 0.045);
  }

  playMissSound() {
    this.playMouseClickSound();
  }

  playCountdownSound() {
    this.playTone(440, 0.08, "square", 0.04);
  }

  playGoSound() {
    this.playTone(620, 0.08, "triangle", 0.08);
    this.playTone(880, 0.12, "triangle", 0.08, 0.07);
  }

  playFinishSound() {
    this.playTone(520, 0.12, "sine", 0.06);
    this.playTone(390, 0.12, "sine", 0.055, 0.12);
    this.playTone(260, 0.18, "sine", 0.05, 0.24);
  }

  createTextures() {
    const classicStyles = [
      { key: "classic-pink", frosting: 0xff9ec4, cake: 0xf6b167, liner: 0x55c7be },
      { key: "classic-mint", frosting: 0x92ead8, cake: 0xe89b52, liner: 0xff7aa2 },
      { key: "classic-lemon", frosting: 0xffdc63, cake: 0xd98545, liner: 0x7c68ee },
      { key: "classic-berry", frosting: 0xc8a6ff, cake: 0xf0a35c, liner: 0xff5b8f },
    ];
    const spookyStyles = [
      { key: "spooky-pumpkin", frosting: 0xff8a1f, cake: 0x3a211c, liner: 0x5b2d91, topper: "pumpkinCandy" },
      { key: "spooky-candy", frosting: 0xffd353, cake: 0x2d1a18, liner: 0x1f9f6d, topper: "candyCorn" },
      { key: "spooky-bat", frosting: 0x9bff6a, cake: 0x35201a, liner: 0xff8a1f, topper: "moonCandy" },
      { key: "spooky-witch", frosting: 0xb56cff, cake: 0x2b1718, liner: 0xffd353, topper: "witch" },
    ];

    [...classicStyles, ...spookyStyles].forEach((style) => this.createCupcakeTexture(style));

    const spark = this.add.graphics();
    spark.fillStyle(0xffd353, 1);
    spark.fillRoundedRect(2, 6, 12, 4, 2);
    spark.generateTexture("spark", 16, 16);
    spark.destroy();
  }

  createCupcakeTexture({ key, frosting, cake, liner, topper }) {
    const cupcake = this.add.graphics();
    cupcake.fillStyle(0x000000, 0.34);
    cupcake.fillEllipse(42, 80, 60, 12);

    cupcake.fillStyle(0x1b0f14, 1);
    cupcake.fillTriangle(18, 39, 66, 39, 58, 62);
    cupcake.fillStyle(cake, 1);
    cupcake.lineStyle(3, 0x130b10, 0.95);
    cupcake.fillEllipse(42, 43, 54, 32);
    cupcake.strokeEllipse(42, 43, 54, 32);

    cupcake.fillStyle(0xffc75c, 0.2);
    cupcake.fillEllipse(33, 34, 18, 8);

    cupcake.fillStyle(frosting, 1);
    cupcake.lineStyle(3, 0x130b10, 0.68);
    cupcake.fillEllipse(42, 41, 62, 29);
    cupcake.strokeEllipse(42, 41, 62, 29);
    cupcake.fillEllipse(42, 29, 48, 30);
    cupcake.strokeEllipse(42, 29, 48, 30);
    cupcake.fillEllipse(42, 17, 30, 23);
    cupcake.strokeEllipse(42, 17, 30, 23);

    cupcake.fillStyle(0xffffff, 0.32);
    cupcake.fillEllipse(33, 20, 16, 7);
    cupcake.fillEllipse(27, 38, 18, 7);
    cupcake.fillEllipse(50, 30, 18, 7);

    cupcake.lineStyle(3, 0x130b10, 0.18);
    cupcake.strokeEllipse(34, 38, 24, 8);
    cupcake.strokeEllipse(52, 37, 24, 8);

    if (topper) {
      this.drawSpookyTopper(cupcake, topper);
    } else {
      this.drawClassicTopper(cupcake);
    }

    cupcake.fillStyle(liner, 1);
    cupcake.lineStyle(3, 0x130b10, 0.95);
    cupcake.beginPath();
    cupcake.moveTo(18, 52);
    cupcake.lineTo(66, 52);
    cupcake.lineTo(58, 83);
    cupcake.lineTo(26, 83);
    cupcake.closePath();
    cupcake.fillPath();
    cupcake.strokePath();

    for (let i = 0; i < 5; i += 1) {
      cupcake.lineStyle(3, 0x130b10, 0.18);
      const x = 25 + i * 8;
      cupcake.lineBetween(x, 56, x + 2, 79);
      cupcake.lineStyle(1, 0xffffff, 0.22);
      cupcake.lineBetween(x + 3, 56, x + 5, 79);
    }

    const sprinkleColors = [0xff7a2d, 0x9bff6a, 0xf5f0ff, 0xb56cff, 0xff4f93];
    const sprinkles = [
      [27, 30, -18],
      [39, 18, 11],
      [56, 31, 26],
      [31, 43, 31],
      [50, 43, -25],
      [61, 38, 12],
      [22, 40, 22],
      [44, 32, -6],
      [35, 26, 35],
      [52, 22, -32],
    ];
    sprinkles.forEach(([x, y, angle], index) => {
      cupcake.fillStyle(sprinkleColors[index % sprinkleColors.length], 1);
      cupcake.save();
      cupcake.translateCanvas(x, y);
      cupcake.rotateCanvas(Phaser.Math.DegToRad(angle));
      cupcake.fillRoundedRect(-6, -2, 12, 4, 2);
      cupcake.restore();
    });

    cupcake.generateTexture(key, 84, 88);
    cupcake.destroy();
  }

  drawClassicTopper(cupcake) {
    cupcake.fillStyle(0xe84855, 1);
    cupcake.lineStyle(2, 0x7a2330, 0.7);
    cupcake.fillCircle(48, 9, 6);
    cupcake.strokeCircle(48, 9, 6);
    cupcake.lineStyle(2, 0x4f8d48, 1);
    cupcake.lineBetween(50, 5, 55, 0);
  }

  drawSpookyTopper(cupcake, topper) {
    if (topper === "witch") {
      cupcake.fillStyle(0x18111f, 1);
      cupcake.lineStyle(2, 0xffc75c, 0.85);
      cupcake.fillTriangle(30, 14, 46, -8, 58, 15);
      cupcake.strokeTriangle(30, 14, 46, -8, 58, 15);
      cupcake.fillStyle(0xff8a1f, 1);
      cupcake.fillRoundedRect(27, 13, 32, 6, 3);
      return;
    }

    if (topper === "candyCorn") {
      cupcake.fillStyle(0xffd353, 1);
      cupcake.fillTriangle(42, 0, 30, 27, 54, 27);
      cupcake.fillStyle(0xff8a1f, 1);
      cupcake.fillTriangle(42, 8, 33, 27, 51, 27);
      cupcake.fillStyle(0xffffff, 1);
      cupcake.fillTriangle(42, 0, 37, 12, 47, 12);
      return;
    }

    if (topper === "pumpkinCandy") {
      cupcake.fillStyle(0xff8a1f, 1);
      cupcake.lineStyle(2, 0x7a3b12, 0.82);
      cupcake.fillCircle(42, 10, 9);
      cupcake.strokeCircle(42, 10, 9);
      cupcake.lineStyle(1, 0x7a3b12, 0.38);
      cupcake.lineBetween(42, 2, 42, 18);
      cupcake.lineBetween(36, 6, 38, 16);
      cupcake.lineBetween(48, 6, 46, 16);
      cupcake.fillStyle(0x5ad35a, 1);
      cupcake.fillRoundedRect(40, -1, 5, 7, 2);
      return;
    }

    if (topper === "moonCandy") {
      cupcake.fillStyle(0xfff0a8, 1);
      cupcake.lineStyle(2, 0x8d6d2a, 0.62);
      cupcake.fillCircle(43, 10, 10);
      cupcake.strokeCircle(43, 10, 10);
      cupcake.fillStyle(0x9bff6a, 1);
      cupcake.fillCircle(48, 7, 9);
      return;
    }

    cupcake.fillStyle(0xffd353, 1);
    cupcake.fillCircle(42, 10, 7);
  }

  createBackground() {
    if (this.selectedTheme === "classic") {
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xfff1d6).setOrigin(0);
      this.add.rectangle(0, GAME_HEIGHT - 138, GAME_WIDTH, 138, 0xe7a660).setOrigin(0);
      this.add.rectangle(0, GAME_HEIGHT - 138, GAME_WIDTH, 7, 0x9a6044, 0.32).setOrigin(0);

      for (let i = 0; i < 12; i += 1) {
        const x = i * 92 - 40;
        this.add.rectangle(x, GAME_HEIGHT - 104, 48, 178, 0xc9824f, 0.18).setAngle(-18);
      }

      for (let i = 0; i < 80; i += 1) {
        const x = Phaser.Math.Between(0, GAME_WIDTH);
        const y = Phaser.Math.Between(60, GAME_HEIGHT - 170);
        const width = Phaser.Math.FloatBetween(8, 18);
        const color = Phaser.Math.RND.pick([0xff5b8f, 0x55c7be, 0xffd447, 0x7c68ee]);
        const dot = this.add.rectangle(x, y, width, 4, color, Phaser.Math.FloatBetween(0.28, 0.62)).setAngle(
          Phaser.Math.Between(-35, 35)
        );
        this.tweens.add({
          targets: dot,
          alpha: 0.12,
          y: y + Phaser.Math.Between(-8, 8),
          duration: Phaser.Math.Between(900, 2200),
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }

      const lanes = [108, 224, 340, 456];
      lanes.forEach((y, index) => {
        const bar = this.add.rectangle(
          GAME_WIDTH / 2,
          y,
          GAME_WIDTH + 120,
          8,
          index % 2 ? 0x55c7be : 0xff7aa2,
          0.14
        );
        this.tweens.add({
          targets: bar,
          x: index % 2 ? GAME_WIDTH / 2 - 80 : GAME_WIDTH / 2 + 80,
          duration: 4200 + index * 550,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      });
      return;
    }

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x160f22).setOrigin(0);
    this.add.circle(118, 96, 48, 0xffd353, 0.9);
    this.add.circle(138, 82, 42, 0x160f22, 1);
    this.add.rectangle(0, GAME_HEIGHT - 138, GAME_WIDTH, 138, 0x321431).setOrigin(0);
    this.add.rectangle(0, GAME_HEIGHT - 138, GAME_WIDTH, 7, 0xff8a1f, 0.38).setOrigin(0);

    for (let i = 0; i < 7; i += 1) {
      const x = 300 + i * 86;
      const y = 76 + (i % 2) * 38;
      this.add.triangle(x, y, 0, 8, 16, 0, 32, 8, 0x07060a, 0.46);
    }

    for (let i = 0; i < 12; i += 1) {
      const x = i * 92 - 40;
      this.add.rectangle(x, GAME_HEIGHT - 104, 48, 178, 0x51203b, 0.34).setAngle(-18);
    }

    for (let i = 0; i < 92; i += 1) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(60, GAME_HEIGHT - 170);
      const width = Phaser.Math.FloatBetween(8, 18);
      const color = Phaser.Math.RND.pick([0xff8a1f, 0xffd353, 0x9bff6a, 0xb56cff]);
      const dot = this.add.rectangle(x, y, width, 4, color, Phaser.Math.FloatBetween(0.28, 0.62)).setAngle(
        Phaser.Math.Between(-35, 35)
      );
      this.tweens.add({
        targets: dot,
        alpha: 0.12,
        y: y + Phaser.Math.Between(-8, 8),
        duration: Phaser.Math.Between(900, 2200),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    const lanes = [108, 224, 340, 456];
    lanes.forEach((y, index) => {
      const bar = this.add.rectangle(
        GAME_WIDTH / 2,
        y,
        GAME_WIDTH + 120,
        8,
        index % 2 ? 0x9bff6a : 0xff8a1f,
        0.16
      );
      this.tweens.add({
        targets: bar,
        x: index % 2 ? GAME_WIDTH / 2 - 80 : GAME_WIDTH / 2 + 80,
        duration: 4200 + index * 550,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });
  }

  createHud() {
    const theme = THEMES[this.selectedTheme];
    const hudStyle = {
      fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
      fontSize: "28px",
      color: theme.hud,
      stroke: theme.hudStroke,
      strokeThickness: 5,
    };

    this.scoreText = this.add.text(32, 26, "Score 0", hudStyle).setDepth(10);
    this.timerText = this.add.text(GAME_WIDTH - 32, 26, "45", hudStyle).setOrigin(1, 0).setDepth(10);
    this.comboText = this.add
      .text(GAME_WIDTH / 2, 26, "", {
        ...hudStyle,
        fontSize: "22px",
        color: theme.combo,
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 32, theme.instruction, {
        fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
        fontSize: "18px",
        color: theme.overlaySubtext,
      })
      .setOrigin(0.5, 1)
      .setDepth(10);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 8, "Copyright Tauren Games Studio", {
        fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
        fontSize: "13px",
        color: theme.footer,
      })
      .setOrigin(0.5, 1)
      .setDepth(10);
  }

  createStartOverlay() {
    const theme = THEMES[this.selectedTheme];
    this.overlay = this.add.container(0, 0).setDepth(30);
    this.overlay.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, theme.overlayColor, 0.88).setOrigin(0));
    this.addMenuWallpaper(this.overlay);
    this.overlayTitle = this.add
      .text(GAME_WIDTH / 2, 190, theme.title, {
        fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
        fontSize: "50px",
        fontStyle: "800",
        color: theme.overlayText,
      })
      .setOrigin(0.5);
    this.overlay.add(
      this.overlayTitle
    );
    this.overlaySubtitle = this.add
      .text(GAME_WIDTH / 2, 258, theme.subtitle, {
        fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
        fontSize: "22px",
        color: theme.overlaySubtext,
      })
      .setOrigin(0.5);
    this.overlay.add(
      this.overlaySubtitle
    );

    const classicButton = this.createThemeButton(GAME_WIDTH / 2 - 155, 330, "Sprinkled Cupcakes", "classic");
    const spookyButton = this.createThemeButton(GAME_WIDTH / 2 + 155, 330, "Spooky Sprinkled", "spooky");

    const button = this.add.rectangle(GAME_WIDTH / 2, 420, 220, 64, theme.button, 1).setInteractive({ useHandCursor: true });
    this.startButtonLabel = this.add
      .text(GAME_WIDTH / 2, 420, "Start", {
        fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
        fontSize: "28px",
        fontStyle: "700",
        color: theme.buttonText,
      })
      .setOrigin(0.5);

    button.on("pointerover", () => button.setFillStyle(theme.buttonHover));
    button.on("pointerout", () => button.setFillStyle(theme.button));
    button.on("pointerdown", () => {
      this.playGoSound();
      this.startRound();
    });

    this.overlay.add([...classicButton, ...spookyButton, button, this.startButtonLabel]);
  }

  addMenuWallpaper(container) {
    const isSpooky = this.selectedTheme === "spooky";
    const theme = THEMES[this.selectedTheme];
    const colors = isSpooky
      ? [0xff8a1f, 0xffd353, 0x9bff6a, 0xb56cff]
      : [0xff7aa2, 0xffd447, 0x55c7be, 0x7c68ee];

    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const x = 84 + col * 118 + (row % 2) * 44;
        const y = 70 + row * 112;
        const tint = colors[(row + col) % colors.length];
        const texture = Phaser.Math.RND.pick(THEMES[this.selectedTheme].targetKeys);
        const cupcake = this.add
          .image(x, y, texture)
          .setScale(0.42)
          .setAlpha(isSpooky ? 0.18 : 0.22)
          .setAngle((row + col) % 2 ? -12 : 12);
        container.add(cupcake);

        const sprinkle = this.add
          .rectangle(x + 34, y - 26, 22, 5, tint, isSpooky ? 0.26 : 0.34)
          .setAngle(Phaser.Math.Between(-35, 35));
        container.add(sprinkle);
      }
    }

    container.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, theme.overlayColor, this.selectedTheme === "spooky" ? 0.3 : 0.22).setOrigin(0));
  }

  createThemeButton(x, y, label, themeKey) {
    const isSelected = this.selectedTheme === themeKey;
    const fill = isSelected ? THEMES[themeKey].button : 0x2a2034;
    const textColor = isSelected ? THEMES[themeKey].buttonText : "#fff3c7";
    const button = this.add.rectangle(x, y, 280, 48, fill, 1).setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
        fontSize: "18px",
        fontStyle: "800",
        color: textColor,
      })
      .setOrigin(0.5);

    button.on("pointerover", () => button.setFillStyle(THEMES[themeKey].buttonHover));
    button.on("pointerout", () => button.setFillStyle(fill));
    button.on("pointerdown", () => {
      this.playClickSound();
      this.setTheme(themeKey);
    });

    return [button, text];
  }

  setTheme(themeKey) {
    if (this.selectedTheme === themeKey) {
      return;
    }

    this.scene.restart({ theme: themeKey });
  }

  startRound() {
    this.score = 0;
    this.combo = 0;
    this.timeLeft = ROUND_SECONDS;
    this.isPlaying = false;
    this.isCountingDown = true;
    this.updateHud();
    this.overlay.setVisible(false);

    if (this.roundTimer) {
      this.roundTimer.remove(false);
    }

    if (this.countdownEvent) {
      this.countdownEvent.remove(false);
    }

    this.startCountdown();
  }

  startCountdown() {
    const countdownSteps = ["3", "2", "1", "GO!"];
    let stepIndex = 0;
    const countdownText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, countdownSteps[stepIndex], {
        fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
        fontSize: "108px",
        fontStyle: "900",
        color: "#fff3c7",
        stroke: "#160f22",
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setScale(0.4)
      .setAlpha(0);

    const pulse = () => {
      countdownText.setText(countdownSteps[stepIndex]);
      if (countdownSteps[stepIndex] === "GO!") {
        this.playGoSound();
      } else {
        this.playCountdownSound();
      }
      countdownText.setScale(0.4);
      countdownText.setAlpha(0);
      this.tweens.add({
        targets: countdownText,
        scale: 1,
        alpha: 1,
        duration: 180,
        ease: "Back.easeOut",
        yoyo: true,
        hold: 420,
        onComplete: () => {
          stepIndex += 1;
          if (stepIndex < countdownSteps.length) {
            this.countdownEvent = this.time.delayedCall(80, pulse);
            return;
          }

          countdownText.destroy();
          this.countdownEvent = null;
          this.beginGameplay();
        },
      });
    };

    pulse();
  }

  beginGameplay() {
    this.isCountingDown = false;
    this.isPlaying = true;

    this.roundTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft -= 1;
        this.updateHud();
        if (this.timeLeft <= 0) {
          this.endRound();
        }
      },
      loop: true,
    });

    this.spawnTarget();
  }

  spawnTarget() {
    if (!this.isPlaying) {
      return;
    }

    const margin = 72;
    const x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
    const y = Phaser.Math.Between(100, GAME_HEIGHT - 100);
    const life = Phaser.Math.Clamp(1050 - this.score * 6, 480, 1050);
    const scale = Phaser.Math.FloatBetween(0.78, 1.16);

    const texture = Phaser.Math.RND.pick(THEMES[this.selectedTheme].targetKeys);
    this.target = this.add.image(x, y, texture).setScale(0).setDepth(5).setInteractive({ useHandCursor: true });
    this.target.lifeEvent = this.time.delayedCall(life, () => this.expireTarget(this.target));

    this.target.on("pointerdown", (pointer) => {
      pointer.event.stopPropagation();
      this.hitTarget(this.target);
    });

    this.tweens.add({
      targets: this.target,
      scale,
      angle: Phaser.Math.Between(-14, 14),
      duration: 180,
      ease: "Back.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: this.target,
          angle: this.target.angle + 18,
          duration: life,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        this.tweens.add({
          targets: this.target,
          alpha: 0.2,
          duration: life,
          ease: "Cubic.easeIn",
        });
      },
    });
  }

  hitTarget(target) {
    if (!target || !target.active) {
      return;
    }

    this.combo += 1;
    this.playClickSound();
    const gained = 10 + Math.min(this.combo, 10) * 3;
    this.score += gained;
    this.updateHud();

    target.lifeEvent?.remove(false);
    this.emitSparks(target.x, target.y);
    this.showFloatingText(target.x, target.y - 18, `+${gained}`, THEMES[this.selectedTheme].floating, 28);
    this.tweens.killTweensOf(target);
    this.tweens.add({
      targets: target,
      scale: target.scale * 1.7,
      alpha: 0,
      duration: 160,
      ease: "Quad.easeOut",
      onComplete: () => target.destroy(),
    });

    this.time.delayedCall(110, () => this.spawnTarget());
  }

  expireTarget(target) {
    if (!target || !target.active) {
      return;
    }

    this.combo = 0;
    this.playMissSound();
    this.updateHud();
    this.tweens.killTweensOf(target);
    const theme = THEMES[this.selectedTheme];
    this.showFloatingText(target.x, target.y, theme.expireText, theme.missColor, 20);
    this.tweens.add({
      targets: target,
      scale: 0,
      alpha: 0,
      duration: 160,
      ease: "Back.easeIn",
      onComplete: () => {
        target.destroy();
        this.spawnTarget();
      },
    });
  }

  emitSparks(x, y) {
    for (let i = 0; i < 12; i += 1) {
      const spark = this.add.image(x, y, "spark").setDepth(4).setScale(Phaser.Math.FloatBetween(0.45, 0.9));
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(35, 95);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(340, 620),
        ease: "Quad.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  showFloatingText(x, y, text, color, size) {
    const label = this.add
      .text(x, y, text, {
        fontFamily: '"Comic Sans MS", "Comic Sans", cursive',
        fontSize: `${size}px`,
        fontStyle: "800",
        color,
        stroke: THEMES[this.selectedTheme].hudStroke,
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.tweens.add({
      targets: label,
      y: y - 42,
      alpha: 0,
      duration: 640,
      ease: "Cubic.easeOut",
      onComplete: () => label.destroy(),
    });
  }

  updateHud() {
    this.scoreText.setText(`Score ${this.score}`);
    this.timerText.setText(`${this.timeLeft}`);
    this.comboText.setText(this.combo > 1 ? `${this.combo}x combo` : "");
  }

  endRound() {
    this.isPlaying = false;
    this.playFinishSound();
    this.isCountingDown = false;
    this.roundTimer?.remove(false);
    this.countdownEvent?.remove(false);

    if (this.target?.active) {
      this.target.lifeEvent?.remove(false);
      this.target.destroy();
    }

    this.overlay.setVisible(true);
    this.overlayTitle.setText("Time Up");
    this.overlaySubtitle.setText(`Final score: ${this.score}`);
    this.startButtonLabel.setText("Play again");
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#160f22",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: PlayScene,
};

new Phaser.Game(config);
