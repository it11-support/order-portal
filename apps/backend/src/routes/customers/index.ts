import { getCustomers } from '@/controllers/customers';
import { Router } from 'express';

const router = Router();

router.get('/', getCustomers);

export default router;