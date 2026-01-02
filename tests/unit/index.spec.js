import { conjoinedEmailPlugin } from "../../src/index.js";
import { emailOTP, magicLink } from "better-auth/plugins";

vi.mock("better-auth/plugins", async (importOriginal) => {
  /** @type {import("better-auth/plugins")} */
  const actual = await importOriginal();

  return {
    magicLink: vi.fn(actual.magicLink),
    emailOTP: vi.fn(actual.emailOTP),
  };
});

/**
 * @import { GenericEndpointContext } from "better-auth";
 */

describe("conjoinedEmailPlugin", () => {
  /** @type {ReturnType<typeof vi.fn<import("../../src/index.js").Options['sendAuthenticationEmail']>>} */
  let mockSendEmail;

  const mockMagicLink = /** @type {import("vitest").Mock<typeof magicLink>} */ (
    magicLink
  );
  const mockEmailOTP = /** @type {import("vitest").Mock<typeof emailOTP>} */ (
    emailOTP
  );

  beforeEach(() => {
    mockSendEmail = vi.fn();
  });

  describe("Plugin Configuration", () => {
    it("should create plugin with default options", () => {
      const plugin = conjoinedEmailPlugin({
        sendAuthenticationEmail: mockSendEmail,
      });

      expect(plugin).toHaveProperty("id", "conjoined-email");
      expect(plugin).toHaveProperty("endpoints");
      expect(plugin).toHaveProperty("hooks");
      expect(plugin).toHaveProperty("rateLimit");
    });

    it("should configure emailOTP plugin with default OTP length", () => {
      conjoinedEmailPlugin({
        sendAuthenticationEmail: mockSendEmail,
      });

      expect(emailOTP).toHaveBeenCalledWith(
        expect.objectContaining({
          otpLength: 6,
          expiresIn: 600,
          sendVerificationOTP: expect.any(Function),
        })
      );
    });

    it("should configure emailOTP plugin with custom OTP length", () => {
      const plugin = conjoinedEmailPlugin({
        sendAuthenticationEmail: mockSendEmail,
        otpLength: 8,
      });

      expect(plugin).toBeDefined();
      expect(emailOTP).toHaveBeenCalledWith(
        expect.objectContaining({ otpLength: 8 })
      );
    });

    it("should configure magicLink plugin with default expiration", () => {
      conjoinedEmailPlugin({
        sendAuthenticationEmail: mockSendEmail,
      });

      expect(magicLink).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresIn: 600,
          sendMagicLink: expect.any(Function),
        })
      );
    });

    it("should configure both plugins with numeric expiresIn", () => {
      const expiresIn = 300;

      conjoinedEmailPlugin({
        sendAuthenticationEmail: mockSendEmail,
        expiresIn,
      });

      expect(magicLink).toHaveBeenCalledWith(
        expect.objectContaining({ expiresIn: 300 })
      );
      expect(emailOTP).toHaveBeenCalledWith(
        expect.objectContaining({ expiresIn: 300 })
      );
    });

    it("should configure plugins with separate expiration times", () => {
      conjoinedEmailPlugin({
        sendAuthenticationEmail: mockSendEmail,
        expiresIn: { magicLink: 300, emailOTP: 600 },
      });

      expect(magicLink).toHaveBeenCalledWith(
        expect.objectContaining({ expiresIn: 300 })
      );
      expect(emailOTP).toHaveBeenCalledWith(
        expect.objectContaining({ expiresIn: 600 })
      );
    });

    it("should pass custom sender functions to plugins", () => {
      conjoinedEmailPlugin({
        sendAuthenticationEmail: mockSendEmail,
      });

      const magicLinkConfig = mockMagicLink.mock.calls[0][0];
      const emailOTPConfig = mockEmailOTP.mock.calls[0][0];

      expect(magicLinkConfig.sendMagicLink).toBeTypeOf("function");
      expect(emailOTPConfig.sendVerificationOTP).toBeTypeOf("function");
    });

    it("should register all required endpoints", () => {
      const plugin = conjoinedEmailPlugin({
        sendAuthenticationEmail: mockSendEmail,
      });

      expect(plugin.endpoints).toHaveProperty("signInMagicLink");
      expect(plugin.endpoints).toHaveProperty("magicLinkVerify");
      expect(plugin.endpoints).toHaveProperty("sendVerificationOTP");
      expect(plugin.endpoints).toHaveProperty("verifyEmailOTP");
      expect(plugin.endpoints).toHaveProperty("sendConjoinedEmail");
    });
  });
});
