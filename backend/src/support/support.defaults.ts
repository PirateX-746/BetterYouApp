/** Starter FAQs, inserted only when the collection is empty. Editable in the console. */
export const DEFAULT_FAQS: { category: string; question: string; answer: string }[] = [
  {
    category: 'Appointments',
    question: 'How do I book an appointment for a patient?',
    answer:
      'Open Appointments and click an empty slot on the calendar. Choose the patient and appointment type, adjust the duration if needed, and click Schedule. Slots outside your practice hours or blocked in Manage Availability cannot be booked.',
  },
  {
    category: 'Appointments',
    question: 'How do I set up my appointment types and their durations?',
    answer:
      'Go to Settings → Appointment Types. Add the kinds of sessions you offer with a default duration and a calendar color. The duration is filled in automatically when you book that type, and you can still change it for a single appointment. Turn a type off to stop new bookings without affecting past appointments.',
  },
  {
    category: 'Appointments',
    question: 'Why can’t I reschedule a completed appointment?',
    answer:
      'Completed, cancelled and no-show appointments are closed out so the clinical record stays accurate. You can still edit their notes. Book a new appointment instead.',
  },
  {
    category: 'Schedule',
    question: 'How do I change my practice hours or block time off?',
    answer:
      'Set your weekly opening hours in Settings → Practice Hours. To block a single day or time range (leave, training), use Manage Availability on the Appointments page.',
  },
  {
    category: 'Patients & documents',
    question: 'How do I scan or upload a paper document to a patient’s record?',
    answer:
      'Open the patient, go to the Documents tab, choose New Document and pick Custom Document. You can scan pages with your camera or upload images from your device; they are saved together as one PDF on the patient’s record.',
  },
  {
    category: 'Account & security',
    question: 'I forgot my password. How do I get back in?',
    answer:
      'Use Forgot password on the practitioner sign-in page and follow the instructions there. You will be asked to choose a new password the next time you sign in. If you still cannot get in, contact your practice administrator.',
  },
  {
    category: 'Account & security',
    question: 'What does Lock portal do?',
    answer:
      'Lock portal hides your screen behind your PIN without signing you out — useful when you step away from your desk with a patient record open.',
  },
  {
    category: 'Support',
    question: 'How quickly will support reply to my ticket?',
    answer:
      'We aim to reply to urgent tickets within 4 business hours and to all others within one business day. You will see a "New reply" badge on the ticket when we respond.',
  },
];
