import { Router } from 'express';
import { getLevels } from '../../services/dbService.mjs';
import { authenticate } from '../../utils/middleware/auth.mjs';
import { asyncHandler } from '../../utils/asyncHandler.mjs';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  const levels = await getLevels();
  res.json(levels);
}));

router.get('/ganancias', authenticate, asyncHandler(async (req, res) => {
  const levels = await getLevels();
  res.json(levels);
}));

export default router;
