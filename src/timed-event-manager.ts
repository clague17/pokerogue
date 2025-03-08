import { globalScene } from "#app/global-scene";
import type { nil } from "#app/utils";
import { isNullOrUndefined } from "#app/utils";
import i18next from "i18next";
import { Species } from "#enums/species";
import type { WeatherPoolEntry } from "#app/data/weather";
import { CLASSIC_CANDY_FRIENDSHIP_MULTIPLIER } from "./data/balance/starters";
import type { MysteryEncounterType } from "./enums/mystery-encounter-type";
import type { MysteryEncounterTier } from "./enums/mystery-encounter-tier";

export enum EventType {
  SHINY,
  NO_TIMER_DISPLAY,
  LUCK
}

interface EventBanner {
  bannerKey?: string;
  xOffset?: number;
  yOffset?: number;
  scale?: number;
  availableLangs?: string[];
}

interface EventEncounter {
  species: Species;
  blockEvolution?: boolean;
  formIndex?: number;
}

interface EventMysteryEncounterTier {
  mysteryEncounter: MysteryEncounterType;
  tier?: MysteryEncounterTier;
  disable?: boolean;
}

interface TimedEvent extends EventBanner {
  name: string;
  eventType: EventType;
  shinyMultiplier?: number;
  classicFriendshipMultiplier?: number;
  luckBoost?: number;
  upgradeUnlockedVouchers?: boolean;
  startDate: Date;
  endDate: Date;
  eventEncounters?: EventEncounter[];
  delibirdyBuff?: string[];
  weather?: WeatherPoolEntry[];
  mysteryEncounterTierChanges?: EventMysteryEncounterTier[];
  luckBoostedSpecies?: Species[];
  boostFusions?: boolean; //MODIFIER REWORK PLEASE
}

const timedEvents: TimedEvent[] = [
  {
    name: "Jen Day 2025",
    eventType: EventType.LUCK,
    luckBoost: 3,
    startDate: new Date(Date.UTC(2025, 1, 8)),
    endDate: new Date(Date.UTC(2026, 3, 9)),
    bannerKey: "jen-header-",
    scale: 0.12,
    availableLangs: [ "en", ],
    eventEncounters: [
      { species: Species.PIKACHU },
      { species: Species.DRAGONITE },
    ],
    luckBoostedSpecies: [
      Species.PIKACHU, Species.RAICHU, Species.ALOLA_RAICHU,
      Species.DRATINI, Species.DRAGONAIR, Species.DRAGONITE,
      Species.RAYQUAZA,
      Species.ARCHALUDON,
      Species.PALKIA,
      Species.BAGON, Species.SHELGON, Species.SALAMENCE, ]
  },
];

export class TimedEventManager {
  constructor() {}

  isActive(event: TimedEvent) {
    return (
      event.startDate < new Date() &&
        new Date() < event.endDate
    );
  }

  activeEvent(): TimedEvent | undefined {
    return timedEvents.find((te: TimedEvent) => this.isActive(te));
  }

  isEventActive(): boolean {
    return timedEvents.some((te: TimedEvent) => this.isActive(te));
  }

  activeEventHasBanner(): boolean {
    const activeEvents = timedEvents.filter((te) => this.isActive(te) && te.hasOwnProperty("bannerFilename"));
    return activeEvents.length > 0;
  }

  getShinyMultiplier(): number {
    let multiplier = 1;
    const shinyEvents = timedEvents.filter((te) => te.eventType === EventType.SHINY && this.isActive(te));
    shinyEvents.forEach((se) => {
      multiplier *= se.shinyMultiplier ?? 1;
    });

    return multiplier;
  }

  getEventBannerFilename(): string {
    return timedEvents.find((te: TimedEvent) => this.isActive(te))?.bannerKey ?? "";
  }

  getEventEncounters(): EventEncounter[] {
    const ret: EventEncounter[] = [];
    timedEvents.filter((te) => this.isActive(te)).map((te) => {
      if (!isNullOrUndefined(te.eventEncounters)) {
        ret.push(...te.eventEncounters);
      }
    });
    return ret;
  }

  /**
   * For events that change the classic candy friendship multiplier
   * @returns The highest classic friendship multiplier among the active events, or the default CLASSIC_CANDY_FRIENDSHIP_MULTIPLIER
   */
  getClassicFriendshipMultiplier(): number {
    let multiplier = CLASSIC_CANDY_FRIENDSHIP_MULTIPLIER;
    const classicFriendshipEvents = timedEvents.filter((te) => this.isActive(te));
    classicFriendshipEvents.forEach((fe) => {
      if (!isNullOrUndefined(fe.classicFriendshipMultiplier) && fe.classicFriendshipMultiplier > multiplier) {
        multiplier = fe.classicFriendshipMultiplier;
      }
    });
    return multiplier;
  }

  /**
   * For events where defeated bosses (Gym Leaders, E4 etc) give out Voucher Plus even if they were defeated before
   * @returns Whether vouchers should be upgraded
   */
  getUpgradeUnlockedVouchers(): boolean {
    return timedEvents.some((te) => this.isActive(te) && (te.upgradeUnlockedVouchers ?? false));
  }

  /**
   * For events where Delibirdy gives extra items
   * @returns list of ids of {@linkcode ModifierType}s that Delibirdy hands out as a bonus
   */
  getDelibirdyBuff(): string[] {
    const ret: string[] = [];
    timedEvents.filter((te) => this.isActive(te)).map((te) => {
      if (!isNullOrUndefined(te.delibirdyBuff)) {
        ret.push(...te.delibirdyBuff);
      }
    });
    return ret;
  }

