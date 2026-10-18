export type IntroPhase =
  | "loading"
  | "assembly"
  | "lock_rotation"
  | "lock_unfolding"
  | "disintegration"
  | "vortex"
  | "doors_opening"
  | "welcome_reveal"
  | "completed";

export interface LockConfig {
  n: number;
  step1Turns: number;
  step2Turns: number;
  step3Turns: number;
  rotationDuration: number;
}

export const DEFAULT_LOCK_CONFIG: LockConfig = {
  n: 5,
  step1Turns: 5,
  step2Turns: 2,
  step3Turns: 3,
  rotationDuration: 1.1,
};
