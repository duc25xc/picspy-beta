import fetch from 'node-fetch';

const base = "https://res.cloudinary.com/dnwb81zej/image/upload";
const path = "v1782495867/picspy/posts/sources/src_69cdffe7d9cc12efd485602e_0_1782495865682.jpg";

const testUrls = [
  `${base}/${path}`, // original
  `${base}/f_webp/${path}`,
  `${base}/w_1200/${path}`,
  `${base}/q_80/${path}`,
  `${base}/c_limit,w_1200/${path}`,
  `${base}/c_scale,w_1200/${path}`,
  // Let's also test without the version number!
  `${base}/picspy/posts/sources/src_69cdffe7d9cc12efd485602e_0_1782495865682.jpg`,
  `${base}/c_limit,w_1200,f_webp,q_80/picspy/posts/sources/src_69cdffe7d9cc12efd485602e_0_1782495865682.jpg`
];

for (const url of testUrls) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log(`URL: ${url}\nStatus: ${res.status}\n`);
  } catch (err) {
    console.error('Error:', err);
  }
}
