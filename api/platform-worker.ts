import { createCloudWorkerHandler } from '../server/automation/cloudWorker';

export default { fetch: createCloudWorkerHandler(process.env) };
