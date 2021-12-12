/**
 * express Router middleware for Participate APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import * as Cosmos from '@azure/cosmos';
import BadRequestError from '../exceptions/BadRequestError';
import Event from '../datatypes/event/Event';
import Participation, {
  ParticipationEditInfoDB,
} from '../datatypes/participate/Participation';
import ParticipationForm from '../datatypes/participate/ParticipationForm';
import ParticipationEditForm from '../datatypes/participate/ParticipationEditForm';
import ParticipationRetrieveResponse, {
  ParticipationEntry,
} from '../datatypes/participate/ParticipationRetrieveResponse';
import {validateParticipationForm} from '../functions/inputValidator/participate/validateParticipationForm';
import {validateParticipationEditForm} from '../functions/inputValidator/participate/validateParticipationEditForm';
import verifyAccessToken from '../functions/JWT/verifyAccessToken';

// Path: /event/{eventID}/participate
const participateRouter = express.Router({mergeParams: true});

// POST /event/{eventID}/participate
participateRouter.post('/', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;
  const {eventId} = req.params as {eventId: string};

  try {
    // Verify User Input
    const participationForm: ParticipationForm = req.body;
    if (!validateParticipationForm(participationForm)) {
      throw new BadRequestError();
    }

    // Check Event Existence
    await Event.read(dbClient, eventId);

    // Add request to DB
    const {participantName, email, phoneNumber, comment} = participationForm;
    const newEntry = new Participation(
      eventId,
      new Date(),
      participantName,
      email,
      phoneNumber,
      comment
    );
    await Participation.create(dbClient, newEntry);

    // Response
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

// GET /event/{eventID}/participate
participateRouter.get('', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;
  const {eventId} = req.params as {eventId: string};

  try {
    // Verify Admin Access Token
    await verifyAccessToken(req, req.app.get('jwtAccessKey'));

    // Check for event existence
    await Event.read(dbClient, eventId);

    // DB Operation
    const participationList = await Participation.readByEventId(
      dbClient,
      eventId
    );

    // Response
    if (participationList.length === 0) {
      res.status(200).json({numParticipants: 0});
    } else {
      const replyObj: ParticipationRetrieveResponse = {
        numParticipants: participationList.length,
        participantsList: [],
      };
      participationList.forEach(p => {
        (replyObj.participantsList as ParticipationEntry[]).push({
          id: p.id as string,
          participantName: p.participantName,
          phoneNumber: p.phoneNumber ? p.phoneNumber : undefined,
          email: p.email,
          comment: p.comment ? p.comment : undefined,
        });
      });
      res.status(200).json(replyObj);
    }
  } catch (e) {
    next(e);
  }
});

// PUT: /event/{eventID}/participate/{ticketID}
participateRouter.put('/:ticketId', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;
  const {eventId} = req.params as {eventId: string; ticketId: string};
  const {ticketId} = req.params;

  try {
    // Verify Admin Access Token
    await verifyAccessToken(req, req.app.get('jwtAccessKey'));

    // Verify User's request
    const participationEditForm: ParticipationEditForm = req.body;
    if (!validateParticipationEditForm(participationEditForm)) {
      throw new BadRequestError();
    }

    // Create new participation object
    const participationEditInfo: ParticipationEditInfoDB = {};
    participationEditInfo.participantName =
      participationEditForm.participantName
        ? participationEditForm.participantName
        : undefined;
    participationEditInfo.email = participationEditForm.email
      ? participationEditForm.email
      : undefined;
    participationEditInfo.phoneNumber = participationEditForm.phoneNumber
      ? participationEditForm.phoneNumber
      : undefined;
    participationEditInfo.comment = participationEditForm.comment
      ? participationEditForm.comment
      : undefined;

    // DB Operation
    await Participation.update(
      dbClient,
      eventId,
      ticketId,
      participationEditInfo
    );

    // Response
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

// DELETE /event/{eventID}/participate/{ticketID}
participateRouter.delete('/:ticketId', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;
  const {eventId} = req.params as {eventId: string; ticketId: string};
  const {ticketId} = req.params;

  try {
    // Verify Admin Access Token
    await verifyAccessToken(req, req.app.get('jwtAccessKey'));

    // DB Operation
    await Participation.delete(dbClient, eventId, ticketId);

    // Response
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

export default participateRouter;
