import type { MultiEmailPayload } from "@dman926/better-auth-conjoined-email";

const inboxes: Record<string, MultiEmailPayload[]> = {};

export const sendEmail = (payload: MultiEmailPayload) => {
  const { email } = payload
  if (!inboxes[email]) inboxes[email] = [];
  inboxes[email].unshift(payload);
};

export const renderInbox = (email: string) => {
  const inbox = inboxes[email];
  if (!inbox || inbox.length == 0) return "<p>No emails sent</p>";
  return inbox
    .map(
      (p, i) =>
        `<p data-testid="inbox-entry-${i + 1}">
  OTP: <span data-testid="entry-${i + 1}-otp">${p.otp}</span>
  magicLink: <span data-testid="entry-${i + 1}-magicLink">${p.magicLink}</span>
</p>`
    )
    .join("\n");
};
