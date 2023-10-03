import { Router } from "express";
import { CatchErrorHandler } from "../../../libs/helpers/errors";
import { RatesController } from "../controller";

const router = Router();

router.get("/rates", CatchErrorHandler(RatesController.getRates));

export default router;
