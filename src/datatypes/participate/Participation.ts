/**
 * Define type and CRUD methods for each participate entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import NotFoundError from '../../exceptions/NotFoundError';

/**
 * Interface to define participation entry in DB
 */
interface ParticipationDB {
  id: number;
  event_id: number;
  date: string;
  participant_name: string;
  phone_number: string | null;
  email: string;
  comment: string | null;
}

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
   * Retrieve participation tickets associated with specific event
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param eventId unique id referring the event
   * @return {Promise<Array<Participation>>} return array of Participations
   */
  static async readByEventId(
    dbClient: mariadb.Pool,
    eventId: number
  ): Promise<Array<Participation>> {
    // Query
    const queryResult = await dbClient.query(
      'SELECT * FROM participation WHERE event_id = ?',
      [eventId]
    );

    return queryResult.map((qr: ParticipationDB) => {
      return new Participation(
        qr.event_id,
        new Date(qr.date),
        qr.participant_name,
        qr.email,
        qr.phone_number,
        qr.comment,
        qr.id
      );
    });
  }

  /**
   * Retrieve participation associated with the eventID and ticketID
   *
   * @param dbClient DB Connection Pool
   * @param eventId event ID associated with the participation
   * @param participationId unique participation ID
   * @return {Promise<Participation>} return Participation
   */
  static async readByEventIdTicketId(
    dbClient: mariadb.Pool,
    eventId: number,
    participationId: number
  ): Promise<Participation> {
    const queryResult = await dbClient.query(
      'SELECT * FROM participation WHERE event_id = ? AND id = ?',
      [eventId, participationId]
    );
    if (queryResult.length === 0) {
      throw new NotFoundError();
    }

    const {id, event_id, date, participant_name} = queryResult[0];
    const {phone_number, email, comment} = queryResult[0];
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

  /**
   * Update an existing participation
   *
   * @param dbClient DB Connection Pool
   * @param eventId event id associated with the participation
   * @param participationId unique participation ID
   * @param participation Participation Information
   * @return {Promise<mariadb.UpsertResult>} DB Operation Result
   */
  static async update(
    dbClient: mariadb.Pool,
    eventId: number,
    participationId: number,
    participation: Participation
  ): Promise<mariadb.UpsertResult> {
    const {participantName, email, phoneNumber, comment} = participation;
    const queryResult = await dbClient.query(
      'UPDATE participation SET participation_name = ?, email = ?, phone_number = ?, comment = ? WHERE event_id = ? AND id = ?',
      [participantName, email, phoneNumber, comment, eventId, participationId]
    );

    if (queryResult.affectedRows === 0) {
      throw new NotFoundError();
    }
    return queryResult;
  }

  /**
   * Delete an existing participation from database
   *
   * @param dbClient DB Connection Pool
   * @param eventId event ID for the event associated with the participation
   * @param participationId unique participation ID for the delete target
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async delete(
    dbClient: mariadb.Pool,
    eventId: number,
    participationId: number
  ): Promise<mariadb.UpsertResult> {
    const queryResult = await dbClient.query(
      'DELETE FROM participation WHERE id = ? AND event_id = ?',
      [participationId, eventId]
    );
    if (queryResult.affectedRows === 0) {
      throw new NotFoundError();
    }
    return queryResult;
  }
}
