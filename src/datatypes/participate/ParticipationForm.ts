/**
 * Define type for participate form
 *   - participantName
 *   - phoneNumber (optional)
 *   - email
 *   - comment (optional)
 *
 * @author Hyecheol (Jerry) Jang <hyecheol123@gmail.com>
 */

/**
 * Interface for ParticipationForm
 */
export default interface ParticipationForm {
  participantName: string;
  email: string;
  phoneNumber?: string;
  comment?: string;
}
