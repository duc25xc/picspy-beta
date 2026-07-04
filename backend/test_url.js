import fetch from 'node-fetch';

const originalUrl = "https://res.cloudinary.com/dnwb81zej/image/upload/v1782495867/picspy/posts/sources/src_69cdffe7d9cc12efd485602e_0_1782495865682.jpg";
const optimizedUrl = "https://res.cloudinary.com/dnwb81zej/image/upload/c_limit,w_1200,f_webp,q_80/v1782495867/picspy/posts/sources/src_69cdffe7d9cc12efd485602e_0_1782495865682.jpg";

try {
  const res1 = await fetch(originalUrl, { method: 'HEAD' });
  console.log('Original URL status:', res1.status);

  const res2 = await fetch(optimizedUrl, { method: 'HEAD' });
  console.log('Optimized URL status:', res2.status);
} catch (err) {
  console.error('Error fetching:', err);
}
