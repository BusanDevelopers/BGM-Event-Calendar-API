/**
 * Define type and CRUD methods for each event entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import NotFoundError from '../../exceptions/NotFoundError';

/**
 * Interface to define event entry in DB
 */
interface EventDB {
  id: number;
  date: string;
  name: string;
  detail: string | null;
  category: string | null;
  editor: string;
}

/**
 * Class for Event
 */
export default class Event {
  id: number | null; // Event ID
  date: Date; // Event Date
  name: string; // Event Name
  detail: string | null; // Event detailed description
  category: string | null; // Event Category
  editor: string; // username of admin who edit the event lastly

  /**
   * Constructor for Event Object
   *
   * @param date Event date
   * @param name Event name
   * @param editor username of admin who edit the event lastly
   * @param detail Event detailed description
   * @param category Event category
   * @param id numeric id (From DB)
   */
  constructor(
    date: Date,
    name: string,
    editor: string,
    detail?: string | null,
    category?: string | null,
    id?: number
  ) {
    this.date = date;
    this.name = name;
    this.editor = editor;
    this.detail = detail ? detail : null;
    this.category = category ? category : null;
    this.id = id ? id : null;
  }

  /**
   * Create new entry in event table
   *
   * @param dbClient DB Connection Pool (MariaDB)
   * @param event Event Information
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async create(
    dbClient: mariadb.Pool,
    event: Event
  ): Promise<mariadb.UpsertResult> {
    return await dbClient.query(
      String.prototype.concat(
        'INSERT INTO event ',
        '(date, name, detail, category, editor) ',
        'VALUES (?, ?, ?, ?, ?)'
      ),
      [event.date, event.name, event.detail, event.category, event.editor]
    );
  }

  /**
   * Retrieve event associated with the eventID
   *
   * @param dbClient DB Connection Pool
   * @param eventId unique event ID associated with the Event
   * @return {Promise<Event>} return Event
   */
  static async read(dbClient: mariadb.Pool, eventId: number): Promise<Event> {
    const queryResult = await dbClient.query(
      'SELECT * FROM event WHERE id = ?',
      [eventId]
    );
    if (queryResult.length === 0) {
      throw new NotFoundError();
    }

    const {date, name, editor, detail, category} = queryResult[0];
    return new Event(new Date(date), name, editor, detail, category);
  }

  /**
   * Retrieve events of specific month
   *
   * @param dbClient DB Connection Pool (mariaDB)
   * @param year year
   * @param month month
   * @return {Promise<Array<Event>>} return array of Events
   */
  static async readByDate(
    dbClient: mariadb.Pool,
    year: number,
    month: number
  ): Promise<Array<Event>> {
    // Get start and end date of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(
      year,
      month - 1,
      new Date(year, month, 0).getDate()
    );

    // Query
    const queryResult = await dbClient.query(
      'SELECT * FROM event WHERE date BETWEEN ? AND ?',
      [startDate, endDate]
    );

    return queryResult.map((qr: EventDB) => {
      const {date, name, editor, detail, category, id} = qr;
      return new Event(new Date(date), name, editor, detail, category, id);
    });
  }

  /**
   * Update an existing event
   *
   * @param dbClient DB Connection Pool
   * @param eventId unique event ID associated with the Event
   * @param event Event Information
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async update(
    dbClient: mariadb.Pool,
    eventId: number,
    event: Event
  ): Promise<mariadb.UpsertResult> {
    const {date, name, detail, category, editor} = event;
    const queryResult = await dbClient.query(
      'UPDATE event SET date = ?, name = ?, detail = ?, category = ?, editor = ? WHERE id = ?',
      [date, name, detail, category, editor, eventId]
    );
    /* istanbul ignore next */
    if (queryResult.affectedRows === 0) {
      throw new NotFoundError();
    }
    return queryResult;
  }

  /**
   * Delete an existing event from database
   *
   * @param dbClient DB Connection Pool
   * @param eventID unique event ID associated with the Event
   * @return {Promise<mariadb.UpsertResult>} db operation result
   */
  static async delete(
    dbClient: mariadb.Pool,
    eventID: number
  ): Promise<mariadb.UpsertResult> {
    const queryResult = await dbClient.query(
      'DELETE FROM event WHERE id = ?',
      eventID
    );
    if (queryResult.affectedRows === 0) {
      throw new NotFoundError();
    }
    return queryResult;
  }
}
