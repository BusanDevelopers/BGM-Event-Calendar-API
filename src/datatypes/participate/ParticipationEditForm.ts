/**
 * Define type for participation edit form
 *   - Everything from ParticipationForm, but every field is optional
 *
 * @author Hyecheol (Jerry) Jang <hyecehol123@gmail.com>
 */

/**
 * Interface for ParticipationEditForm
 */
export default interface ParticipationEditForm {
  participantName?: string;
  email?: string;
  phoneNumber?: string;
  comment?: string;
}
