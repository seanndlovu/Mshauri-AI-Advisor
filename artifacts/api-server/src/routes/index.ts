import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import whatsappRouter from "./whatsapp";
import { knowledgeRouter } from "./knowledge";
import { farmersRouter } from "./farmers";
import { marketPricesRouter } from "./market-prices";
import { broadcastsRouter } from "./broadcasts";
import { analyticsRouter } from "./analytics";
import { contactsRouter } from "./contacts";
import { authRouter } from "./auth";
import { communitiesRouter } from "./communities";
import { postsRouter } from "./posts";
import { newsRouter } from "./news";
import { gameRouter } from "./game";
import { zmxRouter } from "./zmx";
import { adsRouter } from "./ads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(whatsappRouter);
router.use(knowledgeRouter);
router.use(farmersRouter);
router.use(marketPricesRouter);
router.use(broadcastsRouter);
router.use(analyticsRouter);
router.use(contactsRouter);
router.use(authRouter);
router.use(communitiesRouter);
router.use(postsRouter);
router.use(newsRouter);
router.use(gameRouter);
router.use(zmxRouter);
router.use(adsRouter);

export default router;
