/**
 * Define type and CRUD methods for each event entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import ServerConfig from '../../ServerConfig';
import NotFoundError from '../../exceptions/NotFoundError';
import Participation from '../participate/Participation';

// DB Container id
const EVENT = 'event';

/**
 * Interface for EventEditInfoDB
 */
export interface EventEditInfoDB {
  date?: Date | undefined; // Event Date
  name?: string | undefined; // Event Name
  detail?: string | undefined; // Event detailed description
  category?: string | undefined; // Event Category
  editor?: string | undefined; // username of admin who edit the event lastly
}

/**
 * Class for Event
 */
export default class Event {
  id: string | undefined; // Event ID
  date: Date | string; // Event Date
  name: string; // Event Name
  detail: string | undefined; // Event detailed description
  category: string | undefined; // Event Category
  editor: string; // username of admin who edit the event lastly
  createdAt: Date | string;

  /**
   * Constructor for Event Object
   *
   * @param date Event date
   * @param createdAt When event created
   * @param name Event name
   * @param editor username of admin who edit the event lastly
   * @param detail Event detailed description
   * @param category Event category
   * @param id event id (From DB)
   */
  constructor(
    date: Date,
    createdAt: Date,
    name: string,
    editor: string,
    detail?: string,
    category?: string,
    id?: string
  ) {
    this.date = date;
    this.createdAt = createdAt;
    this.name = name;
    this.editor = editor;
    this.detail = detail;
    this.category = category;
    this.id = id;
  }

  /**
   * Create new entry in event container
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param event Event Information
   * @return {Promise<Cosmos.ItemResponse<Admin>>} db operation result
   */
  static async create(
    dbClient: Cosmos.Database,
    event: Event
  ): Promise<Cosmos.ItemResponse<Event>> {
    // Generate date and createdAt string
    event.date = (event.date as Date).toISOString();
    event.createdAt = (event.createdAt as Date).toISOString();
    // Generate id
    event.id = ServerConfig.hash(
      EVENT,
      event.editor,
      event.date + event.createdAt + event.name
    );

    const dbOps = await dbClient.container(EVENT).items.create<Event>(event);
    // Check for error
    /* istanbul ignore next */
    if (dbOps.statusCode >= 400) {
      throw new Error(JSON.stringify(dbOps));
    }

    return dbOps;
  }

  /**
   * Retrieve event associated with the eventID
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param eventId unique event ID associated with the Event
   * @return {Promise<Event>} return Event
   */
  static async read(
    dbClient: Cosmos.Database,
    eventId: string
  ): Promise<Event> {
    // Query
    const dbOps = await dbClient.container(EVENT).item(eventId).read<Event>();

    // Error
    if (dbOps.statusCode === 404) {
      throw new NotFoundError();
    }
    /* istanbul ignore next */
    if (dbOps.statusCode >= 400) {
      throw new Error(JSON.stringify(dbOps));
    }

    const event = dbOps.resource as Event;
    event.date = new Date(event.date);
    event.createdAt = new Date(event.createdAt);
    return event;
  }

  /**
   * Retrieve events of specific month
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param year year
   * @param month month
   * @return {Promise<Array<Event>>} return array of Events
   */
  static async readByDate(
    dbClient: Cosmos.Database,
    year: number,
    month: number
  ): Promise<Array<Event>> {
    // Get start and end date of the month
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(
      year,
      month - 1,
      new Date(year, month, 0).getDate()
    ).toISOString();

    // Query
    const dbOps = await dbClient
      .container(EVENT)
      .items.query<Event>({
        query:
          'SELECT * FROM event AS e WHERE e.date BETWEEN @startDate AND @endDate',
        parameters: [
          {name: '@startDate', value: startDate},
          {name: '@endDate', value: endDate},
        ],
      })
      .fetchAll();

    return dbOps.resources.map((op: Event) => {
      // Generate Date
      op.date = new Date(op.date);
      op.createdAt = new Date(op.createdAt);
      return op;
    });
  }

  /**
   * Update an existing event
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param eventId unique event ID associated with the Event
   * @param eventEditInfo Event edit Information
   * @return {Promise<Cosmos.ItemResponse<Event>} db operation result
   */
  static async update(
    dbClient: Cosmos.Database,
    eventId: string,
    eventEditInfo: EventEditInfoDB
  ): Promise<Cosmos.ItemResponse<Event>> {
    // Generate event document
    const event = await Event.read(dbClient, eventId);
    event.date = eventEditInfo.date
      ? eventEditInfo.date.toISOString()
      : (event.date as Date).toISOString();
    event.name = eventEditInfo.name ? eventEditInfo.name : event.name;
    event.detail = eventEditInfo.detail ? eventEditInfo.detail : event.detail;
    event.category = eventEditInfo.category
      ? eventEditInfo.category
      : event.category;
    event.editor = eventEditInfo.editor as string;

    // Update event
    return await dbClient.container(EVENT).item(eventId).replace<Event>(event);
  }

  /**
   * Delete an existing event from database
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param eventID unique event ID associated with the Event
   * @return {Promise<Cosmos.ItemResponse<Event>>} db operation result
   */
  static async delete(
    dbClient: Cosmos.Database,
    eventID: string
  ): Promise<Cosmos.ItemResponse<Event>> {
    // Delete Query
    let dbOps;
    try {
      dbOps = await dbClient.container(EVENT).item(eventID).delete<Event>();
    } catch (e) {
      /* istanbul ignore else */
      if ((e as Cosmos.ErrorResponse).code === 404) {
        throw new NotFoundError();
      } else {
        throw e;
      }
    }

    // Delete participation
    await Participation.deleteByEventId(dbClient, eventID);

    return dbOps;
  }
}
