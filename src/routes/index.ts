import { Router } from 'express';
import authRoutes from '@routes/auth.route';
import itemRoutes from '@routes/item.route';
import reservationRoutes from '@routes/reservation.route';
import adminRoutes from '@routes/admin.route';
import monitoringRoutes from '@routes/monitoring.route';
import userRoutes from '@routes/user.route';

const router = Router();

router.use('/auth', authRoutes);
router.use('/items', itemRoutes);
router.use('/reservations', reservationRoutes);
router.use('/admin', adminRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/users', userRoutes);

export default router;
