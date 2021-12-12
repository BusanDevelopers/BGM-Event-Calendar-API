/**
 * Define type for the objects that reply as a response of GET /{year}-{month}
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

/**
 * Interface to define event entry of response.eventList
 */
export interface EventEntry {
  id: string;
  name: string;
  date: number;
  category: string | undefined;
}

/**
 * Interface to define response of GET /{year}-{month}
 */
export default interface CalendarEventResponse {
  numEvent: number;
  eventList: Array<EventEntry> | undefined;
}
