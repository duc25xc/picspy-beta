# TODO - PICSPY Search Enhancement

- [x] Step 1: Backend text search (`q`) in `getApprovedPosts` (caption/prompt/tags) + regex escaping + normalization.
- [ ] Step 2: Add new backend endpoint `POST /posts/search-by-image` (upload single image) and matching by histogram/palette.

- [ ] Step 3: Add route wiring in `backend/src/routes/post.routes.js`.
- [ ] Step 4: Frontend UI: add image upload panel + call new endpoint; integrate with existing grid/modal.
- [ ] Step 5: Testing: verify `/search?q=...` works; verify image search returns results.
- [ ] Step 6: Performance pass: debounce, pagination correctness, avoid double-fetch.
