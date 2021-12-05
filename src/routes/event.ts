/**
 * express Router middleware for Event APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import * as mariadb from 'mariadb';
import BadRequestError from '../exceptions/BadRequestError';
import NotFoundError from '../exceptions/NotFoundError';
import Event from '../datatypes/event/Event';
import EventForm from '../datatypes/event/EventForm';
import {validateEventForm} from '../functions/inputValidator/event/validateEventForm';
import verifyAccessToken from '../functions/JWT/verifyAccessToken';

// Path: /event
const eventRouter = express.Router();

// POST: /event
eventRouter.post('/', async (req, res, next) => {
  const dbClient: mariadb.Pool = req.app.locals.dbClient;

  try {
    // Verify Access Token
    const verifyResult = await verifyAccessToken(
      req,
      req.app.get('jwtAccessKey')
    );

    // Verify User Input
    const eventForm: EventForm = req.body;
    if (!validateEventForm(eventForm)) {
      throw new BadRequestError();
    }
    // Check Month and Date
    const endDate = new Date(eventForm.year, eventForm.month, 0).getDate();
    if (endDate < eventForm.date) {
      throw new BadRequestError();
    }

    // Generate Event Object
    const eventDate = new Date(
      eventForm.year,
      eventForm.month - 1, // using month index
      eventForm.date
    );
    const event = new Event(
      eventDate,
      eventForm.name,
      verifyResult.username,
      eventForm.detail,
      eventForm.category
    );

    // DB Operation
    await Event.create(dbClient, event);

    // Response
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

// GET: /event/{eventID}
eventRouter.get('/:eventId', async (req, res, next) => {
  const dbClient: mariadb.Pool = req.app.locals.dbClient;
  const eventId = parseInt(req.params.eventId);

  try {
    // Check for numeric id, >= 1
    if (isNaN(eventId) || eventId < 1) {
      throw new NotFoundError();
    }

    // DB Operation
    const event = await Event.read(dbClient, eventId);

    // Response
    const resObj: EventForm = {
      year: event.date.getFullYear(),
      month: event.date.getMonth() + 1,
      date: event.date.getDate(),
      name: event.name,
    };
    resObj.detail = event.detail ? event.detail : undefined;
    resObj.category = event.category ? event.category : undefined;
    res.status(200).json(resObj);
  } catch (e) {
    next(e);
  }
});

// PUT: /event/{eventID}

// DELETE: /event/{eventID}
eventRouter.delete('/:eventId', async (req, res, next) => {
  const dbClient: mariadb.Pool = req.app.locals.dbClient;
  const eventId = parseInt(req.params.eventId);

  try {
    // Verify Admin Access Token
    await verifyAccessToken(req, req.app.get('jwtAccessKey'));

    // Check for numeric id, >= 1
    if (isNaN(eventId) || eventId < 1) {
      throw new NotFoundError();
    }

    // DB Operation
    await Event.delete(dbClient, eventId);

    // Response
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

export default eventRouter;
