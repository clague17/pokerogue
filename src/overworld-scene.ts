import Phaser from "phaser";
import { SceneBase } from "./scene-base";
import { PlayerGender } from "#enums/player-gender";
import { InputsController } from "./inputs-controller";
import { UiInputs } from "./ui-inputs";
import { addTextObject, TextStyle } from "./ui/text";
import type BattleScene from "./battle-scene";
import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#app/field/trainer";
import { ShowTrainerPhase } from "./phases/show-trainer-phase";
import { globalScene } from "#app/global-scene";
export default class OverworldScene extends SceneBase {
  public inputController: InputsController;
  public uiInputs: UiInputs;

  private player: Phaser.Physics.Arcade.Sprite;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private playerSpeed: number = 160;
  private locationText: Phaser.GameObjects.Text;
  private obstacles: Phaser.Physics.Arcade.StaticGroup;
  private trainerObstacles: Phaser.Physics.Arcade.Group;

  constructor() {
    super("overworld");
    this.inputController = new InputsController();
    this.uiInputs = new UiInputs(this.inputController);
  }

  preload() {
    // Load player character sprites
    this.load.spritesheet("player_m", "images/trainer/overworld_male.png", {
      frameWidth: 62,
      frameHeight: 82,
    });

    this.load.spritesheet("player_f", "images/trainer/overworld_female.png", {
      frameWidth: 14,
      frameHeight: 25,
    });
  }

  create() {
    // Check if we're coming from the battle scene after title
    const fromTitle = !this.registry.get("fromOverworld");

    // Create a simple background
    const background = this.add
      .rectangle(0, 0, 2000, 2000, 0x88aa88)
      .setOrigin(0, 0);

    // Create some placeholder obstacles
    this.obstacles = this.physics.add.staticGroup();

    // Create a separate group for trainers that can be interacted with
    this.trainerObstacles = this.physics.add.group({
      immovable: true,
    });

    // Add some trainers as interactive obstacles
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(200, 1800);
      const y = Phaser.Math.Between(200, 1800);

      // Randomly select a trainer type and variant
      const trainerType = Phaser.Math.RND.pick(Object.values(TrainerType));
      const variant = Phaser.Math.RND.pick([
        TrainerVariant.DEFAULT,
        TrainerVariant.FEMALE,
      ]);

      // Create trainer sprite
      const trainer = this.physics.add.sprite(
        x,
        y,
        "player_f",
        Phaser.Math.Between(0, 11)
      );

      // Store trainer data for battle
      trainer.setData("trainerType", trainerType);
      trainer.setData("variant", variant);

      // Adjust the sprite's origin to align with the base
      trainer.setOrigin(0.5, 0.9);

      // Add interaction zone (slightly larger than the sprite)
      trainer.body.setSize(40, 40);
      trainer.body.setOffset(11, 40);

      // Add to trainer group
      this.trainerObstacles.add(trainer);
    }

    // Set player position
    const x = 400;
    const y = 300;

    // Create player sprite
    const gender = this.registry.get("playerGender") || PlayerGender.MALE;
    const spriteKey = gender === PlayerGender.FEMALE ? "player_f" : "player_m";

    // Try to create the player with the sprite, or fall back to a rectangle
    try {
      this.player = this.physics.add.sprite(x, y, spriteKey, 7);
      this.player.setOrigin(0.5, 0.9); // Move origin point down to feet
    } catch (e) {
      console.warn("Failed to create player sprite, using rectangle instead");
      const playerRect = this.add.rectangle(x, y, 32, 32, 0x0000ff);
      this.player = this.physics.add.existing(
        playerRect
      ) as Phaser.Physics.Arcade.Sprite;
    }

    this.player.setCollideWorldBounds(true);

