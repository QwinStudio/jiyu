(() => {
  const parse = raw => raw.split(/\r?\n/).map(line => {
    const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    return match ? { at: Number(match[1]) * 60 + Number(match[2]), text: match[3].trim() } : null;
  }).filter(Boolean);
  const cjk = value => /[\u4e00-\u9fff]/.test(value);
  const latin = value => /[A-Za-z]/.test(value);
  const metadata = value => /^(lyrics|composed|arranged|produced|tme|作词|作曲|编曲|监制)/i.test(value.trim());

  const filler = value => /^(?:uh+|oh+|yeah+|yo+|woo+|whoa+|ah+|mm+|hmm+|la+|na+|hey+)[\s!,.~—-]*$/i.test(value.trim());
  const substantial = value => {
    const plain = String(value || '').replace(/[^A-Za-z\u4e00-\u9fff]/g, '');
    return cjk(plain) ? plain.length >= 2 : plain.length >= 4;
  };
  const confirmedPair = (first, second, next) => {
    const complementary = (cjk(first.text) && latin(second.text)) || (latin(first.text) && cjk(second.text));
    if (!complementary || metadata(first.text) || metadata(second.text) || filler(first.text) || filler(second.text) || !substantial(first.text) || !substantial(second.text)) return false;
    // EN(A) → ZH(A) → EN(B) is a common interleaved translated-LRC format.
    // Never start a pair from Chinese, or ZH(A) will be joined to EN(B).
    if (!latin(first.text) || !cjk(second.text)) return false;
    const sameTimestamp = Math.abs(second.at - first.at) <= 0.08;
    // The following same-time line can start either a new English line or a
    // Chinese-only section after this final translated English lyric.
    const staggeredTranslation = Boolean(next)
      && (latin(next.text) || cjk(next.text))
      && substantial(next.text)
      && Math.abs(next.at - second.at) <= 0.08;
    return sameTimestamp || staggeredTranslation;
  };

  async function connect(mode) {
    if (mode.dataset.bilingualSyncReady === '1') return;
    const audio = document.querySelector('#music-player audio');
    const sheet = mode.querySelector('.music-lyrics-sheet');
    const nodes = [...sheet?.querySelectorAll('[data-line]') || []];
    const source = audio?.dataset.lyrics;
    if (!audio || !sheet || !source || nodes.length < 2) return;
    const lines = parse(await fetch(source).then(response => response.ok ? response.text() : '').catch(() => ''));
    const pairs = [];
    for (let index = 0; index < lines.length - 1 && index < nodes.length - 1; index++) {
      const first = lines[index], second = lines[index + 1], next = lines[index + 2];
      if (confirmedPair(first, second, next)) {
        pairs.push([index, index + 1]);
        index++;
      }
    }
    if (pairs.length < 3) return;
    const pairedStart = new Map(pairs.map(pair => [pair[0], pair]));
    const pairedIndices = new Set(pairs.flat());
    const groups = [];
    for (let index = 0; index < lines.length; index++) {
      if (pairedStart.has(index)) {
        const indices = pairedStart.get(index);
        groups.push({ start: lines[index].at, indices });
      } else if (!pairedIndices.has(index)) {
        groups.push({ start: lines[index].at, indices: [index] });
      }
    }
    groups.sort((left, right) => left.start - right.start || left.indices[0] - right.indices[0]);
    mode.dataset.bilingualSyncReady = '1';
    let manualUntil = 0;
    const closeButton = mode.querySelector('.music-lyrics-close');
    closeButton?.addEventListener('click', event => {
      // This capture fallback prevents the dual-lyrics interaction listeners from trapping the return action.
      event.preventDefault();
      event.stopImmediatePropagation();
      mode.classList.add('closing');
      setTimeout(() => mode.remove(), 430);
    }, true);
    const sync = () => {
      let active = groups[0];
      groups.forEach(group => { if (audio.currentTime >= group.start) active = group; });
      const activeIndices = new Set(active.indices);
      nodes.forEach((node, index) => {
        const sourceIndex = Number(node.dataset.sourceIndex ?? index);
        node.classList.toggle('active', activeIndices.has(sourceIndex));
        node.dataset.distance = activeIndices.has(sourceIndex) ? '0' : String(Math.min(4, Math.abs(sourceIndex - active.indices[0])));
      });
      const anchor = nodes.find(node => Number(node.dataset.sourceIndex ?? nodes.indexOf(node)) === active.indices[0]);
      if (anchor && Date.now() >= manualUntil) sheet.scrollTo({ top: Math.max(0, anchor.offsetTop + anchor.offsetHeight / 2 - sheet.clientHeight / 2), behavior: 'smooth' });
    };
    sheet.addEventListener('pointerdown', () => { manualUntil = Date.now() + 5000; }, { passive: true });
    nodes.forEach((node, index) => node.addEventListener('click', () => {
      const sourceIndex = Number(node.dataset.sourceIndex ?? index);
      const line = lines[sourceIndex];
      if (!line) return;
      manualUntil = 0;
      audio.currentTime = line.at;
      sync();
    }));
    audio.addEventListener('timeupdate', sync);
    audio.addEventListener('loadedmetadata', sync);
    audio.addEventListener('seeking', sync);
    audio.addEventListener('seeked', sync);
    audio.addEventListener('play', sync);
    sync();
  }

  const observer = new MutationObserver(() => document.querySelectorAll('.music-lyrics-mode').forEach(connect));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.querySelectorAll('.music-lyrics-mode').forEach(connect);
})();

// Keep the immersive lyric view visually connected to the playing album.
(() => {
  const style = document.createElement('style');
  style.textContent = `
    .music-lyrics-mode.has-cover-background{background:transparent!important;isolation:isolate}
    .music-lyrics-mode.has-cover-background::before{content:"";position:absolute;inset:-14%;z-index:0;pointer-events:none;background-image:linear-gradient(145deg,rgba(2,6,18,.84),rgba(5,10,25,.7) 48%,rgba(1,4,13,.92)),var(--lyrics-cover);background-position:center;background-size:cover;filter:blur(56px) saturate(1.15) brightness(.55);transform:scale(1.16)}
    .music-lyrics-mode.has-cover-background .music-lyrics-header,.music-lyrics-mode.has-cover-background .music-lyrics-sheet{position:relative;z-index:1}
    @media(max-width:1024px){.music-lyrics-mode.has-cover-background::before{inset:-22%;filter:blur(64px) saturate(1.12) brightness(.48);transform:scale(1.2)}}
  `;
  document.head.append(style);

  const apply = mode => {
    if (mode.dataset.coverBackdropReady === '1') return;
    const cover = document.querySelector('#music-player .music-revive-cover img, #music-player .music-player-art img');
    if (!cover?.src) return;
    mode.dataset.coverBackdropReady = '1';
    mode.classList.add('has-cover-background');
    mode.style.setProperty('--lyrics-cover', `url("${cover.src}")`);
  };
  const observer = new MutationObserver(() => document.querySelectorAll('.music-lyrics-mode').forEach(apply));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.querySelectorAll('.music-lyrics-mode').forEach(apply);
})();
