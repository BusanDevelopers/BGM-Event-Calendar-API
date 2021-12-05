/**
 * Define type for event edit form
 *   - Everything from EventForm, but every field is optional
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

/**
 * Interface for EventEditForm
 */
export default interface EventEditForm {
  year?: number;
  month?: number;
  date?: number;
  name?: string;
  detail?: string;
  category?: string;
}
