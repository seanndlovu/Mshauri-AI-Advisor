import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import whatsappRouter from "./whatsapp";
import { knowledgeRouter } from "./knowledge";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(whatsappRouter);
router.use(knowledgeRouter);

export default router;
