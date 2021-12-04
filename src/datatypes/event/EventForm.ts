/**
 * Define type for event form
 *   - year
 *   - month
 *   - date
 *   - name
 *   - detail (optional)
 *   - category (optional)
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

/**
 * Interface for EventForm
 */
export default interface EventForm {
  year: number;
  month: number;
  date: number;
  name: string;
  detail?: string;
  category?: string;
}
