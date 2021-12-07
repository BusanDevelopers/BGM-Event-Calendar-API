/**
 * Define type and CRUD methods for each participate entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';

export default class Participation {
  id: number | null; // Participation ticket ID
  eventId: number; // associated Event ID
  date: Date; // When the ticket created
  participantName: string; // Name of participant
  phoneNumber: string | null; // Optional field for phone number
  email: string; // email is required
  comment: string | null; // additional comment

  constructor(
    eventId: number,
    date: Date,
    participantName: string,
    email: string,
    phoneNumber?: string | null,
    comment?: string | null,
    id?: number
  ) {
    this.eventId = eventId;
    this.date = date;
    this.participantName = participantName;
    this.email = email;
    this.phoneNumber = phoneNumber ? phoneNumber : null;
    this.comment = comment ? comment : null;
    this.id = id ? id : null;
  }

  /**
   * Create new entry in participate table
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param participation Participation Information
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async create(
    dbClient: mariadb.Pool,
    participation: Participation
  ): Promise<mariadb.UpsertResult> {
    const {eventId, date, participantName, phoneNumber, email, comment} =
      participation;
    return await dbClient.query(
      String.prototype.concat(
        'INSERT INTO participation ',
        '(event_id, date, participant_name, phone_number, email, comment) ',
        'VALUES (?, ?, ?, ?, ?, ?)'
      ),
      [eventId, date, participantName, phoneNumber, email, comment]
    );
  }

  /**
   * Retrieve a participate table's entry using eventId, name, and email
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param eventId unique id referring the event
   * @param name participant's name
   * @param email participant's email
   * @return {Promise<Participation | undefined>} either undefined
   *   or found Participation
   */
  static async readByEventIdNameEmail(
    dbClient: mariadb.Pool,
    eventId: number,
    name: string,
    email: string
  ): Promise<Participation | undefined> {
    // DB Query
    const queryResult = await dbClient.query(
      String.prototype.concat(
        'SELECT * FROM participation ',
        'WHERE event_id = ? AND participant_name = ? AND email = ?'
      ),
      [eventId, name, email]
    );

    if (queryResult.length === 0) {
      return undefined;
    } else {
      const {id, event_id, date} = queryResult[0];
      const {participant_name, phone_number, email, comment} = queryResult[0];
      return new Participation(
        event_id,
        new Date(date),
        participant_name,
        email,
        phone_number,
        comment,
        id
      );
    }
  }
}
