type StudioData = Record<string, unknown>;
type StudioCallback<T> = (value: T) => void | Promise<void>;
type StudioTimerCallback = () => void | Promise<void>;
type StudioDate = Date | string | number;
type StudioSun = 'sunrise' | 'sunset';
type StudioAstro = StudioSun | 'dawn' | 'dusk' | 'solarNoon' | 'nadir';
type StudioSnapshot = {state: string; attributes: StudioData; last_updated?: string; last_changed?: string};
type StudioStateChange = {type: 'state'; entity: string; previous: StudioSnapshot | null; current: StudioSnapshot | null};
type StudioSchedule =
  | {trigger: 'time'; at: string | string[]; weekday?: string[]}
  | {trigger: 'time_pattern'; hours: string | number; minutes: string | number; seconds: string | number}
  | {trigger: 'iobroker'; schedule: unknown};
type StudioScheduleEvent = {type: 'schedule'; index: number | string; time: string; weekday: string} | undefined;
type StudioHistoryPoint = {ts: number; val: string | number};

declare const ha: {
  log(message: string): void;
  readState(entity: string): string;
  readAttribute(entity: string, name: string): unknown;
  stateSnapshot(entity: string): string;
  getState(entity: string): {val: string | boolean} | null;
  setState(entity: string, value: boolean): void;
  setNumber(entity: string, value: number): void;
  setText(entity: string, value: string): void;
  callAction(action: string, entity: string, data?: StudioData): void;
  onState(entity: string, callback: StudioCallback<StudioStateChange>): void;
  onAttribute(entity: string, name: string, callback: StudioCallback<StudioStateChange>): void;
  onEvent(name: string, callback: StudioCallback<unknown>): void;
  fireEvent(name: string, data?: StudioData): void;
  notify(entity: string, message: string, title?: string): void;
  publishMqtt(topic: string, message: string, retain?: boolean): void;
  history(entity: string, start: number | Date, end: number | Date, mode: string, step: number, count: number,
    callback: StudioCallback<StudioHistoryPoint[]>): void;
  schedule(pattern: StudioSchedule, callback: StudioCallback<StudioScheduleEvent>): void;
  namedSchedule(name: string, cron: string, callback: StudioCallback<StudioScheduleEvent>): void;
  stopSchedule(name: string): void;
  onSun(event: StudioSun, callback: StudioCallback<StudioScheduleEvent>, offset?: number): void;
  scheduleFromDateTime(entity: string, callback: StudioCallback<StudioScheduleEvent>): void;
  timeout(name: string, delay: number, callback: StudioTimerCallback): void;
  interval(name: string, delay: number, callback: StudioTimerCallback): void;
  pause(delay: number): Promise<void>;
  cancelTimer(name: string, repeat?: boolean): boolean;
  timerReference(name: string, repeat: boolean): string | null;
  currentTime(format: 'date'): Date;
  currentTime(format: 'unix'): number;
  currentTime(format: string): Date | string | number;
  formatDate(input: StudioDate, pattern: string, locale?: string): string;
  convertDate(input: StudioDate, unit: string, format: 'date'): Date;
  convertDate(input: StudioDate, unit: string, format: string): Date | string | number;
  formatDuration(milliseconds: number, format: string): string;
  calendarBoundary(type: string): number;
  astroTime(event: StudioAstro, offset: number): Date;
  compareTime(op: string, start: StudioDate, end?: StudioDate | null, at?: StudioDate | null): boolean;
  shiftTime(base: Date, amount: number, unit: string): Date;
  shiftTime(base: number, amount: number, unit: string): number;
};
declare const getState: typeof ha.getState;
declare const setState: typeof ha.setState;
declare function log(value: unknown): void;
