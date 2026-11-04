/* ==========================================================================
   DETANZA — How To Use page: video upload, preview & local persistence
   ========================================================================== */

(function () {
  const MAX_SIZE_MB = 500;
  const DB_NAME = 'detanza_media';
  const STORE = 'videos';
  const KEY = 'how_to_use';

  const input = document.getElementById('videoInput');
  const dropzone = document.getElementById('dropzone');
  const player = document.getElementById('videoPlayer');
  const actions = document.getElementById('videoActions');
  const nameEl = document.getElementById('videoName');
  const feedback = document.getElementById('videoFeedback');
  const replaceBtn = document.getElementById('replaceBtn');
  const removeBtn = document.getElementById('removeBtn');

  if (!input || !dropzone || !player) return;

  let objectUrl = null;

  /* ---- IndexedDB helpers ---- */
  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbRun(mode, fn) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  const saveVideo = (file) => dbRun('readwrite', (s) => s.put(file, KEY));
  const loadVideo = () => dbRun('readonly', (s) => s.get(KEY));
  const deleteVideo = () => dbRun('readwrite', (s) => s.delete(KEY));

  /* ---- UI ---- */
  function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `form-feedback show ${type}`;
  }

  function showVideo(file) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(file);
    player.src = objectUrl;
    player.hidden = false;
    dropzone.hidden = true;
    actions.hidden = false;
    nameEl.textContent = file.name || 'Uploaded video';
  }

  function clearVideo() {
    player.pause();
    player.removeAttribute('src');
    player.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    player.hidden = true;
    dropzone.hidden = false;
    actions.hidden = true;
    input.value = '';
  }

  async function handleFile(file) {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showFeedback('Please choose a video file (MP4, WebM or MOV).', 'error');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      showFeedback(`That file is too large. Maximum size is ${MAX_SIZE_MB} MB.`, 'error');
      return;
    }

    showVideo(file);

    try {
      await saveVideo(file);
      showFeedback('✦ Video uploaded and saved on this device.', 'success');
    } catch (err) {
      showFeedback('Video is playing, but could not be saved for next visit.', 'error');
    }
  }

  /* ---- Events ---- */
  input.addEventListener('change', () => handleFile(input.files[0]));
  replaceBtn.addEventListener('click', () => input.click());

  removeBtn.addEventListener('click', async () => {
    clearVideo();
    try { await deleteVideo(); } catch (err) { /* ignore */ }
    showFeedback('Video removed.', 'success');
  });

  ['dragenter', 'dragover'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    })
  );
  dropzone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  /* ---- Restore previously saved video ---- */
  loadVideo()
    .then((file) => { if (file) showVideo(file); })
    .catch(() => { /* IndexedDB unavailable — upload still works for this session */ });
})();
