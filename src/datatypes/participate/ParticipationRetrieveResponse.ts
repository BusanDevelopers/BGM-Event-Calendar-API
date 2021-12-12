/**
 * Define type for the objects that reply as a response of
 *   GET /event/{eventId}/participate
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

/**
 * Interface to define participation entry of response.participantsList
 */
export interface ParticipationEntry {
  id: string;
  participantName: string;
  phoneNumber: string | undefined;
  email: string;
  comment: string | undefined;
}

/**
 * Interface to define response of GET /event/{eventId}/participate
 */
export default interface ParticipationRetrieveResponse {
  numParticipants: number;
  participantsList: Array<ParticipationEntry> | undefined;
}
