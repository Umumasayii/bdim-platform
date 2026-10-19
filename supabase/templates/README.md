# Supabase Auth email templates

Branded versions of the emails Supabase sends (sign-up confirmation, invite,
magic link, email change, password reset, reauthentication). They are not
applied automatically: paste each file into Supabase → Authentication → Emails
→ Templates → (template) → Message body, then **Save changes**. Keep the
`{{ .ConfirmationURL }}`, `{{ .NewEmail }}` and `{{ .Token }}` placeholders.

Subjects (unchanged): Confirm your email address · You've been invited ·
Your sign-in link · Confirm your new email address · Reset your password ·
{{ .Token }} is your verification code
