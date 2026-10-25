import { renderTempPasswordEmail } from './password-reset-email';

describe('renderTempPasswordEmail', () => {
  const ctx = {
    firstName: 'Sarah',
    tempPassword: 'Ab3$<x>Q9kLm',
    validForMinutes: 60,
    signInUrl: 'https://app.example.com/practitionerLogin',
  };

  it('includes the temporary password, validity and sign-in link', () => {
    const { subject, text } = renderTempPasswordEmail(ctx);
    expect(subject).toBe('Your BetterYou temporary password');
    expect(text).toContain('Ab3$<x>Q9kLm');
    expect(text).toContain('It works for 1 hour.');
    expect(text).toContain(
      'Sign in: https://app.example.com/practitionerLogin',
    );
  });

  it('escapes the password in the HTML', () => {
    const { html } = renderTempPasswordEmail(ctx);
    expect(html).toContain('Ab3$&lt;x&gt;Q9kLm');
    expect(html).toContain('href="https://app.example.com/practitionerLogin"');
  });

  it('formats non-hour validity in minutes', () => {
    const { text } = renderTempPasswordEmail({ ...ctx, validForMinutes: 30 });
    expect(text).toContain('It works for 30 minutes.');
  });

  it('tells a self-service requester their current password still works', () => {
    const { text } = renderTempPasswordEmail(ctx);
    expect(text).toContain('your current password still works');
  });

  it('names the practice when the practice reset the password', () => {
    const { html, text } = renderTempPasswordEmail({
      ...ctx,
      validForMinutes: 7 * 24 * 60,
      issuedByPractice: 'Calm Minds Clinic',
    });
    expect(html).toContain('Your password was reset');
    expect(text).toContain(
      'Calm Minds Clinic has reset your BetterYou password.',
    );
    expect(text).toContain('It works for 7 days.');
    expect(text).toContain('Your previous password no longer works.');
  });
});
