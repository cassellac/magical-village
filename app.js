(function(){
  const DATA = SITE_DATA;
  const records = DATA.records;
  const groups = DATA.groups;
  const globalPalette = DATA.globalPalette;

  const CATEGORY_ORDER = ["Illustration","Architecture","Blueprint","Pattern","Icon"];

  let activeCategory = "All";
  let activeColorFamily = null; // index into globalPalette
  let currentView = "grid";
  let modalIndex = null; // index into filteredList()

  // ---------- derived indices ----------
  records.forEach((r,i)=> r._i = i);
  const groupOf = new Map(); // file -> group
  groups.forEach(g => g.files.forEach(f => groupOf.set(f, g)));
  const recordByFile = new Map(records.map(r => [r.file, r]));

  // ---------- header stats ----------
  document.getElementById('statTotal').textContent = records.length;
  document.getElementById('statCats').textContent = CATEGORY_ORDER.length;
  document.getElementById('statPairs').textContent = groups.filter(g=>g.size>1).length;

  // ---------- palette swatches ----------
  const paletteEl = document.getElementById('paletteSwatches');
  globalPalette.forEach((hex, i) => {
    const el = document.createElement('div');
    el.className = 'swatch';
    el.style.background = hex;
    el.dataset.hex = hex;
    el.title = hex;
    el.addEventListener('click', () => {
      activeColorFamily = (activeColorFamily === i) ? null : i;
      renderAll();
    });
    paletteEl.appendChild(el);
  });

  function syncPaletteUI(){
    [...paletteEl.children].forEach((el, i) => {
      el.classList.toggle('active', activeColorFamily === i);
    });
  }

  // ---------- category pills ----------
  const pillsEl = document.getElementById('categoryPills');
  function buildPills(){
    const counts = {};
    CATEGORY_ORDER.forEach(c => counts[c] = 0);
    records.forEach(r => counts[r.category] = (counts[r.category]||0) + 1);
    const cats = ["All", ...CATEGORY_ORDER];
    pillsEl.innerHTML = "";
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'pill' + (activeCategory === cat ? ' active' : '');
      const count = cat === "All" ? records.length : counts[cat];
      btn.innerHTML = `${cat} <span class="count">${count}</span>`;
      btn.addEventListener('click', () => { activeCategory = cat; renderAll(); });
      pillsEl.appendChild(btn);
    });
  }

  // ---------- view toggle ----------
  const viewGridBtn = document.getElementById('viewGridBtn');
  const viewPairsBtn = document.getElementById('viewPairsBtn');
  const gridView = document.getElementById('gridView');
  const pairsView = document.getElementById('pairsView');
  viewGridBtn.addEventListener('click', () => { currentView = 'grid'; renderAll(); });
  viewPairsBtn.addEventListener('click', () => { currentView = 'pairs'; renderAll(); });

  // ---------- filtering ----------
  function matchesFilters(r){
    if (activeCategory !== "All" && r.category !== activeCategory) return false;
    if (activeColorFamily !== null && !r.colorFamilies.includes(activeColorFamily)) return false;
    return true;
  }
  function filteredList(){
    return records.filter(matchesFilters);
  }

  // ---------- card rendering ----------
  function categoryIcon(cat){
    return { Illustration:"◆", Architecture:"▲", Blueprint:"✎", Pattern:"▦", Icon:"✦" }[cat] || "•";
  }

  function renderGrid(){
    const list = filteredList();
    gridView.innerHTML = "";
    document.getElementById('emptyState').hidden = list.length > 0;
    list.forEach((r, listIdx) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.animationDelay = (Math.min(listIdx,24) * 0.025) + 's';
      const g = groupOf.get(r.file);
      const hasPair = g && g.size > 1;
      card.innerHTML = `
        <div class="card-media">
          <img src="${r.url}" alt="${r.caption}" loading="lazy">
          <span class="card-badge">${categoryIcon(r.category)} ${r.category}</span>
          ${hasPair ? `<span class="card-pair-flag" title="Has a suggested print pair">⇄</span>` : ""}
          <div class="card-overlay">
            <div class="card-overlay-content">
              <p class="card-caption-hover">${r.caption}</p>
              <div class="card-dots">
                ${r.palette.slice(0,5).map(c=>`<span class="card-dot" style="background:${c}"></span>`).join("")}
              </div>
            </div>
          </div>
        </div>
        <div class="card-footer">
          <p class="card-caption">${r.caption}</p>
          <button class="card-dl" title="Download">
            <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M6 18h12"/></svg>
          </button>
        </div>
      `;
      card.querySelector('.card-dl').addEventListener('click', (e) => {
        e.stopPropagation();
        triggerDownload(r);
      });
      card.addEventListener('click', () => openModal(r._i, list));
      gridView.appendChild(card);
    });
  }

  function renderPairs(){
    const list = filteredList();
    const seen = new Set();
    const visibleGroups = [];
    list.forEach(r => {
      const g = groupOf.get(r.file);
      if (g && !seen.has(g.id)) {
        seen.add(g.id);
        // only show a group in this view if at least one member passes filter (already true since r is in list)
        visibleGroups.push(g);
      }
    });
    pairsView.innerHTML = "";
    document.getElementById('emptyState').hidden = visibleGroups.length > 0;
    visibleGroups.forEach((g, idx) => {
      const members = g.files.map(f => recordByFile.get(f));
      const card = document.createElement('div');
      card.className = 'pair-card';
      card.style.animationDelay = (Math.min(idx,24) * 0.03) + 's';
      card.innerHTML = `
        <div class="pair-thumbs">
          ${members.slice(0,3).map(m => `<img src="${m.url}" alt="${m.caption}" loading="lazy">`).join("")}
        </div>
        <div class="pair-meta">
          <div class="pair-meta-top">
            <span class="pair-cat">${categoryIcon(g.dominantCategory)} ${g.dominantCategory}</span>
            <span class="pair-size">${g.size} piece${g.size>1?"s":""} for print</span>
          </div>
          <div class="pair-tags">${g.tags.map(t=>`<span class="pair-tag">${t}</span>`).join("")}</div>
        </div>
      `;
      card.addEventListener('click', () => openModal(members[0]._i, records));
      pairsView.appendChild(card);
    });
  }

  function renderAll(){
    syncPaletteUI();
    buildPills();
    gridView.hidden = currentView !== 'grid';
    pairsView.hidden = currentView !== 'pairs';
    viewGridBtn.classList.toggle('active', currentView === 'grid');
    viewPairsBtn.classList.toggle('active', currentView === 'pairs');
    if (currentView === 'grid') renderGrid(); else renderPairs();
  }

  // ---------- download ----------
  function triggerDownload(r){
    const a = document.createElement('a');
    a.href = r.url;
    a.download = r.downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast(`Downloading “${r.caption}”…`);
  }

  function showToast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(showToast._tm);
    showToast._tm = setTimeout(()=> t.classList.remove('show'), 2200);
  }

  // ---------- modal ----------
  const backdrop = document.getElementById('modalBackdrop');
  const modalImage = document.getElementById('modalImage');
  const modalCategory = document.getElementById('modalCategory');
  const modalCaption = document.getElementById('modalCaption');
  const modalTags = document.getElementById('modalTags');
  const modalPalette = document.getElementById('modalPalette');
  const modalPairBlock = document.getElementById('modalPairBlock');
  const modalPairNote = document.getElementById('modalPairNote');
  const modalPairThumbs = document.getElementById('modalPairThumbs');
  const modalDownload = document.getElementById('modalDownload');
  const modalDownloadPair = document.getElementById('modalDownloadPair');

  let modalList = records;

  function openModal(recordIndex, list){
    modalList = list && list.length ? list : records;
    let pos = modalList.findIndex(r => r._i === recordIndex);
    if (pos === -1) pos = 0;
    modalIndex = pos;
    renderModal();
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(){
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderModal(){
    const r = modalList[modalIndex];
    modalImage.src = r.url;
    modalImage.alt = r.caption;
    modalCategory.textContent = `${categoryIcon(r.category)} ${r.category}`;
    modalCaption.textContent = r.caption;
    modalTags.innerHTML = r.tags.map(t => `<span>${t}</span>`).join("");
    modalPalette.innerHTML = r.palette.map(c => `<div class="modal-swatch" style="background:${c}" title="${c}"></div>`).join("");
    [...modalPalette.children].forEach((el, i) => {
      el.addEventListener('click', () => {
        navigator.clipboard && navigator.clipboard.writeText(r.palette[i]).catch(()=>{});
        showToast(`Copied ${r.palette[i]} to clipboard`);
      });
    });

    modalDownload.href = r.url;
    modalDownload.download = r.downloadName;

    const g = groupOf.get(r.file);
    const partners = g ? g.files.filter(f => f !== r.file).map(f => recordByFile.get(f)) : [];
    if (partners.length){
      modalPairBlock.style.display = "";
      modalPairNote.textContent = `Pairs well with ${partners.length} other asset${partners.length>1?"s":""} — shared "${g.dominantCategory}" styling and ${g.tags.slice(0,2).join(" / ")} tones. Great for a coordinated print set.`;
      modalPairThumbs.innerHTML = partners.map(p => `<div class="pair-thumb" data-file="${p.file}" title="${p.caption}"><img src="${p.url}" alt="${p.caption}"></div>`).join("");
      [...modalPairThumbs.children].forEach(el => {
        el.addEventListener('click', () => {
          const file = el.dataset.file;
          const target = recordByFile.get(file);
          const idxInList = modalList.findIndex(x => x.file === file);
          if (idxInList !== -1){ modalIndex = idxInList; }
          else { modalList = records; modalIndex = records.findIndex(x=>x.file===file); }
          renderModal();
        });
      });
      modalDownloadPair.style.display = "";
      modalDownloadPair.onclick = () => {
        triggerDownload(r);
        partners.forEach((p, i) => setTimeout(() => triggerDownload(p), (i+1) * 450));
        showToast(`Downloading print set (${partners.length + 1} files)…`);
      };
    } else {
      modalPairBlock.style.display = "none";
      modalDownloadPair.style.display = "none";
    }
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
  document.getElementById('modalPrev').addEventListener('click', () => {
    modalIndex = (modalIndex - 1 + modalList.length) % modalList.length;
    renderModal();
  });
  document.getElementById('modalNext').addEventListener('click', () => {
    modalIndex = (modalIndex + 1) % modalList.length;
    renderModal();
  });
  document.addEventListener('keydown', (e) => {
    if (!backdrop.classList.contains('open')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') { modalIndex = (modalIndex - 1 + modalList.length) % modalList.length; renderModal(); }
    if (e.key === 'ArrowRight') { modalIndex = (modalIndex + 1) % modalList.length; renderModal(); }
  });

  // ---------- init ----------
  renderAll();
})();
