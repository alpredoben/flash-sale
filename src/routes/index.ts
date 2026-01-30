import { Router } from 'express';
import authRoutes from '@routes/auth.route';
import itemRoutes from '@routes/item.route';
import reservationRoutes from '@routes/reservation.route';
import adminRoutes from '@routes/admin.route';

const router = Router();

router.use('/auth', authRoutes);
router.use('/items', itemRoutes);
router.use('/reservations', reservationRoutes);
router.use('/admin', adminRoutes);

export default router;
