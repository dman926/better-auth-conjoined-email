import { type BrowserContext, type test, expect } from "@playwright/test";
import { generateRandomString } from "better-auth/crypto";

export const flow: (
  platform: "client" | "server",
  method: "magicLink" | "emailOTP"
) => Parameters<typeof test>[2] =
  (platform, method) =>
  async ({ page, context }) => {
    await page.goto("/");

    // Generate random email address
    const email = `${genURLSafeString(10)}@${genURLSafeString(10)}.com`;

    // Get redirected to /auth
    await expect(page).toHaveURL("/auth");

    const emailInput = page.getByTestId("email-input");
    await emailInput.fill(email);

    await page.getByTestId(`submit-${platform}`).click();

    if (method == "emailOTP") {
      // Enter OTP given in email and submit
      const otpInput = page.getByTestId("otp-input");
      const otpValue = await getInboxValue(context, email, method);
      expect(otpValue).toBeTruthy();
      await otpInput.fill(otpValue!);
      await page.getByTestId(`submit-${platform}`).click();
    } else {
      // Navigate to the magic link from email
      const magicLink = await getInboxValue(context, email, method);
      expect(magicLink).toBeTruthy();
      await page.goto(magicLink!);
    }

    await expect(page).toHaveURL("/");
    const userEmail = page.getByTestId("user-email");
    await expect(userEmail).not.toBeEmpty();
    await expect(userEmail).toHaveText(email);
  };

const getInboxValue = async (
  context: BrowserContext,
  email: string,
  method: "magicLink" | "emailOTP"
) => {
  const page = await context.newPage();
  await page.goto(`/inbox/${encodeURIComponent(email)}`);
  const result = await page
    .getByTestId(`entry-1-${method == "emailOTP" ? "otp" : "magicLink"}`)
    .textContent();
  await page.close();
  return result;
};

const genURLSafeString = (length: number) =>
  // Skipping capitals since the encoding when passing around seems to lowercase everything
  generateRandomString(length, "a-z", "0-9");

export default flow;
