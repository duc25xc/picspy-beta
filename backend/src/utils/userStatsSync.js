import mongoose from 'mongoose'
import User from '../models/User.model.js'
import Post from '../models/Post.model.js'
import Follow from '../models/Follow.model.js'
import { logger } from './logger.js'

export const syncUserStats = async () => {
  try {
    // 1. Aggregate post metrics per authorId
    const authorStats = await Post.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$authorId',
          postsCount: { $sum: 1 },
          totalViews: { $sum: { $ifNull: ['$stats.viewsCount', 0] } },
          totalDownloads: { $sum: { $ifNull: ['$stats.downloadsCount', 0] } },
          totalLikes: { $sum: { $ifNull: ['$stats.likesCount', 0] } },
        },
      },
    ])

    const bulkOps = authorStats.map((stat) => ({
      updateOne: {
        filter: { _id: stat._id },
        update: {
          $set: {
            'stats.postsCount': stat.postsCount,
            'stats.totalViews': stat.totalViews,
            'stats.totalDownloads': stat.totalDownloads,
            'stats.totalLikes': stat.totalLikes,
          },
        },
      },
    }))

    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps)
    }

    // 2. Aggregate follower counts per followingId
    const followerStats = await Follow.aggregate([
      { $group: { _id: '$followingId', count: { $sum: 1 } } },
    ])

    const followOps = followerStats.map((stat) => ({
      updateOne: {
        filter: { _id: stat._id },
        update: { $set: { 'stats.followersCount': stat.count } },
      },
    }))

    if (followOps.length > 0) {
      await User.bulkWrite(followOps)
    }

    logger.info(
      `📊 Synchronized user stats for ${authorStats.length} authors and ${followerStats.length} creators with followers.`
    )
  } catch (err) {
    logger.error('Failed to synchronize user stats:', err)
  }
}
