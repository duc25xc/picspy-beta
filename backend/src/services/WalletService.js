import mongoose from 'mongoose'
import User from '../models/User.model.js'
import Post from '../models/Post.model.js'
import VndTransaction from '../models/VndTransaction.model.js'
import Settings from '../models/Settings.model.js'
import AppError from '../utils/AppError.js'

/**
 * Hỗ trợ chạy transaction an toàn cả khi môi trường phát triển không bật Replica Set (Standalone MongoDB)
 */
const runInTransaction = async (workFn) => {
  let session = null
  try {
    session = await mongoose.startSession()
    session.startTransaction()
    const result = await workFn(session)
    await session.commitTransaction()
    return result
  } catch (error) {
    if (session && session.inTransaction()) {
      await session.abortTransaction()
    }
    // Nếu lỗi do Standalone MongoDB không hỗ trợ session/transaction
    if (error.message && (
      error.message.includes('replica set') ||
      error.message.includes('transaction') ||
      error.message.includes('sessions')
    )) {
      // Chạy fallback không dùng session
      console.warn('[WalletService] Session/Transaction not supported by MongoDB server, falling back to atomic updates...')
      return workFn(null)
    }
    throw error
  } finally {
    if (session) session.endSession()
  }
}

class WalletService {
  /**
   * Admin nạp tiền vào tài khoản người dùng
   */
  static async deposit({ userId, amount, description, adminNote, adminId }) {
    if (amount === 0) {
      throw new AppError('VALIDATION_ERROR', 'Số tiền điều chỉnh phải khác 0', 400)
    }

    return runInTransaction(async (session) => {
      const user = await User.findById(userId).session(session)
      if (!user) {
        throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)
      }

      const balanceBefore = user.vndBalance || 0
      const balanceAfter = balanceBefore + amount

      if (balanceAfter < 0) {
        throw new AppError('INVALID_AMOUNT', `Số dư ví không thể âm. Số dư hiện có: ${balanceBefore.toLocaleString('vi-VN')} VNĐ, cố gắng trừ: ${Math.abs(amount).toLocaleString('vi-VN')} VNĐ.`, 400)
      }

      // Cập nhật số dư ví khả dụng của user
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        { $inc: { vndBalance: amount } },
        { new: true, session }
      )

      // Ghi nhận giao dịch vào sổ cái
      const txn = await VndTransaction.create([{
        userId,
        type: 'topup',
        amount,
        balanceBefore,
        balanceAfter,
        walletType: 'available',
        description: description || `Được nạp/trừ tiền từ Admin`,
        meta: {
          adminNote,
          relatedUserId: adminId
        }
      }], { session })

      return { user: updatedUser, transaction: txn[0] }
    })
  }

  /**
   * Người dùng mua ảnh Premium (Ví khả dụng Buyer -> Ví Holding của Creator)
   */
  static async purchasePremiumPost({ buyerId, postId, fileType = 'original', idempotencyKey, ip, userAgent }) {
    console.log(`[WalletService DEBUG] Starting purchasePremiumPost: buyerId=${buyerId}, postId=${postId}, fileType=${fileType}`)
    return runInTransaction(async (session) => {
      // 1. Chống trùng lặp giao dịch qua Idempotency Key
      if (idempotencyKey) {
        const existingTxn = await VndTransaction.findOne({ idempotencyKey }).session(session)
        if (existingTxn) {
          console.log(`[WalletService DEBUG] Duplicate transaction caught by Idempotency Key: ${idempotencyKey}`)
          return { alreadyProcessed: true, transaction: existingTxn }
        }
      }

      // 2. Kiểm tra bài đăng có hợp lệ
      const post = await Post.findById(postId).session(session)
      if (!post || post.status !== 'approved') {
        console.log(`[WalletService DEBUG] Post not found or not approved: ${postId}`)
        throw new AppError('NOT_FOUND', 'Bài đăng không tồn tại hoặc chưa được duyệt', 404)
      }
      console.log(`[WalletService DEBUG] Post found: isPremium=${post.isPremium}, priceInVnd=${post.priceInVnd}`)

      if (!post.isPremium) {
        throw new AppError('BAD_REQUEST', 'Bài đăng này hoàn toàn miễn phí', 400)
      }

      let price = post.priceInVnd || 20000
      if (fileType === 'bundle') {
        const count = post.generatedImages?.length || 1
        const total = price * count * 0.7 // 30% off
        price = Math.round(total / 1000) * 1000
      }

      // 3. Kiểm tra xem người dùng đã mua ảnh cụ thể này của bài viết chưa
      const priorPurchase = await VndTransaction.findOne({
        userId: buyerId,
        type: 'purchase_post',
        relatedPostId: postId,
        fileType: fileType === 'bundle' ? 'bundle' : { $in: [fileType, 'bundle'] }
      }).session(session)

      if (priorPurchase) {
        console.log(`[WalletService DEBUG] Prior purchase found: transactionId=${priorPurchase._id}`)
        return { alreadyPurchased: true }
      }

      const buyer = await User.findById(buyerId).session(session)
      if (!buyer) {
        console.log(`[WalletService DEBUG] Buyer not found: ${buyerId}`)
        throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)
      }
      console.log(`[WalletService DEBUG] Buyer found: username=${buyer.username}, subscriptionTier=${buyer.subscriptionTier}, vndBalance=${buyer.vndBalance}`)

      // 4. Kiểm tra số dư người mua bằng kỹ thuật atomic update có điều kiện
      // Trừ tiền người mua
      const buyerBefore = buyer.vndBalance || 0
      if (buyerBefore < price) {
        console.log(`[WalletService DEBUG] Insufficient balance: balance=${buyerBefore}, price=${price}`)
        throw new AppError('INSUFFICIENT_FUNDS', `Số dư tài khoản không đủ. Yêu cầu: ${price.toLocaleString('vi-VN')} VNĐ, Hiện có: ${buyerBefore.toLocaleString('vi-VN')} VNĐ.`, 402)
      }

      console.log(`[WalletService DEBUG] Deducting balance: -${price} from ${buyerBefore}`)
      const updatedBuyer = await User.findOneAndUpdate(
        { _id: buyerId, vndBalance: { $gte: price } },
        { $inc: { vndBalance: -price } },
        { new: true, session }
      )

      if (!updatedBuyer) {
        console.log(`[WalletService DEBUG] Deduct failed (race condition check)`)
        throw new AppError('INSUFFICIENT_FUNDS', 'Số dư tài khoản không đủ (Lỗi đồng thời)', 402)
      }
      console.log(`[WalletService DEBUG] Deduct successful. New balance=${updatedBuyer.vndBalance}`)

      const buyerAfter = updatedBuyer.vndBalance

      // 5. Ghi nhận giao dịch mua vào Sổ cái người mua
      const buyerTxn = await VndTransaction.create([{
        userId: buyerId,
        type: 'purchase_post',
        amount: -price,
        balanceBefore: buyerBefore,
        balanceAfter: buyerAfter,
        walletType: 'available',
        relatedPostId: postId,
        fileType,
        idempotencyKey,
        description: `Mua ảnh Premium (${fileType}): ${post.caption || 'Chất lượng cao'}`,
        meta: { ip, userAgent }
      }], { session })
      console.log(`[WalletService DEBUG] Buyer transaction logged: ${buyerTxn[0]._id}`)

      // 6. Cộng tiền vào ví Holding của Creator (nếu không tự mua của mình)
      let creatorTxn = null
      if (post.authorId.toString() !== buyerId.toString()) {
        const settings = await Settings.getSingleton()
        const sharePercent = settings.creatorSharePercent || 70
        const authorShare = Math.floor(price * (sharePercent / 100))

        const author = await User.findById(post.authorId).session(session)
        if (author) {
          const authBefore = author.holdingBalance || 0
          const authAfter = authBefore + authorShare

          await User.findOneAndUpdate(
            { _id: post.authorId },
            { 
              $inc: { 
                holdingBalance: authorShare,
                totalEarned: authorShare
              } 
            },
            { new: true, session }
          )

          // Đóng băng trong ví holding 3 ngày
          const holdDays = 3
          const holdUntil = new Date()
          holdUntil.setDate(holdUntil.getDate() + holdDays)

          // Ghi nhận giao dịch ghi nợ tạm giữ vào sổ cái creator
          const creatorTxns = await VndTransaction.create([{
            userId: post.authorId,
            type: 'earn_hold',
            amount: authorShare,
            balanceBefore: authBefore,
            balanceAfter: authAfter,
            walletType: 'holding',
            relatedPostId: postId,
            fileType,
            relatedUserId: buyerId,
            holdUntil,
            isHoldReleased: false,
            description: `Tạm nhận ${sharePercent}% doanh thu bán ảnh Premium (${fileType}) (Holding ${holdDays} ngày đối soát)`,
          }], { session })

          creatorTxn = creatorTxns[0]
          console.log(`[WalletService DEBUG] Creator holding transaction logged: ${creatorTxn._id}`)
        }
      }

      return { buyer: updatedBuyer, transaction: buyerTxn[0], creatorTransaction: creatorTxn }
    })
  }

  /**
   * Giải ngân các giao dịch tạm giữ (holding) đã hết hạn đối soát
   */
  static async releasePendingHolds() {
    console.log('[WalletService] Sweeping pending holds to release...')
    const now = new Date()

    // Tìm các giao dịch earn_hold đã quá thời gian holdUntil mà chưa được giải ngân
    const expiredHolds = await VndTransaction.find({
      type: 'earn_hold',
      holdUntil: { $lte: now },
      isHoldReleased: false,
    })

    if (expiredHolds.length === 0) {
      console.log('[WalletService] No expired holds found.')
      return { releasedCount: 0, totalReleasedAmount: 0 }
    }

    let releasedCount = 0
    let totalReleasedAmount = 0

    for (const holdTxn of expiredHolds) {
      const success = await runInTransaction(async (session) => {
        // Kiểm tra lại trạng thái dưới database để tránh race condition
        const lockedTxn = await VndTransaction.findOneAndUpdate(
          { _id: holdTxn._id, isHoldReleased: false },
          { $set: { isHoldReleased: true } },
          { new: true, session }
        )
        if (!lockedTxn) return false // Đã bị giải ngân bởi luồng khác

        const creator = await User.findById(holdTxn.userId).session(session)
        if (!creator) return false

        const holdingBefore = creator.holdingBalance || 0
        const holdingAfter = Math.max(0, holdingBefore - holdTxn.amount)
        const availableBefore = creator.vndBalance || 0
        const availableAfter = availableBefore + holdTxn.amount

        // Trừ ví holding và cộng vào ví available
        await User.findOneAndUpdate(
          { _id: holdTxn.userId },
          {
            $inc: {
              holdingBalance: -holdTxn.amount,
              vndBalance: holdTxn.amount,
            }
          },
          { new: true, session }
        )

        // Tạo 1 dòng lịch sử giải ngân ví available
        await VndTransaction.create([{
          userId: holdTxn.userId,
          type: 'release_hold',
          amount: holdTxn.amount,
          balanceBefore: availableBefore,
          balanceAfter: availableAfter,
          walletType: 'available',
          relatedPostId: holdTxn.relatedPostId,
          relatedUserId: holdTxn.relatedUserId,
          description: `Giải ngân doanh thu bán ảnh Premium từ số dư tạm giữ thành công`,
        }], { session })

        totalReleasedAmount += holdTxn.amount
        releasedCount++
        return true
      })
      if (!success) {
        console.warn(`[WalletService] Failed to release hold for transaction ${holdTxn._id}`)
      }
    }

    console.log(`[WalletService] Released ${releasedCount} hold transactions. Total amount: ${totalReleasedAmount.toLocaleString()} VNĐ`)
    return { releasedCount, totalReleasedAmount }
  }

  /**
   * Hoàn tiền giao dịch mua ảnh Premium (Ví holding của Creator -> Ví khả dụng của Buyer)
   */
  static async refundPurchase({ buyerId, postId, fileType = 'original', reason }) {
    return runInTransaction(async (session) => {
      // 1. Kiểm tra xem người mua đã mua chưa và có giao dịch hay không
      const purchaseTxn = await VndTransaction.findOne({
        userId: buyerId,
        type: 'purchase_post',
        relatedPostId: postId,
        fileType: fileType
      }).session(session)

      if (!purchaseTxn) {
        throw new AppError('NOT_FOUND', 'Không tìm thấy giao dịch mua ảnh này để hoàn tiền', 404)
      }

      // Xem đã có giao dịch hoàn tiền chưa
      const priorRefund = await VndTransaction.findOne({
        userId: buyerId,
        type: 'refund',
        relatedPostId: postId,
        fileType: fileType
      }).session(session)

      if (priorRefund) {
        throw new AppError('BAD_REQUEST', 'Giao dịch này đã được hoàn tiền trước đó', 400)
      }

      const price = Math.abs(purchaseTxn.amount)

      // 2. Tìm ví người mua và hoàn tiền vào khả dụng
      const buyer = await User.findById(buyerId).session(session)
      if (!buyer) throw new AppError('NOT_FOUND', 'Không tìm thấy người mua', 404)

      const buyerBefore = buyer.vndBalance || 0
      const buyerAfter = buyerBefore + price

      await User.findOneAndUpdate(
        { _id: buyerId },
        { $inc: { vndBalance: price } },
        { new: true, session }
      )

      // Ghi log sổ cái hoàn tiền của người mua
      await VndTransaction.create([{
        userId: buyerId,
        type: 'refund',
        amount: price,
        balanceBefore: buyerBefore,
        balanceAfter: buyerAfter,
        walletType: 'available',
        relatedPostId: postId,
        fileType: fileType,
        description: `Hoàn tiền tự động mua ảnh Premium (${fileType}): ${reason || 'Sự cố hệ thống'}`,
      }], { session })

      // 3. Khấu trừ ví holding của Creator
      const holdTxn = await VndTransaction.findOne({
        type: 'earn_hold',
        relatedPostId: postId,
        fileType: fileType,
        relatedUserId: buyerId,
        isHoldReleased: false
      }).session(session)

      if (holdTxn) {
        // Đánh dấu hold này đã bị hủy/thu hồi
        holdTxn.isHoldReleased = true
        await holdTxn.save({ session })

        const creator = await User.findById(holdTxn.userId).session(session)
        if (creator) {
          const holdBefore = creator.holdingBalance || 0
          const holdAfter = Math.max(0, holdBefore - holdTxn.amount)

          await User.findOneAndUpdate(
            { _id: holdTxn.userId },
            { 
              $inc: { 
                holdingBalance: -holdTxn.amount,
                totalEarned: -holdTxn.amount
              } 
            },
            { new: true, session }
          )

          // Ghi nhận dòng thu hồi trong sổ cái creator
          await VndTransaction.create([{
            userId: holdTxn.userId,
            type: 'refund_creator_hold',
            amount: -holdTxn.amount,
            balanceBefore: holdBefore,
            balanceAfter: holdAfter,
            walletType: 'holding',
            relatedPostId: postId,
            relatedUserId: buyerId,
            description: `Thu hồi khoản tạm giữ do người mua được hoàn tiền ảnh Premium`,
          }], { session })
        }
      }

      return { refunded: true, amount: price }
    })
  }

  /**
   * Đóng băng tiền khả dụng khi yêu cầu rút tiền (Khả dụng -> Đóng băng)
   */
  static async withdrawRequest(userId, amount) {
    if (amount < 50000) {
      throw new AppError('VALIDATION_ERROR', 'Số tiền rút tối thiểu là 50.000 VNĐ', 400)
    }

    return runInTransaction(async (session) => {
      const user = await User.findById(userId).session(session)
      if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)

      const availableBefore = user.vndBalance || 0
      if (availableBefore < amount) {
        throw new AppError('INSUFFICIENT_FUNDS', 'Số dư tài khoản không đủ để thực hiện rút tiền', 400)
      }

      // Khấu trừ ví khả dụng, chuyển sang ví đóng băng
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId, vndBalance: { $gte: amount } },
        {
          $inc: {
            vndBalance: -amount,
            holdingBalance: 0, // Không đổi
            lockedBalance: amount, // Cộng vào đóng băng
            totalWithdrawn: amount
          }
        },
        { new: true, session }
      )

      if (!updatedUser) {
        throw new AppError('INSUFFICIENT_FUNDS', 'Lỗi bất đồng bộ: Số dư không đủ', 400)
      }

      // Ghi log giao dịch đóng băng ví khả dụng
      const txn = await VndTransaction.create([{
        userId,
        type: 'withdraw_request',
        amount: -amount,
        balanceBefore: availableBefore,
        balanceAfter: updatedUser.vndBalance,
        walletType: 'available',
        description: `Yêu cầu rút tiền về ngân hàng ${user.bankAccount?.bankName} (STK: ${user.bankAccount?.accountNumber}). Tiền đã được đóng băng chờ duyệt.`,
        meta: {
          bankDetails: user.bankAccount
        }
      }], { session })

      // Ghi nhận dòng đóng băng vào sổ cái locked
      const lockedBefore = user.lockedBalance || 0
      await VndTransaction.create([{
        userId,
        type: 'withdraw_lock',
        amount,
        balanceBefore: lockedBefore,
        balanceAfter: lockedBefore + amount,
        walletType: 'locked',
        description: `Đóng băng số dư khả dụng chuyển vào ví rút tiền`,
      }], { session })

      return { user: updatedUser, transaction: txn[0] }
    })
  }

  /**
   * Duyệt lệnh rút tiền (Khấu trừ hoàn toàn locked balance)
   */
  static async withdrawApprove(txnId, adminNote, adminId) {
    return runInTransaction(async (session) => {
      // Tìm giao dịch gốc
      const requestTxn = await VndTransaction.findById(txnId).session(session)
      if (!requestTxn || requestTxn.type !== 'withdraw_request') {
        throw new AppError('NOT_FOUND', 'Không tìm thấy yêu cầu rút tiền hợp lệ', 404)
      }

      // Xem đã được xử lý chưa (ví dụ đã duyệt hoặc từ chối)
      if (requestTxn.meta && requestTxn.meta.statusApproved !== undefined) {
        throw new AppError('BAD_REQUEST', 'Yêu cầu rút tiền này đã được xử lý trước đó', 400)
      }

      const amount = Math.abs(requestTxn.amount)
      const user = await User.findById(requestTxn.userId).session(session)
      if (!user) throw new AppError('NOT_FOUND', 'Không tìm thấy người yêu cầu', 404)

      const lockedBefore = user.lockedBalance || 0
      if (lockedBefore < amount) {
        throw new AppError('INSUFFICIENT_FUNDS', 'Số dư đóng băng của người dùng không đủ (Lỗi logic)', 400)
      }

      // Cập nhật ví người dùng: trừ hẳn lockedBalance
      const updatedUser = await User.findOneAndUpdate(
        { _id: requestTxn.userId, lockedBalance: { $gte: amount } },
        { $inc: { lockedBalance: -amount } },
        { new: true, session }
      )

      if (!updatedUser) {
        throw new AppError('INSUFFICIENT_FUNDS', 'Lỗi đồng thời: Không thể khấu trừ ví đóng băng', 400)
      }

      // Đánh dấu giao dịch gốc đã được duyệt
      requestTxn.meta = {
        ...requestTxn.meta,
        statusApproved: true,
        processedBy: adminId,
        processedAt: new Date(),
        adminNote
      }
      await requestTxn.save({ session })

      // Tạo giao dịch đối ứng khấu trừ sổ cái locked
      const approveTxn = await VndTransaction.create([{
        userId: requestTxn.userId,
        type: 'withdraw_approved',
        amount: -amount,
        balanceBefore: lockedBefore,
        balanceAfter: updatedUser.lockedBalance,
        walletType: 'locked',
        description: `Duyệt yêu cầu rút tiền thành công. Admin đã thực hiện chuyển khoản.`,
        meta: {
          adminNote,
          relatedUserId: adminId
        }
      }], { session })

      return { user: updatedUser, transaction: approveTxn[0] }
    })
  }

  /**
   * Từ chối lệnh rút tiền (Trả tiền đóng băng về lại khả dụng)
   */
  static async withdrawReject(txnId, adminNote, adminId) {
    return runInTransaction(async (session) => {
      // Tìm giao dịch gốc
      const requestTxn = await VndTransaction.findById(txnId).session(session)
      if (!requestTxn || requestTxn.type !== 'withdraw_request') {
        throw new AppError('NOT_FOUND', 'Không tìm thấy yêu cầu rút tiền hợp lệ', 404)
      }

      if (requestTxn.meta && requestTxn.meta.statusApproved !== undefined) {
        throw new AppError('BAD_REQUEST', 'Yêu cầu rút tiền này đã được xử lý trước đó', 400)
      }

      const amount = Math.abs(requestTxn.amount)
      const user = await User.findById(requestTxn.userId).session(session)
      if (!user) throw new AppError('NOT_FOUND', 'Không tìm thấy người yêu cầu', 404)

      const lockedBefore = user.lockedBalance || 0
      if (lockedBefore < amount) {
        throw new AppError('INSUFFICIENT_FUNDS', 'Số dư đóng băng của người dùng không đủ (Lỗi logic)', 400)
      }

      // Trả tiền về ví khả dụng, trừ ở ví đóng băng, đồng thời giảm tổng số tiền rút
      const updatedUser = await User.findOneAndUpdate(
        { _id: requestTxn.userId, lockedBalance: { $gte: amount } },
        {
          $inc: {
            lockedBalance: -amount,
            vndBalance: amount,
            totalWithdrawn: -amount
          }
        },
        { new: true, session }
      )

      if (!updatedUser) {
        throw new AppError('INSUFFICIENT_FUNDS', 'Lỗi đồng thời: Không thể giải phóng ví đóng băng', 400)
      }

      // Đánh dấu giao dịch gốc đã bị từ chối
      requestTxn.meta = {
        ...requestTxn.meta,
        statusApproved: false,
        processedBy: adminId,
        processedAt: new Date(),
        adminNote
      }
      await requestTxn.save({ session })

      // Tạo giao dịch hoàn trả khả dụng
      await VndTransaction.create([{
        userId: requestTxn.userId,
        type: 'withdraw_rejected',
        amount: amount,
        balanceBefore: user.vndBalance,
        balanceAfter: updatedUser.vndBalance,
        walletType: 'available',
        description: `Yêu cầu rút tiền bị từ chối. Số tiền được hoàn lại ví khả dụng. Lý do: ${adminNote || 'Không hợp lệ'}`,
        meta: {
          adminNote,
          relatedUserId: adminId
        }
      }], { session })

      // Ghi nhận trừ tiền ở sổ cái locked
      const rejectTxn = await VndTransaction.create([{
        userId: requestTxn.userId,
        type: 'withdraw_rejected',
        amount: -amount,
        balanceBefore: lockedBefore,
        balanceAfter: updatedUser.lockedBalance,
        walletType: 'locked',
        description: `Giải phóng số dư đóng băng trả về ví khả dụng`,
      }], { session })

      return { user: updatedUser, transaction: rejectTxn[0] }
    })
  }
}

export default WalletService
