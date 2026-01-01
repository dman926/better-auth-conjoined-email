import { test } from "@playwright/test";
import { flow } from "./flow";

test("Server auth flow - Magic Link", flow("server", "magicLink"));
test("Server auth flow - Email OTP", flow("server", "emailOTP"));
