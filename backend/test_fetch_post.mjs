async function run() {
  try {
    const res = await fetch('http://localhost:5000/v1/posts/6a0cd21e35b6776c3eeca222');
    if (!res.ok) {
      console.log('Error status:', res.status);
      return;
    }
    const data = await res.json();
    console.log('=== API Response ===');
    console.log('isMultiModel:', data.post?.isMultiModel);
    console.log('modelComparisons:', JSON.stringify(data.post?.modelComparisons, null, 2));
  } catch (err) {
    console.error('Error fetching post:', err.message);
  }
}

run();
