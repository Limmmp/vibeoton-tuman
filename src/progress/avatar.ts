import type { AvatarAppearance, ProgressState } from "./types.ts";

export const DEFAULT_AVATAR: AvatarAppearance = {
  bodyColor: "#3FB8AF",
  accentColor: "#F5B83D",
  equipped: {},
};

export function appearanceFromProgress(progress: ProgressState): AvatarAppearance {
  return {
    ...DEFAULT_AVATAR,
    equipped: { ...progress.equipped },
  };
}
