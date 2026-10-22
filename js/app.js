(() => {
  const { categorias, produtos } = window.NEXBRIDGE;
  const $ = (s, el = document) => el.querySelector(s);
  const POR_VEZ = 48;
  const catPorSigla = Object.fromEntries(categorias.map((c) => [c.sigla, c]));
  const porSku = Object.fromEntries(produtos.map((p) => [p.sku, p]));
  const normal = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const arcoMini = '<svg viewBox="0 0 600 260" aria-hidden="true"><path d="M0 250 C 150 150, 330 70, 470 60 L 452 74 C 330 92, 160 170, 40 250 Z" fill="#1fa6cc"/><path d="M60 250 C 190 168, 350 92, 480 70 L 466 86 C 350 112, 205 182, 104 250 Z" fill="#1d2566"/><path d="M118 250 C 240 178, 380 104, 488 78 C 540 66, 580 120, 600 250 L 562 250 C 546 150, 520 110, 484 112 C 390 128, 262 190, 170 250 Z" fill="#9aa0a5"/></svg>';
  const semFoto = `<div class="sem-foto">${arcoMini}<span>Foto em atualização</span></div>`;
  const foto = (p, grande) => p.foto
    ? `<img src="img/produtos/${p.foto}${grande ? "" : "-p"}.webp" alt="${esc(p.nome)}" loading="lazy" decoding="async" width="${grande ? 640 : 360}" height="${grande ? 640 : 360}">`
    : semFoto;
  const busca = normal.bind(null);
  produtos.forEach((p) => { p._busca = busca(`${p.sku} ${p.nome} ${p.sub} ${catPorSigla[p.cat]?.nome ?? ""}`); });

  // ---------- lista de cotação (fica só neste navegador) ----------
  const CHAVE = "nexbridge-cotacao";
  let lista = {};
  try { lista = JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { lista = {}; }
  for (const sku of Object.keys(lista)) if (!porSku[sku]) delete lista[sku];
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch { /* sem armazenamento: lista vale só nesta visita */ } };

  // ---------- números do topo ----------
  $("[data-total-produtos]").textContent = produtos.length;
  $("[data-total-categorias]").textContent = categorias.length;
  $("[data-ano]").textContent = new Date().getFullYear();

  // ---------- cartões de categoria ----------
  $("[data-cats]").innerHTML = categorias.map((c) => {
    let fotos = produtos.filter((p) => p.cat === c.sigla && p.foto).slice(0, 4);
    if (fotos.length < 4) fotos = fotos.slice(0, 1);
    return `<button class="cat" type="button" data-cat="${c.sigla}">
      <span class="cat-fotos${fotos.length === 1 ? " uma" : ""}">${fotos.map((p) => `<img src="img/produtos/${p.foto}-p.webp" alt="" loading="lazy" width="180" height="180">`).join("")}</span>
      <span class="cat-txt"><strong>${esc(c.nome)}</strong><span>${c.total} produtos</span></span>
    </button>`;
  }).join("");
  $("[data-cats]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    estado.cat = b.dataset.cat; estado.sub = ""; estado.quantos = POR_VEZ;
    desenhar();
    $("#produtos").scrollIntoView();
  });

  // ---------- filtros e grade ----------
  const estado = { cat: "", sub: "", termo: "", quantos: POR_VEZ };
  const filtrados = () => {
    const t = normal(estado.termo.trim());
    return produtos.filter((p) => (!estado.cat || p.cat === estado.cat) && (!estado.sub || p.sub === estado.sub) && (!t || t.split(/\s+/).every((w) => p._busca.includes(w))));
  };

  function desenharFiltros() {
    const chip = (valor, rotulo, qtd, ativo, attr) =>
      `<button class="chip" type="button" role="tab" ${attr}="${esc(valor)}" aria-selected="${ativo}">${esc(rotulo)}${qtd != null ? `<small>${qtd}</small>` : ""}</button>`;
    $("[data-filtros]").innerHTML = chip("", "Todos", produtos.length, !estado.cat, "data-f-cat") +
      categorias.map((c) => chip(c.sigla, c.nome, c.total, estado.cat === c.sigla, "data-f-cat")).join("");
    const cat = catPorSigla[estado.cat];
    $("[data-subfiltros]").innerHTML = cat && cat.subs.length > 1
      ? chip("", "Todas", null, !estado.sub, "data-f-sub") + cat.subs.map((s) => chip(s, s, null, estado.sub === s, "data-f-sub")).join("")
      : "";
  }

  const card = (p) => `
    <article class="card">
      <button class="card-abrir" type="button" data-abrir="${p.sku}">
        <span class="card-foto">${foto(p)}</span>
        <span class="card-txt">
          <span class="sku">${p.sku}</span>
          <h3>${esc(p.nome)}</h3>
          <span class="sub">${esc(p.sub)}</span>
        </span>
      </button>
      <button class="card-add ${lista[p.sku] ? "ok" : ""}" type="button" data-add="${p.sku}">${lista[p.sku] ? "✓ Na cotação" : "+ Adicionar à cotação"}</button>
    </article>`;

  function desenhar() {
    desenharFiltros();
    const itens = filtrados();
    const vis = itens.slice(0, estado.quantos);
    $("[data-grade]").innerHTML = vis.length ? vis.map(card).join("") : `<p class="vazio">Nenhum produto encontrado. Tente outro termo ou categoria.</p>`;
    $("[data-resultado]").textContent = `${itens.length} ${itens.length === 1 ? "produto" : "produtos"}${estado.cat ? ` em ${catPorSigla[estado.cat].nome}` : ""}${estado.sub ? ` · ${estado.sub}` : ""}`;
    $("[data-mais]").hidden = itens.length <= estado.quantos;
  }

  $("[data-filtros]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f-cat]");
    if (!b) return;
    estado.cat = b.dataset.fCat; estado.sub = ""; estado.quantos = POR_VEZ; desenhar();
  });
  $("[data-subfiltros]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f-sub]");
    if (!b) return;
    estado.sub = b.dataset.fSub; estado.quantos = POR_VEZ; desenhar();
  });
  let espera;
  $("[data-busca]").addEventListener("input", (e) => {
    clearTimeout(espera);
    espera = setTimeout(() => { estado.termo = e.target.value; estado.quantos = POR_VEZ; desenhar(); }, 150);
  });
  $("[data-mais]").addEventListener("click", () => { estado.quantos += POR_VEZ; desenhar(); });

  $("[data-grade]").addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) { alternar(add.dataset.add); return; }
    const abrir = e.target.closest("[data-abrir]");
    if (abrir) location.hash = `p=${abrir.dataset.abrir}`;
  });

  // ---------- detalhe do produto ----------
  const modal = $("[data-modal]");
  function abrirProduto(sku) {
    const p = porSku[sku];
    if (!p) return;
    modal.dataset.sku = sku;
    $("[data-m-foto]").innerHTML = foto(p, true);
    $("[data-m-sku]").textContent = p.sku;
    $("[data-m-nome]").textContent = p.nome;
    $("[data-m-cat]").textContent = `${catPorSigla[p.cat]?.nome ?? ""} · ${p.sub}`;
    $("[data-m-desc]").textContent = p.desc;
    const specs = Object.entries(p.specs);
    $("[data-m-specs]").innerHTML = specs.length
      ? specs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")
      : `<dd class="consulta">Especificações técnicas sob consulta.</dd>`;
    botaoModal();
    if (!modal.open) modal.showModal();
    document.title = `${p.nome} · Nexbridge International`;
  }
  const botaoModal = () => {
    const b = $("[data-m-add]"), na = !!lista[modal.dataset.sku];
    b.textContent = na ? "✓ Na lista de cotação" : "+ Adicionar à cotação";
    b.classList.toggle("ok", na);
  };
  $("[data-m-add]").addEventListener("click", () => alternar(modal.dataset.sku));
  $("[data-fechar]").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
  modal.addEventListener("close", () => {
    document.title = "Nexbridge International · Catálogo de Produtos";
    if (location.hash.startsWith("#p=")) history.replaceState(null, "", location.pathname + location.search + "#produtos");
  });
  const lerHash = () => {
    const m = location.hash.match(/^#p=([\w-]+)/);
    if (m) abrirProduto(decodeURIComponent(m[1]));
  };
  window.addEventListener("hashchange", lerHash);

  // ---------- gaveta ----------
  const gaveta = $("[data-gaveta]"), veu = $("[data-veu]");
  function alternar(sku) {
    if (lista[sku]) delete lista[sku]; else lista[sku] = 1;
    salvar(); atualizarLista(); desenhar();
    if (modal.open) botaoModal();
    avisar(lista[sku] ? "Adicionado à lista de cotação" : "Removido da lista");
  }
  function atualizarLista() {
    const skus = Object.keys(lista);
    const cont = $(".contador");
    cont.hidden = !skus.length; cont.textContent = skus.length;
    $("[data-lista-vazia]").hidden = !!skus.length;
    $("[data-lista-pe]").hidden = !skus.length;
    $("[data-lista]").innerHTML = skus.map((sku) => {
      const p = porSku[sku];
      return `<li>
        ${p.foto ? `<img src="img/produtos/${p.foto}-p.webp" alt="" width="56" height="56">` : `<span class="mini"></span>`}
        <span><span class="sku">${p.sku}</span><strong>${esc(p.nome)}</strong></span>
        <span class="qtd"><input type="number" min="1" step="1" value="${lista[sku]}" data-qtd="${sku}" aria-label="Quantidade de ${esc(p.nome)}"><button type="button" data-rem="${sku}" aria-label="Remover ${esc(p.nome)}">×</button></span>
      </li>`;
    }).join("");
  }
  const abrirLista = () => { gaveta.hidden = false; veu.hidden = false; $("[data-fechar-lista]").focus(); };
  const fecharLista = () => { gaveta.hidden = true; veu.hidden = true; };
  document.querySelector("[data-abrir-lista]").addEventListener("click", abrirLista);
  $("[data-fechar-lista]").addEventListener("click", fecharLista);
  veu.addEventListener("click", fecharLista);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !gaveta.hidden) fecharLista(); });
  $("[data-lista]").addEventListener("change", (e) => {
    const i = e.target.closest("[data-qtd]");
    if (!i) return;
    lista[i.dataset.qtd] = Math.max(1, Math.round(Number(i.value) || 1));
    i.value = lista[i.dataset.qtd]; salvar();
  });
  $("[data-lista]").addEventListener("click", (e) => {
    const r = e.target.closest("[data-rem]");
    if (r) alternar(r.dataset.rem);
  });
  $("[data-limpar]").addEventListener("click", () => { lista = {}; salvar(); atualizarLista(); desenhar(); });
  $("[data-copiar]").addEventListener("click", async () => {
    const texto = "Solicitação de cotação – Nexbridge International\n\n" +
      Object.entries(lista).map(([sku, q]) => `${sku} | ${porSku[sku].nome} | Qtd: ${q}`).join("\n");
    try { await navigator.clipboard.writeText(texto); }
    catch {
      const t = document.createElement("textarea"); t.value = texto; document.body.append(t); t.select();
      document.execCommand("copy"); t.remove();
    }
    avisar("Lista copiada");
  });

  let tAviso;
  function avisar(msg) {
    const a = $("[data-aviso]");
    a.textContent = msg; a.hidden = false;
    clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true; }, 1800);
  }

  atualizarLista();
  desenhar();
  lerHash();
})();
