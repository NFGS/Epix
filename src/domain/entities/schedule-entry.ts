export interface ScheduleEntry {
  episodeId: number;
  airdate: string;
  airtime?: string;
  episodeName: string;
  season: number;
  number: number;
  showId: number;
  showName: string;
  showImageUrl?: string;
  channel?: string;
}
