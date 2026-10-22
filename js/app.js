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
  // ---------- PDF da cotação ----------
  let jspdfPronto;
  const carregarJsPDF = () => jspdfPronto ??= new Promise((ok, falha) => {
    const s = document.createElement("script");
    s.src = "js/vendor/jspdf.umd.min.js";
    s.onload = () => ok(window.jspdf.jsPDF);
    s.onerror = () => { jspdfPronto = null; falha(new Error("jsPDF")); };
    document.head.append(s);
  });
  // imagem -> JPEG em fundo branco (o jsPDF não lê webp); devolve null se falhar
  const paraJpeg = (src, lado) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      const s = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      ok({ dados: c.toDataURL("image/jpeg", 0.85), w: c.width, h: c.height });
    };
    img.onerror = () => ok(null);
    img.src = src;
  });
  // logo já aplicada sobre o azul do cabeçalho, em JPEG leve
  const logoNoFundo = (src, fundo, largura) => new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = largura; c.height = Math.round(largura * img.naturalHeight / img.naturalWidth);
      const g = c.getContext("2d"); g.fillStyle = fundo; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
      ok({ dados: c.toDataURL("image/jpeg", 0.9), w: c.width, h: c.height });
    };
    img.onerror = () => ok(null);
    img.src = src;
  });

  async function gerarPDF() {
    const jsPDF = await carregarJsPDF();
    const itens = Object.entries(lista).map(([sku, qtd]) => ({ p: porSku[sku], qtd }));
    const nome = $("[data-cli-nome]").value.trim(), empresa = $("[data-cli-empresa]").value.trim();
    const [logo, ...fotos] = await Promise.all([
      logoNoFundo("img/marca/nexbridge-logo-negativo-transparente.png", "rgb(18,22,64)", 480),
      ...itens.map(({ p }) => (p.foto ? paraJpeg(`img/produtos/${p.foto}-p.webp`, 240) : Promise.resolve(null))),
    ]);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210, H = 297, M = 15;
    const NAVY = [18, 22, 64], TEAL = [13, 111, 140], CINZA = [107, 112, 128], LINHA = [227, 231, 236];
    const hoje = new Date();
    const data = hoje.toLocaleDateString("pt-BR");
    const numero = `COT-${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, "0")}${String(hoje.getDate()).padStart(2, "0")}-${String(hoje.getHours()).padStart(2, "0")}${String(hoje.getMinutes()).padStart(2, "0")}`;

    const cabecalho = () => {
      doc.setFillColor(...NAVY); doc.rect(0, 0, W, 34, "F");
      doc.setFillColor(31, 166, 204); doc.rect(0, 34, W, 1.2, "F");
      if (logo) { const lh = 20, lw = lh * logo.w / logo.h; doc.addImage(logo.dados, "JPEG", M, 7, lw, lh); }
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
      doc.text("Solicitação de Cotação", W - M, 15, { align: "right" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(201, 207, 230);
      doc.text(`Nº ${numero}   ·   ${data}`, W - M, 21.5, { align: "right" });
      doc.text("mkt-siaga.github.io/nexbridge-website", W - M, 27, { align: "right" });
    };
    const rodape = (pg, total) => {
      doc.setDrawColor(...LINHA); doc.setLineWidth(0.3); doc.line(M, H - 14, W - M, H - 14);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...CINZA);
      doc.text("Imagens ilustrativas. Preços, especificações e disponibilidade serão confirmados pelo time comercial.", M, H - 9);
      doc.text(`Página ${pg} de ${total}`, W - M, H - 9, { align: "right" });
    };
    const cabTabela = (y) => {
      doc.setFillColor(244, 246, 248); doc.rect(M, y, W - 2 * M, 8, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(...CINZA);
      doc.text("ITEM", M + 3, y + 5.3); doc.text("FOTO", M + 13, y + 5.3); doc.text("CÓDIGO", M + 37, y + 5.3);
      doc.text("PRODUTO", M + 66, y + 5.3); doc.text("QTD", W - M - 3, y + 5.3, { align: "right" });
      return y + 8;
    };

    cabecalho();
    // bloco do solicitante
    let y = 45;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...TEAL);
    doc.text("SOLICITANTE", M, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...NAVY);
    doc.text(`Nome: ${nome || "—"}`, M, y + 6);
    doc.text(`Empresa: ${empresa || "—"}`, M + 90, y + 6);
    y = cabTabela(y + 13);

    const ALT = 22;
    itens.forEach(({ p, qtd }, i) => {
      if (y + ALT > H - 20) { doc.addPage(); cabecalho(); y = cabTabela(45); }
      const f = fotos[i];
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...CINZA);
      doc.text(String(i + 1).padStart(2, "0"), M + 3, y + ALT / 2 + 1.5);
      if (f) { const s = 18 / Math.max(f.w, f.h); doc.addImage(f.dados, "JPEG", M + 12 + (18 - f.w * s) / 2, y + 2 + (18 - f.h * s) / 2, f.w * s, f.h * s); }
      else { doc.setFillColor(244, 246, 248); doc.roundedRect(M + 12, y + 2, 18, 18, 2, 2, "F"); }
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...TEAL);
      doc.text(p.sku, M + 37, y + ALT / 2 + 1.5);
      doc.setTextColor(...NAVY);
      const linhas = doc.splitTextToSize(p.nome, 92).slice(0, 2);
      doc.text(linhas, M + 66, y + ALT / 2 + (linhas.length > 1 ? -1 : 1.5));
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...CINZA);
      doc.text(`${catPorSigla[p.cat]?.nome ?? ""} · ${p.sub}`, M + 66, y + ALT / 2 + (linhas.length > 1 ? 7.5 : 6));
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY);
      doc.text(String(qtd), W - M - 3, y + ALT / 2 + 1.5, { align: "right" });
      doc.setDrawColor(...LINHA); doc.setLineWidth(0.3); doc.line(M, y + ALT, W - M, y + ALT);
      y += ALT;
    });

    // totais
    if (y + 16 > H - 20) { doc.addPage(); cabecalho(); y = 45; }
    const unidades = itens.reduce((s, it) => s + Number(it.qtd), 0);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...NAVY);
    doc.text(`${itens.length} ${itens.length === 1 ? "produto" : "produtos"} · ${unidades} ${unidades === 1 ? "unidade" : "unidades"}`, W - M - 3, y + 9, { align: "right" });

    const total = doc.getNumberOfPages();
    for (let pg = 1; pg <= total; pg++) { doc.setPage(pg); rodape(pg, total); }
    doc.save(`Cotacao_Nexbridge_${numero}.pdf`);
  }

  $("[data-pdf]").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    if (!Object.keys(lista).length) return;
    b.disabled = true;
    try { await gerarPDF(); avisar("PDF da cotação gerado"); }
    catch { avisar("Não foi possível gerar o PDF. Tente novamente."); }
    finally { b.disabled = false; }
  });

  let tAviso;
  function avisar(msg) {
    const a = $("[data-aviso]");
    a.textContent = msg; a.hidden = false;
    clearTimeout(tAviso); tAviso = setTimeout(() => { a.hidden = true; }, 1800);
  }

  // ---------- carrossel de anúncios ----------
  const destaques = (window.NEXBRIDGE_DESTAQUES || []).filter((d) => porSku[d.sku]?.foto);
  const slides = $("[data-slides]"), pontos = $("[data-pontos]");
  let atual = 0, timer = null, pausado = matchMedia("(prefers-reduced-motion: reduce)").matches, sobre = false;
  slides.innerHTML = destaques.map((d, i) => {
    const p = porSku[d.sku];
    return `<a class="slide" href="#p=${p.sku}" style="--cor:${esc(d.cor || "#1fa6cc")}" role="group" aria-roledescription="anúncio" aria-label="${i + 1} de ${destaques.length}: ${esc(p.nome)}">
      <div class="wrap slide-in">
        <div class="slide-txt">
          <span class="sobre">${esc(d.selo)}</span>
          <h2>${esc(d.titulo)}</h2>
          <p>${esc(d.texto)}</p>
          <span class="btn btn-claro slide-cta">Ver produto <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span>
          <span class="slide-sku">${p.sku} · ${esc(p.nome)}</span>
        </div>
        <div class="slide-foto">
          <span class="selo-novo" aria-hidden="true">Destaque</span>
          <span class="disco"><img src="img/produtos/${p.foto}.webp" alt="${esc(p.nome)}" width="640" height="640" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></span>
        </div>
      </div>
    </a>`;
  }).join("");
  pontos.innerHTML = destaques.map((d, i) => `<button class="ponto" type="button" role="tab" data-ir="${i}" aria-label="Anúncio ${i + 1}"></button>`).join("");
  const itensSlide = [...slides.children];

  function ir(i) {
    if (!destaques.length) return;
    atual = (i + destaques.length) % destaques.length;
    slides.style.transform = `translateX(${-100 * atual}%)`;
    itensSlide.forEach((s, k) => { s.setAttribute("aria-hidden", k !== atual); s.tabIndex = k === atual ? 0 : -1; });
    [...pontos.children].forEach((b, k) => b.setAttribute("aria-selected", k === atual));
  }
  const agendar = () => {
    clearInterval(timer);
    if (!pausado && !sobre && destaques.length > 1) timer = setInterval(() => ir(atual + 1), 6000);
  };
  const botaoPausa = $("[data-pausa]");
  const mostrarPausa = () => {
    botaoPausa.setAttribute("aria-label", pausado ? "Reproduzir" : "Pausar");
    botaoPausa.innerHTML = pausado
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>';
  };
  $("[data-ant]").addEventListener("click", () => { ir(atual - 1); agendar(); });
  $("[data-prox]").addEventListener("click", () => { ir(atual + 1); agendar(); });
  botaoPausa.addEventListener("click", () => { pausado = !pausado; mostrarPausa(); agendar(); });
  pontos.addEventListener("click", (e) => { const b = e.target.closest("[data-ir]"); if (b) { ir(+b.dataset.ir); agendar(); } });
  const carrossel = $("[data-carrossel]");
  carrossel.addEventListener("mouseenter", () => { sobre = true; agendar(); });
  carrossel.addEventListener("mouseleave", () => { sobre = false; agendar(); });
  carrossel.addEventListener("focusin", () => { sobre = true; agendar(); });
  carrossel.addEventListener("focusout", () => { sobre = false; agendar(); });
  document.addEventListener("visibilitychange", () => (document.hidden ? clearInterval(timer) : agendar()));

  // arrastar no celular
  let x0 = null, arrastou = false;
  slides.addEventListener("pointerdown", (e) => { x0 = e.clientX; arrastou = false; });
  slides.addEventListener("pointerup", (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) { arrastou = true; ir(atual + (dx < 0 ? 1 : -1)); agendar(); }
  });
  slides.addEventListener("click", (e) => { if (arrastou) { e.preventDefault(); arrastou = false; } });
  slides.addEventListener("dragstart", (e) => e.preventDefault());

  ir(0); mostrarPausa(); agendar();

  atualizarLista();
  desenhar();
  lerHash();
})();
