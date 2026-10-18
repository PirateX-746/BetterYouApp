/**
 * Session summary generation.
 *
 * `SummaryGenerator` is the seam for an AI provider later. Today the only
 * implementation is `TemplateSummaryGenerator`: a deterministic restatement
 * of exactly what the practitioner recorded. It never interprets, infers a
 * diagnosis, recommends treatment or invents statements; sections with no
 * recorded data are omitted rather than padded. Scores are always reported
 * with their scale meaning, as practitioner observations, never combined.
 */
import type { AssessmentResponse } from './schemas/session-assessment.schema';
import type { TemplateSection } from './schemas/assessment-template.schema';

export interface SummaryInput {
  sections: TemplateSection[];
  responses: AssessmentResponse[];
  notes?: string;
  appointment: { title: string; start: Date; end: Date };
}

export interface SummaryGenerator {
  readonly kind: 'template' | 'ai';
  generate(input: SummaryInput): Promise<string>;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export class TemplateSummaryGenerator implements SummaryGenerator {
  readonly kind = 'template' as const;

  async generate({ sections, responses, notes, appointment }: SummaryInput): Promise<string> {
    const byId = new Map(responses.map((r) => [r.itemId, r]));
    const minutes = Math.round((appointment.end.getTime() - appointment.start.getTime()) / 60000);
    const parts: string[] = [];

    parts.push(
      `Session overview\n${appointment.title} on ${fmtDate(appointment.start)} (${minutes} min). ` +
        'Ratings below are the practitioner’s observations on 0–10 scales, not standardised measurements.',
    );

    for (const section of sections) {
      const lines: string[] = [];
      const notObserved: string[] = [];
      for (const item of section.items) {
        const r = byId.get(item.id);
        if (!r) continue;
        if (item.type === 'text') {
          if (r.text?.trim()) lines.push(`${item.label}: ${r.text.trim()}`);
          continue;
        }
        if (r.state === 'scored' && typeof r.score === 'number' && item.scale) {
          const { min, max, lowLabel, highLabel } = item.scale;
          let line = `${item.label}: ${r.score}/${max} (${min} = ${lowLabel.toLowerCase()}, ${max} = ${highLabel.toLowerCase()})`;
          if (r.note?.trim()) line += ` — ${r.note.trim()}`;
          lines.push(line);
        } else if (r.state === 'not_observed') {
          notObserved.push(item.label.toLowerCase());
        } else if (r.note?.trim()) {
          lines.push(`${item.label}: ${r.note.trim()}`);
        }
      }
      if (notObserved.length) lines.push(`Not observed: ${notObserved.join(', ')}.`);
      if (lines.length) parts.push(`${section.title}\n${lines.map((l) => `• ${l}`).join('\n')}`);
    }

    if (notes?.trim()) parts.push(`Practitioner notes\n${notes.trim()}`);

    return parts.join('\n\n');
  }
}
