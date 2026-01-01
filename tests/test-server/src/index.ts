import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { auth } from "./server/auth.js";
import { layout, routes, styles, clientJS, sharedJS } from "./routes/index.js";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

// Auth handlers
app.on(["POST", "GET"], "/api/auth/*", async (c) => {
  const contentType = c.req.header("Content-Type");
  
  // Stupid hack to work around https://github.com/better-auth/better-auth/issues/6195
  if (contentType?.includes("application/x-www-form-urlencoded")) {
    // 1. Parse the form data
    const formData = await c.req.formData();
    const bodyObj = Object.fromEntries(formData.entries());

    // 2. Construct a clean Request from scratch
    // This avoids carrying over conflicting internal state from c.req.raw
    const url = c.req.url;
    const newReq = new Request(url, {
      method: "POST",
      headers: {
        ...c.req.raw.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyObj),
    });

    return auth.handler(newReq);
  }

  return auth.handler(c.req.raw);
});

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
    if (path == "/" && !c.get("user")) {
      return c.redirect("/auth");
    }
    return c.render(content);
  });
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
