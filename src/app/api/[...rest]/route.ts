import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";

import domainLookupApp from "./domain-lookup";
import domainSuggestApp from "./domain-suggest";

const basePath = "/api";

const app = new OpenAPIHono().basePath(basePath);

app.route("/domain-lookup", domainLookupApp);
app.route("/domain-suggest", domainSuggestApp);
app.doc31("/docs", {
  openapi: "3.1.0",
  info: {
    title: "Services API",
    version: "1.0.0",
  },
});
app.get(
  "/scalar",
  Scalar({
    url: `${basePath}/docs`,
    title: "Services API",
  }),
);

export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const DELETE = app.fetch;
export const PATCH = app.fetch;
