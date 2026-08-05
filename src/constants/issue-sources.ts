export const ISSUE_SOURCES = {
  MANUAL: "MANUAL",
  GAME_NEMO_SUPERSTAR: "GAME_NEMO_SUPERSTAR",
} as const;

export type IssueSource =
  (typeof ISSUE_SOURCES)[keyof typeof ISSUE_SOURCES];
