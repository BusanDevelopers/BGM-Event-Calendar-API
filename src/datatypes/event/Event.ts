/**
 * Define type and CRUD methods for each event entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as mariadb from 'mariadb';
import NotFoundError from '../../exceptions/NotFoundError';

/**
 * Class for Event
 */
export default class Event {
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
   */
  constructor(
    date: Date,
    name: string,
    editor: string,
    detail?: string,
    category?: string
  ) {
    this.date = date;
    this.name = name;
    this.editor = editor;
    this.detail = null;
    this.category = null;
    if (detail !== undefined) {
      this.detail = detail;
    }
    if (category !== undefined) {
      this.category = category;
    }
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
      'DELETE FROM table WHERE id = ?',
      eventID
    );
    if (queryResult.affectedRows === 0) {
      throw new NotFoundError();
    }
    return queryResult;
  }
}
