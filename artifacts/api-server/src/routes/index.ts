import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import whatsappRouter from "./whatsapp";
import { knowledgeRouter } from "./knowledge";
import { farmersRouter } from "./farmers";
import { marketPricesRouter } from "./market-prices";
import { broadcastsRouter } from "./broadcasts";
import { analyticsRouter } from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(whatsappRouter);
router.use(knowledgeRouter);
router.use(farmersRouter);
router.use(marketPricesRouter);
router.use(broadcastsRouter);
router.use(analyticsRouter);

export default router;
