import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { auth } from "./server/auth.js";
import {
  layout,
  routes,
  styles,
  clientJS,
  sharedJS,
  otpPage,
} from "./routes/index.js";
import { renderInbox } from "./inbox.js";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// Auth handlers
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/styles.css", (c) =>
  c.text(styles, 200, {
    "Content-Type": "text/css",
  })
);
app.get("/lib/index.client.js", (c) =>
  c.text(clientJS, 200, {
    "Content-Type": "application/javascript",
  })
);
app.get("/lib/shared.js", (c) =>
  c.text(sharedJS, 200, {
    "Content-Type": "application/javascript",
  })
);

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  c.set("user", session ? session.user : null);
  c.set("session", session ? session.session : null);

  c.setRenderer((content) => c.html(layout(content)));

  await next();
});

Object.entries(routes).forEach(([path, content]) => {
  app.get(path, async (c) => {
    if (path == "/") {
      const user = c.get("user");
      if (user) {
        return c.render(content.replaceAll("{{email}}", user.email));
      } else {
        return c.redirect("/auth");
      }
    }
    const emailQuery = c.req.query("email");
    if (path == "/auth" && emailQuery) {
      return c.render(otpPage.replaceAll("{{email}}", emailQuery));
    }
    return c.render(content);
  });
});

app.post("/auth/multi-email", async (c) => {
  const body = await c.req.formData();
  const email = body.get("email");
  if (!(email && typeof email == "string"))
    return c.render(
      routes["/auth"].replace(
        "<!-- missing email line -->",
        '<p data-testid="missing-email" style="color: red">Missing email</p>'
      )
    );
  await auth.api.sendMagicLinkAndOTP({
    body: { email },
    headers: c.req.raw.headers,
  });

  return c.redirect(`/auth?email=${encodeURIComponent(email)}`);
});

app.get("/auth/sign-out", async (c) => {
  const authRes = await auth.api.signOut({
    headers: c.req.raw.headers,
    asResponse: true,
  });
  const res = c.redirect("/");
  const setCookie = authRes.headers.get("set-cookie");
  if (setCookie) {
    res.headers.set("set-cookie", setCookie);
  }
  return res;
});

app.post("/auth/otp", async (c) => {
  const body = await c.req.formData();
  const email = body.get("email");
  const otp = body.get("otp");
  if (!(email && typeof email == "string" && otp && typeof otp == "string"))
    return c.text("Invalid request", 400);
  try {
    const authRes = await auth.api.signInEmailOTP({
      body: { email, otp },
      asResponse: true,
    });
    const res = c.redirect("/");
    const setCookie = authRes.headers.get("set-cookie");
    if (setCookie) {
      res.headers.set("set-cookie", setCookie);
    }
    return res;
  } catch {
    return c.render(
      otpPage
        .replaceAll("{{email}}", email)
        .replace(
          "<!-- invalid opt line -->",
          `<p data-testid="invalid-otp" style="color: red">Invalid OTP</p>`
        )
    );
  }
});

// "inbox" route to see all the "emails" being sent
app.get("/inbox/:email", (c) => {
  const email = c.req.param("email");
  return c.render(renderInbox(email));
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
