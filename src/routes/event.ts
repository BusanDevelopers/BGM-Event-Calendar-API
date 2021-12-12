/**
 * express Router middleware for Event APIs
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import * as Cosmos from '@azure/cosmos';
import BadRequestError from '../exceptions/BadRequestError';
import Event, {EventEditInfoDB} from '../datatypes/event/Event';
import EventForm from '../datatypes/event/EventForm';
import EventEditForm from '../datatypes/event/EventEditForm';
import {validateEventForm} from '../functions/inputValidator/event/validateEventForm';
import {validateEventEditForm} from '../functions/inputValidator/event/validateEventEditForm';
import verifyAccessToken from '../functions/JWT/verifyAccessToken';
import participateRouter from './participate';

// Path: /event
const eventRouter = express.Router();

// POST: /event
eventRouter.post('/', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;

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
    const createdDate = new Date();
    const event = new Event(
      eventDate,
      createdDate,
      eventForm.name,
      verifyResult.id,
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
  const dbClient: Cosmos.Database = req.app.locals.dbClient;
  const {eventId} = req.params;

  try {
    // DB Operation
    const event = await Event.read(dbClient, eventId);
    event.date = event.date as Date;

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
eventRouter.put('/:eventId', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;
  const {eventId} = req.params;

  try {
    // Verify Admin Access Token
    const verifyResult = await verifyAccessToken(
      req,
      req.app.get('jwtAccessKey')
    );

    // Verify User's request
    const eventEditForm: EventEditForm = req.body;
    if (!validateEventEditForm(eventEditForm)) {
      throw new BadRequestError();
    }

    // Create eventEditInfo
    const event = await Event.read(dbClient, eventId);
    event.date = event.date as Date;
    const eventEditInfo: EventEditInfoDB = {};
    // Date
    if (eventEditForm.year || eventEditForm.month || eventEditForm.date) {
      // Check Month and Date
      const year = eventEditForm.year
        ? eventEditForm.year
        : event.date.getFullYear();
      const month = eventEditForm.month
        ? eventEditForm.month
        : event.date.getMonth() + 1;
      const date = eventEditForm.date
        ? eventEditForm.date
        : event.date.getDate();
      const endDate = new Date(year, month, 0).getDate();
      if (endDate < date) {
        throw new BadRequestError();
      }
      eventEditInfo.date = new Date(year, month - 1, date);
    }
    eventEditInfo.name = eventEditForm.name ? eventEditForm.name : undefined;
    eventEditInfo.editor = verifyResult.id;
    eventEditInfo.detail = eventEditForm.detail
      ? eventEditForm.detail
      : undefined;
    eventEditInfo.category = eventEditForm.category
      ? eventEditForm.category
      : undefined;

    // DB Operation
    await Event.update(dbClient, eventId, eventEditInfo);

    // Response
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

// DELETE: /event/{eventID}
eventRouter.delete('/:eventId', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;
  const {eventId} = req.params;

  try {
    // Verify Admin Access Token
    await verifyAccessToken(req, req.app.get('jwtAccessKey'));

    // DB Operation
    await Event.delete(dbClient, eventId);

    // Response
    res.status(200).send();
  } catch (e) {
    next(e);
  }
});

// Participate Router Path: /event/{eventID}/participate
eventRouter.use('/:eventId/participate', participateRouter);

export default eventRouter;
