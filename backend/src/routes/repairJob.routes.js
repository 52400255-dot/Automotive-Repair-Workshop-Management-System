/**
 * repairJob.routes — /api/v1/repair-jobs
 * Luồng chính: tiếp nhận → phân công → chẩn đoán → cập nhật tiến độ
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/repairJob.controller');
const { authenticateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticateToken);
router.param('id', (req, res, next) => require('../middleware/validate').validateIntParam('id')(req, res, next));

router.get('/', authorize('receptionist', 'service_manager', 'admin'), controller.list);
router.get('/my-jobs', authorize('mechanic'), controller.myJobs);
router.get('/mechanics', authorize('receptionist', 'service_manager', 'admin'), controller.getMechanics);
router.get('/:id', controller.getById);

// Lễ tân tiếp nhận xe, tạo phiếu sửa
router.post('/', authorize('receptionist'), controller.create);

// Cập nhật trạng thái (toàn luồng)
router.put('/:id/status', authorize('receptionist', 'service_manager', 'mechanic'), controller.updateStatus);

// Service Manager phân công thợ (hỗ trợ cả PUT /:id/assign và PUT /assign { repairJobId, mechanicId })
router.put('/assign', authorize('service_manager', 'receptionist'), (req, res, next) => {
  req.params.id = req.body?.repairJobId ?? req.body?.repair_job_id ?? req.body?.jobId;
  return controller.assign(req, res, next);
});
router.put('/:id/assign', authorize('service_manager', 'receptionist'), controller.assign);

// Thợ máy xem danh sách việc theo ID hoặc việc của chính mình
router.get('/mechanics/:id/jobs', authorize('mechanic', 'service_manager', 'admin'), (req, res, next) => {
  const targetId = req.params.id;
  // Thợ máy chỉ được xem việc của chính mình, quản lý/admin được xem của mọi thợ
  if (req.user.role === 'mechanic' && String(req.user.id) !== String(targetId)) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền xem công việc của thợ khác' });
  }
  return require('../services/repairJob.service').getJobsForMechanic(targetId)
    .then((jobs) => res.json({ success: true, data: jobs }))
    .catch(next);
});

// Thợ máy ghi nhận chẩn đoán
router.put('/:id/diagnosis', authorize('mechanic'), controller.diagnosis);

router.get('/:id/diagnosis', authorize('receptionist', 'service_manager', 'mechanic', 'admin'), controller.diagnosisHistory);

module.exports = router;
