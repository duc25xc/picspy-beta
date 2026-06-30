import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      // e.g. 'POST_APPROVE', 'POST_REJECT', 'POST_HIDE', 'POST_DELETE', 'USER_TOKENS_ADJUST', 'USER_BAN', 'USER_UNBAN', 'USER_TIER_CHANGE', 'USER_ROLE_CHANGE', 'SYSTEM_SETTINGS_UPDATE'
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    targetModel: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

const AuditLog = mongoose.model('AuditLog', auditLogSchema)
export default AuditLog
