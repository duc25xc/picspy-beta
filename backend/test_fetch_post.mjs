import mongoose from 'mongoose';

const URI = 'mongodb+srv://picspy:picspy@duc25xc.cepmcvt.mongodb.net/?appName=duc25xc';

async function run() {
  try {
    await mongoose.connect(URI);
    console.log('DB connected');
    const post = await mongoose.connection.db.collection('posts').findOne({ _id: new mongoose.Types.ObjectId('6a0cdd07c4a43041b15a54ab') });
    if (!post) {
      console.log('Post not found');
      return;
    }
    console.log('=== Post Details ===');
    console.log('status:', post.status);
    console.log('isMultiModel:', post.isMultiModel);
    console.log('aiTool:', post.aiTool);
    console.log('aiModel:', post.aiModel);
    console.log('generatedImages length:', post.generatedImages?.length);
    if (post.generatedImages) {
      post.generatedImages.forEach((img, idx) => {
        console.log(`  GenImg ${idx}: url=${img.url}`);
      });
    }
    console.log('modelComparisons length:', post.modelComparisons?.length);
    if (post.modelComparisons) {
      post.modelComparisons.forEach((m, idx) => {
        console.log(`  Slot ${idx}: tool=${m.aiTool}, images=${m.generatedImages?.length}`);
        if (m.generatedImages) {
          m.generatedImages.forEach((img, imgIdx) => {
            console.log(`    Img ${imgIdx}: url=${img.url}`);
          });
        }
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

run();
