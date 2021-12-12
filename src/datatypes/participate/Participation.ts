/**
 * Define type and CRUD methods for each participate entry
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as Cosmos from '@azure/cosmos';
import NotFoundError from '../../exceptions/NotFoundError';
import BadRequestError from '../../exceptions/BadRequestError';
import ServerConfig from '../../ServerConfig';

// DB Container id
const PARTICIPATION = 'participation';

/**
 * Interface for ParticipationEditInfoDB
 */
export interface ParticipationEditInfoDB {
  participantName?: string | undefined; // Name of participant
  email?: string | undefined; // email is required
  phoneNumber?: string | undefined; // Optional field for phone number
  comment?: string | undefined; // additional comment
}

/**
 * Class for Participation
 */
export default class Participation {
  id: string | undefined; // Participation ticket ID
  eventId: string; // associated Event ID
  participantName: string; // Name of participant
  email: string; // email is required
  phoneNumber: string | undefined; // Optional field for phone number
  comment: string | undefined; // additional comment
  createdAt: Date | string;

  /**
   * Constructor for Participation Object
   *
   * @param eventId eventID which participation links to
   * @param createdAt Participation Created Date
   * @param participantName name of participant
   * @param email email of participant
   * @param phoneNumber optional field for phone number of participant
   * @param comment optional field to write down additional comment
   * @param id participation ticket id (From DB)
   */
  constructor(
    eventId: string,
    createdAt: Date,
    participantName: string,
    email: string,
    phoneNumber?: string,
    comment?: string,
    id?: string
  ) {
    this.eventId = eventId;
    this.createdAt = createdAt;
    this.participantName = participantName;
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.comment = comment;
    this.id = id;
  }

  /**
   * Create new entry in participate container
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param participation Participation Information
   * @return {Promise<Cosmos.ItemResponse<Participation>>} db operation result
   */
  static async create(
    dbClient: Cosmos.Database,
    participation: Participation
  ): Promise<Cosmos.ItemResponse<Participation>> {
    // Generate createdAt string
    participation.createdAt = (participation.createdAt as Date).toISOString();
    // Generate id
    participation.id = ServerConfig.hash(
      PARTICIPATION,
      participation.eventId,
      participation.eventId +
        participation.createdAt +
        participation.participantName +
        participation.email
    );

    const dbOps = await dbClient
      .container(PARTICIPATION)
      .items.create<Participation>(participation);
    // Check for error
    if (dbOps.statusCode === 409) {
      throw new BadRequestError();
    }
    /* istanbul ignore next */
    if (dbOps.statusCode >= 400) {
      throw new Error(JSON.stringify(dbOps));
    }

    return dbOps;
  }

  /**
   * Retrieve participation tickets associated with specific event
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param eventId unique id referring the event
   * @return {Promise<Array<Participation>>} return array of Participation
   */
  static async readByEventId(
    dbClient: Cosmos.Database,
    eventId: string
  ): Promise<Array<Participation>> {
    // Query
    const dbOps = await dbClient
      .container(PARTICIPATION)
      .items.query<Participation>({
        query: 'SELECT * FROM participation AS p WHERE p.eventId = @eventId',
        parameters: [{name: '@eventId', value: eventId}],
      })
      .fetchAll();

    return dbOps.resources.map((op: Participation) => {
      // Generate createdAt
      op.createdAt = new Date(op.createdAt);
      return op;
    });
  }

  /**
   * Retrieve participation associated with the eventID and ticketID
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param eventId event ID associated with the participation
   * @param participationId unique participation ID
   * @return {Promise<Participation>} return Participation
   */
  static async readByEventIdTicketId(
    dbClient: Cosmos.Database,
    eventId: string,
    participationId: string
  ): Promise<Participation> {
    // Query
    const dbOps = await dbClient
      .container(PARTICIPATION)
      .item(participationId, eventId)
      .read<Participation>();

    if (dbOps.statusCode === 404) {
      throw new NotFoundError();
    }
    const participation = dbOps.resource as Participation;
    participation.createdAt = new Date(participation.createdAt);
    return participation;
  }

  /**
   * Update an existing participation
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param eventId event id associated with the participation
   * @param participationId unique participation ID
   * @param participationEditInfo Participation edit Information
   * @return {Promise<Cosmos.ItemResponse<Participation>>} DB Operation Result
   */
  static async update(
    dbClient: Cosmos.Database,
    eventId: string,
    participationId: string,
    participationEditInfo: ParticipationEditInfoDB
  ): Promise<Cosmos.ItemResponse<Participation>> {
    // Generate participation document
    const participation = await Participation.readByEventIdTicketId(
      dbClient,
      eventId,
      participationId
    );
    participation.createdAt = (participation.createdAt as Date).toString();
    participation.participantName = participationEditInfo.participantName
      ? participationEditInfo.participantName
      : participation.participantName;
    participation.email = participationEditInfo.email
      ? participationEditInfo.email
      : participation.email;
    participation.phoneNumber = participationEditInfo.phoneNumber
      ? participationEditInfo.phoneNumber
      : participation.phoneNumber;
    participation.comment = participationEditInfo.comment
      ? participationEditInfo.comment
      : participation.comment;

    // Update participation
    return await dbClient
      .container(PARTICIPATION)
      .item(participationId, eventId)
      .replace<Participation>(participation);
  }

  /**
   * Delete an existing participation from database
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param eventId event ID for the event associated with the participation
   * @param participationId unique participation ID for the delete target
   * @return {Promise<Cosmos.ItemResponse<Participation>>} db operation result
   */
  static async delete(
    dbClient: Cosmos.Database,
    eventId: string,
    participationId: string
  ): Promise<Cosmos.ItemResponse<Participation>> {
    let dbOps;
    try {
      dbOps = await dbClient
        .container(PARTICIPATION)
        .item(participationId, eventId)
        .delete<Participation>();
    } catch (e) {
      /* istanbul ignore else */
      if ((e as Cosmos.ErrorResponse).code === 404) {
        throw new NotFoundError();
      } else {
        throw e;
      }
    }

    return dbOps;
  }

  /**
   * Function to delete participation associated with given eventId
   *
   * @param dbClient DB Client (Cosmos Database)
   * @param eventId event ID for the event associated with the participation
   * @return {Promise<Cosmos.ItemResponse<Participation>[]>} db operation result
   */
  static async deleteByEventId(
    dbClient: Cosmos.Database,
    eventId: string
  ): Promise<Cosmos.ItemResponse<Participation>[]> {
    // Retrieve list of documents with given eventId
    const dbOps = await dbClient
      .container(PARTICIPATION)
      .items.query(
        `SELECT p.id FROM participation AS p WHERE p.eventId = "${eventId}"`
      )
      .fetchAll();

    // Delete all partition
    const returnOps = [];
    for (let index = 0; index < dbOps.resources.length; ++index) {
      returnOps.push(
        await Participation.delete(dbClient, eventId, dbOps.resources[index].id)
      );
    }

    return returnOps;
  }
}
