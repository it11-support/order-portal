import { getCustomers } from '@controllers';
import { Router } from 'express';

const router = Router();

router.get('/', getCustomers);

export default router;