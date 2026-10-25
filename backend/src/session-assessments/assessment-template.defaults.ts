/**
 * Default session-observation questionnaire (sections A–E). Seeded once per
 * practice into `assessmenttemplates`; the form renders from the stored
 * template, so items can be added, removed or renamed as data, not code.
 *
 * These are practitioner observation prompts, not a diagnostic instrument.
 * Each scale says what its ends mean, and "higher" is NOT always better —
 * e.g. restlessness and anxiety rate how much was observed. Items are never
 * combined into an overall score.
 */
import type { TemplateSection } from './schemas/assessment-template.schema';

export const DEFAULT_TEMPLATE_KEY = 'session-observation';
export const DEFAULT_TEMPLATE_NAME = 'Session observation';

const scale = (
  id: string,
  label: string,
  lowLabel: string,
  highLabel: string,
  direction: 'higher-is-better' | 'higher-is-more' = 'higher-is-better',
  help?: string,
) => ({
  id,
  label,
  type: 'scale' as const,
  help,
  scale: { min: 0, max: 10, lowLabel, highLabel, direction },
});

export const DEFAULT_SECTIONS: TemplateSection[] = [
  {
    id: 'behaviour',
    title: 'Behavioural observations',
    items: [
      scale(
        'engagement',
        'Overall engagement and participation',
        'Not engaged',
        'Fully engaged',
      ),
      scale(
        'cooperation',
        'Cooperation and willingness to participate',
        'Unwilling',
        'Very willing',
      ),
      scale(
        'restlessness',
        'Observed restlessness or agitation',
        'None observed',
        'Very marked',
        'higher-is-more',
      ),
      scale(
        'anxiety_signs',
        'Observed signs of anxiety or nervousness',
        'None observed',
        'Very marked',
        'higher-is-more',
      ),
      scale(
        'attention',
        'Ability to maintain attention',
        'Could not focus',
        'Sustained focus',
      ),
      scale(
        'responsiveness',
        'Responsiveness to questions and discussion',
        'Unresponsive',
        'Very responsive',
      ),
    ],
  },
  {
    id: 'communication',
    title: 'Communication and speaking tone',
    items: [
      scale(
        'clarity',
        'Clarity of communication',
        'Very unclear',
        'Very clear',
      ),
      scale('pace', 'Speaking pace and fluency', 'Very halting', 'Fluent'),
      scale(
        'tone',
        'Tone and emotional expression in speech',
        'Flat / guarded',
        'Expressive',
      ),
      scale(
        'openness',
        'Willingness to communicate openly',
        'Very guarded',
        'Very open',
      ),
    ],
  },
  {
    id: 'nonverbal',
    title: 'Body language and non-verbal cues',
    items: [
      scale(
        'eye_contact',
        'Eye contact',
        'Avoided',
        'Comfortable',
        'higher-is-better',
        'Where culturally and contextually appropriate.',
      ),
      scale(
        'posture',
        'Posture and physical presentation',
        'Closed / slumped',
        'Relaxed / open',
      ),
      scale(
        'nonverbal_engagement',
        'Non-verbal engagement',
        'Disengaged',
        'Very engaged',
      ),
      scale(
        'tension',
        'Visible tension or discomfort',
        'None observed',
        'Very marked',
        'higher-is-more',
      ),
    ],
  },
  {
    id: 'emotional',
    title: 'Emotional presentation',
    items: [
      scale(
        'mood',
        'Apparent mood during the session',
        'Very low',
        'Very positive',
      ),
      scale(
        'expression',
        'Emotional expression and responsiveness',
        'Very restricted',
        'Full range',
      ),
      scale(
        'presentation_change',
        'Change in presentation during the session',
        'No change',
        'Marked change',
        'higher-is-more',
      ),
    ],
  },
  {
    id: 'overall',
    title: 'Overall session',
    items: [
      scale(
        'session_engagement',
        'Overall session engagement',
        'Very low',
        'Very high',
      ),
      scale(
        'progress',
        'Progress toward the session’s stated objectives',
        'No progress',
        'Objectives met',
        'higher-is-better',
        'Only where objectives were set for this session.',
      ),
      {
        id: 'follow_up',
        label: 'Follow-up attention points',
        type: 'text' as const,
        help: 'Anything to watch or act on next time.',
      },
    ],
  },
];
