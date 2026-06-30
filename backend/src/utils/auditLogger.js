import AuditLog from '../models/AuditLog.model.js'

export const logAdminAction = async (adminId, action, targetId = null, targetModel = null, details = {}) => {
  try {
    await AuditLog.create({
      adminId,
      action,
      targetId,
      targetModel,
      details,
    })
  } catch (err) {
    console.error('Failed to create audit log:', err)
  }
}
