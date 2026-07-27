(() => {
  const style = document.createElement('style');
  style.textContent = `
    .music-lyrics-mode.is-bilingual .music-lyrics-sheet p.bilingual-english {
      margin-bottom: calc(10px - clamp(26px, 4.7vh, 54px));
      color: rgba(245,250,255,.92);
      font-size: clamp(28px, 5vw, 62px);
      font-weight: 650;
    }
    .music-lyrics-mode.is-bilingual .music-lyrics-sheet p.bilingual-english.active {
      color: #fff !important;
      text-shadow: 0 0 22px rgba(188,230,255,.18);
    }
    .music-lyrics-mode.is-bilingual .music-lyrics-sheet p.bilingual-chinese {
      color: rgba(214,230,255,.56);
      font-size: clamp(19px, 3.5vw, 43px);
      font-weight: 500;
      letter-spacing: -.01em;
      transform: none !important;
    }
    .music-lyrics-mode.is-bilingual .music-lyrics-sheet p.bilingual-chinese.active {
      color: rgba(225,247,255,.92) !important;
      text-shadow: none;
    }
    .music-lyrics-mode.is-bilingual .music-lyrics-sheet p.bilingual-primary {
      margin-bottom: 0;
    }
  `;
  document.head.append(style);

  const parse = raw => raw.split(/\r?\n/).map(line => {
    const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    return match ? { at: Number(match[1]) * 60 + Number(match[2]), text: match[3].trim() } : null;
  }).filter(Boolean);

  const hasCjk = value => /[\u4e00-\u9fff]/.test(value);
  const hasLatin = value => /[A-Za-z]/.test(value);
  const isMetadata = value => /^(lyrics|composed|arranged|produced|tme|作词|作曲|编曲|监制)/i.test(value.trim());

  const isFiller = value => /^(?:uh+|oh+|yeah+|yo+|woo+|whoa+|ah+|mm+|hmm+|la+|na+|hey+)[\s!,.~—-]*$/i.test(value.trim());
  const isSubstantial = value => {
    const plain = String(value || '').replace(/[^A-Za-z\u4e00-\u9fff]/g, '');
    return hasCjk(plain) ? plain.length >= 2 : plain.length >= 4;
  };
  const isConfirmedPair = (first, second, next) => {
    const complementary = (hasCjk(first.text) && hasLatin(second.text)) || (hasLatin(first.text) && hasCjk(second.text));
    if (!complementary || isMetadata(first.text) || isMetadata(second.text) || isFiller(first.text) || isFiller(second.text) || !isSubstantial(first.text) || !isSubstantial(second.text)) return false;
    // Some translated LRC files are interleaved as EN(A) → ZH(A) → EN(B),
    // where ZH(A) and EN(B) share a timestamp. Only English may start a pair;
    // otherwise ZH(A) would be incorrectly attached to EN(B).
    if (!hasLatin(first.text) || !hasCjk(second.text)) return false;
    const sameTimestamp = Math.abs(second.at - first.at) <= 0.08;
    // At a language transition, the next line may be either a new English line
    // or the first line of a Chinese-only passage at the same timestamp.
    const staggeredTranslation = Boolean(next)
      && (hasLatin(next.text) || hasCjk(next.text))
      && isSubstantial(next.text)
      && Math.abs(next.at - second.at) <= 0.08;
    return sameTimestamp || staggeredTranslation;
  };

  async function decorate(mode) {
    if (mode.dataset.bilingualReady === '1') return;
    const audio = document.querySelector('#music-player audio');
    const source = audio?.dataset.lyrics;
    const nodes = [...mode.querySelectorAll('.music-lyrics-sheet [data-line]')];
    if (!source || nodes.length < 2) return;
    const lines = parse(await fetch(source).then(response => response.ok ? response.text() : '').catch(() => ''));
    nodes.forEach((node, index) => { node.dataset.sourceIndex = String(index); });
    const pairs = [];
    for (let index = 0; index < lines.length - 1 && index < nodes.length - 1; index++) {
      const first = lines[index], second = lines[index + 1], next = lines[index + 2];
      if (isConfirmedPair(first, second, next)) {
        pairs.push([index, index + 1]);
        index++;
      }
    }
    if (pairs.length >= 3) {
      pairs.forEach(([firstIndex, secondIndex], group) => {
        const first = nodes[firstIndex], second = nodes[secondIndex];
        first.dataset.bilingualGroup = String(group);
        second.dataset.bilingualGroup = String(group);
        first.classList.add(hasLatin(lines[firstIndex].text) ? 'bilingual-english' : 'bilingual-chinese');
        second.classList.add(hasLatin(lines[secondIndex].text) ? 'bilingual-english' : 'bilingual-chinese');
        first.classList.add('bilingual-primary');
        second.classList.add('bilingual-translation');
        // Present the English original above its Chinese translation without changing timing indices.
        if (hasCjk(lines[firstIndex].text) && hasLatin(lines[secondIndex].text)) first.before(second);
      });
      mode.classList.add('is-bilingual');
      mode.dataset.bilingualReady = '1';
      audio?.dispatchEvent(new Event('bilinguallyricsready'));
    }
  }

  const observer = new MutationObserver(() => document.querySelectorAll('.music-lyrics-mode').forEach(decorate));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.querySelectorAll('.music-lyrics-mode').forEach(decorate);
})();
