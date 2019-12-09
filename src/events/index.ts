import { createLogger } from "bunyan";
import Koa, { Context } from "koa";
import bodyParser from "koa-bodyparser";
import Router from "koa-router";
import serverless from "serverless-http";

import verifyRequest from "./verifyRequest";

const logger = createLogger({
  name: "jupiter-integration-okta-events",
});

const app = new Koa();
const privateRouter = new Router({
  prefix: "/private",
});
const publicRouter = new Router({
  prefix: "/integration-okta",
});

privateRouter.get("/health-check", (ctx: Context) => {
  ctx.body = "HEALTHY";
});

publicRouter.get("/event-hooks", async (ctx: Context) => {
  const requestValid = await verifyRequest(ctx.request, logger);
  if (!requestValid) {
    ctx.status = 400;
    return;
  }

  const challenge = ctx.get("X-Okta-Verification-Challenge");
  ctx.body = { verification: challenge };
});

publicRouter.post("/event-hooks", async (ctx: Context) => {
  logger.info(
    { requestBody: JSON.stringify(ctx.request.body) },
    "Received event hook from Okta",
  );

  const requestValid = await verifyRequest(ctx.request, logger);
  if (!requestValid) {
    logger.info("Event hook from Okta was invalid");
    ctx.status = 400;
    return;
  }

  logger.info("Event hook from Okta was valid");
  ctx.status = 204;
});

app
  .use(bodyParser())
  .use(privateRouter.routes())
  .use(privateRouter.allowedMethods())
  .use(publicRouter.routes())
  .use(publicRouter.allowedMethods());

export { app };

export default serverless(app);
