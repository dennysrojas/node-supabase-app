import { Router } from 'express';
import type { RequestHandler } from 'express';
import { projectionController } from '../controllers/projection.controller.js';

const projectionRouter = Router();

projectionRouter.get('/account-items', projectionController.getAccountItems as RequestHandler);
projectionRouter.post('/', projectionController.createProjection as RequestHandler);
projectionRouter.get('/store/:storeId', projectionController.getProjection as RequestHandler);

export default projectionRouter;
