/**
 * express Router middleware for Participate APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import * as mariadb from 'mariadb';
import BadRequestError from '../exceptions/BadRequestError';
import NotFoundError from '../exceptions/NotFoundError';
import Event from '../datatypes/event/Event';
import Participation from '../datatypes/participate/Participation';
import ParticipationForm from '../datatypes/participate/ParticipationForm';
import {validateParticipationForm} from '../functions/inputValidator/participate/validateParticipationForm';

// Path: /event/{eventID}/participate
const participateRouter = express.Router({mergeParams: true});

// POST /event/{eventID}/participate
participateRouter.post('/', async (req, res, next) => {
  const dbClient: mariadb.Pool = req.app.locals.dbClient;
  const eventId = parseInt((req.params as {eventId: string}).eventId);

  try {
    // Check for numeric id, >= 1
    if (isNaN(eventId) || eventId < 1) {
      throw new NotFoundError();
    }

    // Verify User Input
    const participationForm: ParticipationForm = req.body;
    if (!validateParticipationForm(participationForm)) {
      throw new BadRequestError();
    }

    // Check Event Existence
    await Event.read(dbClient, eventId);

    // Check duplicated (having same name and email)
    const {participantName, email, phoneNumber, comment} = participationForm;
    if (
      await Participation.readByEventIdNameEmail(
        dbClient,
        eventId,
        participantName,
        email
      )
    ) {
      throw new BadRequestError();
    }

    // Add request to DB
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

export default participateRouter;
