import { createLogger } from "bunyan";
import { app } from "../src/events";

const logger = createLogger({ name: "jupiter-integration-okta-events-local" });
const { PORT = 8080 } = process.env;

app.listen(PORT, () => {
  logger.info(`Server started on http://localhost:${PORT}`);
});