    // AFTER creating the player, set up collisions
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.player, this.trainerObstacles);

    // Add interaction with trainers
    this.input.keyboard.on("keydown-SPACE", () => {
      this.checkTrainerInteraction();
    });

    // Create animations for player movement if using a sprite
    if (this.textures.exists(spriteKey)) {
      this.createPlayerAnimations(spriteKey);
    }

    // Set up input
    this.cursors = this.input.keyboard?.createCursorKeys()!;

    // Add location text
    this.locationText = addTextObject(
      10,
      10,
      "Route 1",
      TextStyle.BATTLE_INFO,
      { fontSize: "18px" }
    );
    this.locationText.setScrollFactor(0);
    this.locationText.setDepth(10);

    // // Add a button to trigger battle (for testing)
    // const battleButton = this.add.text(10, 40, "Start Battle", {
    //   backgroundColor: "#333",
    //   padding: { x: 10, y: 5 },
    // });
    // battleButton.setScrollFactor(0);
    // battleButton.setInteractive();
    // battleButton.on("pointerdown", () => this.startBattle());

    // If coming from title, fade in the camera
    if (fromTitle) {
      this.cameras.main.fadeIn(500);
    }
  }

  update() {
    if (!this.cursors) {
      return;
    }

    // Handle player movement
    const speed = this.playerSpeed;
    let moving = false;

    // Reset velocity
    this.player.setVelocity(0);

    // Check for movement input
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
      if (this.player.anims) {
        this.player.anims.play("left", true);
      }
      moving = true;
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
      if (this.player.anims) {
        this.player.anims.play("right", true);
      }
      moving = true;
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
      if (!moving && this.player.anims) {
        this.player.anims.play("up", true);
      }
      moving = true;
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
      if (!moving && this.player.anims) {
        this.player.anims.play("down", true);
      }
      moving = true;
    }

    // If not moving, stop animations
    if (!moving && this.player.anims) {
      this.player.anims.stop();
    }
  }

  private createPlayerAnimations(spriteKey: string) {
    this.anims.create({
      key: "up",
      frames: this.anims.generateFrameNumbers(spriteKey, {
        start: 0,
        end: 2,
      }),
      frameRate: 10,
      repeat: 1,
    });
    this.anims.create({
      key: "right",
      frames: this.anims.generateFrameNumbers(spriteKey, { start: 3, end: 5 }),
      frameRate: 10,
      repeat: 1,
    });
    this.anims.create({
      key: "down",
      frames: this.anims.generateFrameNumbers(spriteKey, {
        start: 6,
        end: 8,
      }),
      frameRate: 10,
      repeat: 1,
    });
    this.anims.create({
      key: "left",
      frames: this.anims.generateFrameNumbers(spriteKey, {
        start: 9,
        end: 11,
      }),
      frameRate: 10,
      repeat: 1,
    });
  }

  private startBattle() {
    // Save player position
    this.registry.set("playerPosition", { x: this.player.x, y: this.player.y });
    this.registry.set("fromOverworld", true);

    // Transition to battle scene
    this.cameras.main.fade(500, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("battle");
      (this.scene.get("battle") as BattleScene).returnFromOverworld(true);
    });
  }

  public returnFromBattle() {
    // Restore player position if available
    const position = this.registry.get("playerPosition");
    if (position) {
      this.player.setPosition(position.x, position.y);
    }

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  private checkTrainerInteraction() {
    // Define interaction range
    const interactionRange = 50;

    // Find the closest trainer within range
    let closestTrainer: Phaser.Physics.Arcade.Sprite | undefined;
    let closestDistance = interactionRange;

    this.trainerObstacles.getChildren().forEach((child) => {
      const trainer = child as Phaser.Physics.Arcade.Sprite;
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        trainer.x,
        trainer.y
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestTrainer = trainer;
      }
    });

    // If we found a trainer in range, start battle
    if (closestTrainer) {
      const trainerType = closestTrainer.getData("trainerType");
      const variant = closestTrainer.getData("variant");

      // Start battle with this trainer
      this.startTrainerBattle(trainerType, variant);
    }
  }

  private startTrainerBattle(
    trainerType: TrainerType,
    variant: TrainerVariant
  ) {
    // Save player position
    this.registry.set("playerPosition", { x: this.player.x, y: this.player.y });

    // Save trainer data for battle scene
    this.registry.set("battleTrainerType", trainerType);
    this.registry.set("battleTrainerVariant", variant);

    // Set flag that we're coming from overworld and prepare battle data
    this.registry.set("battleFromOverworld", true);
    this.registry.set("pendingBattleData", {
      waveIndex: 1, // Or whatever wave index you want to use
      battleType: "trainer", // Assuming you have a trainer battle type
      trainerData: {
        type: trainerType,
        variant: variant,
      },
    });

    // Transition to battle scene
    this.cameras.main.fade(500, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      // Start the battle scene
      this.scene.start("battle");
    });
  }
}
