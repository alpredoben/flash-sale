import { Router } from 'express';
import monitoringController from '@controllers/monitoring.controller';
import authMiddleware from '@middlewares/auth.middleware';

const router = Router();

// All monitoring routes require admin authentication
router.use(authMiddleware.authenticate);
router.use(authMiddleware.authorize(['admin']));

/**
 * @desc    Get scheduler status and statistics
 * @path    [GET] /api/v1/monitoring/scheduler
 * @access  Private (Admin)
 */
router.get(
  '/scheduler',
  monitoringController.getSchedulerStatus.bind(monitoringController)
);

/**
 * @desc    Trigger scheduler job manually
 * @path    [POST] /api/v1/monitoring/scheduler/trigger
 * @access  Private (Admin)
 */
router.post(
  '/scheduler/trigger',
  monitoringController.triggerScheduler.bind(monitoringController)
);

/**
 * @desc    Reset scheduler statistics
 * @path    [POST] /api/v1/monitoring/scheduler/reset-stats
 * @access  Private (Admin)
 */
router.post(
  '/scheduler/reset-stats',
  monitoringController.resetSchedulerStats.bind(monitoringController)
);

/**
 * @desc    Check stock consistency
 * @path    [GET] /api/v1/monitoring/stock/consistency
 * @access  Private (Admin)
 */
router.get(
  '/stock/consistency',
  monitoringController.checkStockConsistency.bind(monitoringController)
);

/**
 * @desc    Fix stock consistency issues
 * @path    [POST] /api/v1/monitoring/stock/fix-consistency
 * @access  Private (Admin)
 */
router.post(
  '/stock/fix-consistency',
  monitoringController.fixStockConsistency.bind(monitoringController)
);

/**
 * @desc    Get stock statistics
 * @path    [GET] /api/v1/monitoring/stock/stats
 * @access  Private (Admin)
 */
router.get(
  '/stock/stats',
  monitoringController.getStockStats.bind(monitoringController)
);

/**
 * @desc    Get system health
 * @path    [GET] /api/v1/monitoring/health
 * @access  Private (Admin)
 */
router.get(
  '/health',
  monitoringController.getSystemHealth.bind(monitoringController)
);

/**
 * @desc    Get monitoring dashboard data
 * @path    [GET] /api/v1/monitoring/dashboard
 * @access  Private (Admin)
 */
router.get(
  '/dashboard',
  monitoringController.getDashboard.bind(monitoringController)
);

export default router;
