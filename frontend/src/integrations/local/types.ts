export type LocalRecord = Record<string, unknown>;

export type LocalDatabase = {
  tables: Record<string, LocalRecord[]>;
};
