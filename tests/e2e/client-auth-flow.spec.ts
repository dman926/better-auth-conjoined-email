import { test } from "@playwright/test";
import { flow } from "./flow";

test("Client auth flow - Magic Link", flow("client", "magicLink"));
test("Client auth flow - Email OTP", flow("client", "emailOTP"));
