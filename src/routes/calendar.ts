/**
 * express Router middleware for Calendar API
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

import * as express from 'express';
import * as Cosmos from '@azure/cosmos';
import BadRequestError from '../exceptions/BadRequestError';
import Event from '../datatypes/event/Event';
import CalendarEventResponse, {
  EventEntry,
} from '../datatypes/calendar/CalendarEventResponse';

// Path : /
const calendarRouter = express.Router();

// GET: /{year}-{month}
calendarRouter.get('/:year-:month', async (req, res, next) => {
  const dbClient: Cosmos.Database = req.app.locals.dbClient;
  const year = parseInt(req.params.year);
  const month = parseInt(req.params.month);

  try {
    // Check for number
    if (isNaN(year) || isNaN(month)) {
      throw new BadRequestError();
    }
    // Check for year and month range
    if (year < 2021 || month < 1 || month > 12) {
      throw new BadRequestError();
    }

    // Retrieve events from DB
    const eventList = await Event.readByDate(dbClient, year, month);
    if (eventList.length === 0) {
      res.status(200).json({numEvent: 0});
    } else {
      const replyObj: CalendarEventResponse = {
        numEvent: eventList.length,
        eventList: [],
      };
      eventList.forEach(e => {
        (replyObj.eventList as EventEntry[]).push({
          id: e.id as string,
          name: e.name,
          date: new Date(e.date).getDate(),
          category: e.category ? e.category : undefined,
        });
      });
      res.status(200).json(replyObj);
    }
  } catch (e) {
    next(e);
  }
});

export default calendarRouter;