  /**
   * For events where there's a set weather for town biome (other biomes are hard)
   * @returns Event weathers for town
   */
  getWeather(): WeatherPoolEntry[] {
    const ret: WeatherPoolEntry[] = [];
    timedEvents.filter((te) => this.isActive(te)).map((te) => {
      if (!isNullOrUndefined(te.weather)) {
        ret.push(...te.weather);
      }
    });
    return ret;
  }

  getAllMysteryEncounterChanges(): EventMysteryEncounterTier[] {
    const ret: EventMysteryEncounterTier[] = [];
    timedEvents.filter((te) => this.isActive(te)).map((te) => {
      if (!isNullOrUndefined(te.mysteryEncounterTierChanges)) {
        ret.push(...te.mysteryEncounterTierChanges);
      }
    });
    return ret;
  }

  getEventMysteryEncountersDisabled(): MysteryEncounterType[] {
    const ret: MysteryEncounterType[] = [];
    timedEvents.filter((te) => this.isActive(te) && !isNullOrUndefined(te.mysteryEncounterTierChanges)).map((te) => {
      te.mysteryEncounterTierChanges?.map((metc) => {
        if (metc.disable) {
          ret.push(metc.mysteryEncounter);
        }
      });
    });
    return ret;
  }

  getMysteryEncounterTierForEvent(encounterType: MysteryEncounterType, normal: MysteryEncounterTier): MysteryEncounterTier {
    let ret = normal;
    timedEvents.filter((te) => this.isActive(te) && !isNullOrUndefined(te.mysteryEncounterTierChanges)).map((te) => {
      te.mysteryEncounterTierChanges?.map((metc) => {
        if (metc.mysteryEncounter === encounterType) {
          ret = metc.tier ?? normal;
        }
      });
    });
    return ret;
  }

  getEventLuckBoost(): number {
    let ret = 0;
    const luckEvents = timedEvents.filter((te) => this.isActive(te) && !isNullOrUndefined(te.luckBoost));
    luckEvents.forEach((le) => {
      ret += le.luckBoost!;
    });
    return ret;
  }

  getEventLuckBoostedSpecies(): Species[] {
    const ret: Species[] = [];
    timedEvents.filter((te) => this.isActive(te)).map((te) => {
      if (!isNullOrUndefined(te.luckBoostedSpecies)) {
        ret.push(...te.luckBoostedSpecies.filter(s => !ret.includes(s)));
      }
    });
    return ret;
  }

  areFusionsBoosted(): boolean {
    return timedEvents.some((te) => this.isActive(te) && te.boostFusions);
  }
}

export class TimedEventDisplay extends Phaser.GameObjects.Container {
  private event: TimedEvent | nil;
  private eventTimerText: Phaser.GameObjects.Text;
  private banner: Phaser.GameObjects.Image;
  private availableWidth: number;
  private eventTimer: NodeJS.Timeout | null;

  constructor(x: number, y: number, event?: TimedEvent) {
    super(globalScene, x, y);
    this.availableWidth = globalScene.scaledCanvas.width;
    this.event = event;
    this.setVisible(false);
  }

  /**
   * Set the width that can be used to display the event timer and banner. By default
   * these elements get centered horizontally in that space, in the bottom left of the screen
   */
  setWidth(width: number) {
    if (width !== this.availableWidth) {
      this.availableWidth = width;
      const xPosition = this.availableWidth / 2 + (this.event?.xOffset ?? 0);
      if (this.banner) {
        this.banner.x = xPosition;
      }

    }
  }

  setup() {
    const lang = i18next.resolvedLanguage;
    if (this.event && this.event.bannerKey) {
      let key = this.event.bannerKey;
      if (lang && this.event.availableLangs && this.event.availableLangs.length > 0) {
        if (this.event.availableLangs.includes(lang)) {
          key += lang;
        } else {
          key += "en";
        }
      }
      const padding = 5;
      const yPosition = globalScene.game.canvas.height / 6 - padding - (this.event.yOffset ?? 0);
      this.banner = new Phaser.GameObjects.Image(globalScene, 0, yPosition - padding, key);
      this.banner.setName("img-event-banner");
      this.banner.setOrigin(0, 1);
      this.banner.setScale(this.event.scale ?? 0.18);
      this.add(this.banner);
    }
  }

  show() {
    this.setVisible(true);
  }

  clear() {
    this.setVisible(false);
    this.eventTimer && clearInterval(this.eventTimer);
    this.eventTimer = null;
  }

  private timeToGo(date: Date) {

    // Utility to add leading zero
    function z(n) {
      return (n < 10 ? "0" : "") + n;
    }
    const now = new Date();
    let diff = Math.abs(date.getTime() - now.getTime());

    // Allow for previous times
    diff = Math.abs(diff);

    // Get time components
    const days = diff / 8.64e7 | 0;
    const hours = diff % 8.64e7 / 3.6e6 | 0;
    const mins  = diff % 3.6e6 / 6e4 | 0;
    const secs  = Math.round(diff % 6e4 / 1e3);

    // Return formatted string
    return i18next.t("menu:eventTimer", { days: z(days), hours: z(hours), mins: z(mins), secs: z(secs) });
  }

  updateCountdown() {
    if (this.event && this.event.eventType !== EventType.NO_TIMER_DISPLAY) {
      this.eventTimerText.setText(this.timeToGo(this.event.endDate));
    }
  }
}
