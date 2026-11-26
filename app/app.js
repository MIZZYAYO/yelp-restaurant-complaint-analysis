/* Restaurant complaints dashboard: draws every chart as SVG from window.DASH_DATA (see build_data.py). */
(() => {
  "use strict";

  const D = window.DASH_DATA;
  const NS = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = { topic: "Rude service", place: "city" };
  const drawn = new Set();          // charts that already played their entrance animation

  // ---------- small helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const fmtInt = (n) => n.toLocaleString("en-US");
  const share = (x, d = 0) => `${(x * 100).toFixed(d)}%`;       // 0.35 -> "35%"
  const pctTxt = (x, d = 1) => `${x.toFixed(d)}%`;               // 20.65 -> "20.7%"
  const signed = (x, d = 2) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(d)}`;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const topicStat = (t) => D.topicStats.find((s) => s.topic === t);

  function svgEl(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, cls, extra = {}) {
    const t = svgEl("text", { x, y, class: cls, ...extra }, parent);
    t.textContent = str;
    return t;
  }
  const measure = (() => {
    const ctx = document.createElement("canvas").getContext("2d");
    return (str, size = 13, weight = 500) => {
      ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
      return ctx.measureText(str).width;
    };
  })();

  // Horizontal bar rounded only at its data end (the end away from the baseline)
  function barPath(x0, x1, y, h, r = 4) {
    const w = Math.abs(x1 - x0);
    r = Math.min(r, w, h / 2);
    if (x1 >= x0) return `M${x0},${y}H${x1 - r}Q${x1},${y} ${x1},${y + r}V${y + h - r}Q${x1},${y + h} ${x1 - r},${y + h}H${x0}Z`;
    return `M${x0},${y}H${x1 + r}Q${x1},${y} ${x1},${y + r}V${y + h - r}Q${x1},${y + h} ${x1 + r},${y + h}H${x0}Z`;
  }

  // Mix two hex colours: t = 0 gives a, t = 1 gives b
  function mix(a, b, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [ca, cb] = [p(a), p(b)];
    return "#" + ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }

  // ---------- tooltip (follows the cursor, flips at screen edges) ----------
  const tip = $("#tooltip");
  function showTip(html, evt) { tip.innerHTML = html; tip.hidden = false; moveTip(evt); }
  function moveTip(evt) {
    if (tip.hidden) return;
    const pad = 14, r = tip.getBoundingClientRect();
    const cx = evt.clientX ?? 0, cy = evt.clientY ?? 0;
    let x = cx + pad, y = cy + pad;
    if (x + r.width > window.innerWidth - 8) x = Math.max(8, cx - r.width - pad);
    if (y + r.height > window.innerHeight - 8) y = Math.max(8, cy - r.height - pad);
    tip.style.transform = `translate(${x}px, ${y}px)`;
  }
  function hideTip() { tip.hidden = true; }
  // Keyboard focus has no cursor: place the tooltip next to the focused element instead
  const focusEvt = (node) => { const b = node.getBoundingClientRect(); return { clientX: b.left + b.width * 0.6, clientY: b.top }; };

  // ---------- generic horizontal bar chart ----------
  // rows: [{key, label, value, color, valueText, tip, margin?}]
  function hbar(el, rows, o) {
    el.innerHTML = "";
    const W = Math.max(280, el.clientWidth);
    const rowH = o.rowH || 32, barH = o.barH || 16;
    const top = o.refValue != null ? 22 : 6, bottom = o.ticks ? 26 : 6;
    const labelW = Math.min(W * 0.42, Math.max(...rows.map((r) => measure(r.label))) + 14);
    const valueW = o.valueW ?? 58;
    const plotL = labelW, plotR = W - valueW - 8;
    const H = top + rows.length * rowH + bottom;
    const x = (v) => plotL + ((v - o.min) / (o.max - o.min)) * (plotR - plotL);
    const zero = x(Math.min(Math.max(0, o.min), o.max));
    const svg = svgEl("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.aria }, el);
    const animate = !reduceMotion && !drawn.has(el.id);

    for (const t of o.ticks || []) {
      svgEl("line", { x1: x(t), x2: x(t), y1: top - 2, y2: H - bottom + 2, class: "grid-line" }, svg);
      text(svg, x(t), H - 8, o.tickFmt(t), "tick", { "text-anchor": "middle" });
    }

    rows.forEach((r, i) => {
      const yRow = top + i * rowH, y = yRow + (rowH - barH) / 2;
      const g = svgEl("g", { class: "bar-row" + (o.onClick ? " clickable" : "") + (r.key === o.selected ? " selected" : "") }, svg);
      if (o.onClick) { g.setAttribute("tabindex", "0"); g.setAttribute("role", "button"); g.setAttribute("aria-label", `${r.label}: ${r.valueText}`); }
      svgEl("rect", { x: 0, y: yRow, width: W, height: rowH, rx: 8, class: "hit" }, g);
      text(g, labelW - 12, yRow + rowH / 2, r.label, "label", { "text-anchor": "end", "dominant-baseline": "central" });
      const bar = svgEl("path", { d: barPath(zero, x(r.value), y, barH), fill: r.color }, g);
      if (animate) {
        bar.classList.add("grow");
        bar.style.transformOrigin = r.value >= 0 ? "left center" : "right center";
        bar.style.animationDelay = `${i * 40}ms`;
      }
      if (r.margin != null) {           // margin of error whisker with small caps
        const a = x(r.value - r.margin), b = x(r.value + r.margin), cy = y + barH / 2;
        svgEl("line", { x1: a, x2: b, y1: cy, y2: cy, class: "whisker" }, g);
        svgEl("line", { x1: a, x2: a, y1: cy - 4, y2: cy + 4, class: "whisker" }, g);
        svgEl("line", { x1: b, x2: b, y1: cy - 4, y2: cy + 4, class: "whisker" }, g);
      }
      text(g, W, yRow + rowH / 2, r.valueText, "value", { "text-anchor": "end", "dominant-baseline": "central" });

      g.addEventListener("pointerenter", (e) => showTip(r.tip, e));
      g.addEventListener("pointermove", moveTip);
      g.addEventListener("pointerleave", hideTip);
      g.addEventListener("focus", () => showTip(r.tip, focusEvt(g)));
      g.addEventListener("blur", hideTip);
      if (o.onClick) {
        g.addEventListener("click", () => o.onClick(r.key));
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.onClick(r.key); } });
      }
    });

    if (o.refValue != null) {           // dashed reference line (e.g. the all-reviews average)
      const rx = x(o.refValue);
      svgEl("line", { x1: rx, x2: rx, y1: top - 4, y2: H - bottom, class: "ref-line" }, svg);
      text(svg, rx, 11, o.refLabel, "ref-text", { "text-anchor": rx > W * 0.7 ? "end" : "middle" });
    }
    drawn.add(el.id);
  }

  // ---------- generic line chart with hover crosshair ----------
  // series: [{key, points: [{x, y}], color, faded?, band?: [{x, lo, hi}]}]
  function lineChart(el, o) {
    el.innerHTML = "";
    const W = Math.max(280, el.clientWidth), H = o.height || 250;
    const m = { t: 18, r: o.right ?? 48, b: 26, l: 40 };
    const x = (v) => m.l + ((v - o.xMin) / (o.xMax - o.xMin)) * (W - m.l - m.r);
    const y = (v) => m.t + (1 - (v - o.yMin) / (o.yMax - o.yMin)) * (H - m.t - m.b);
    const svg = svgEl("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": o.aria }, el);
    const animate = !reduceMotion && !drawn.has(el.id);

    if (o.shade) {                      // grey band for 2020 (COVID)
      const [a, b] = [x(o.shade - 0.5), x(o.shade + 0.5)];
      svgEl("rect", { x: a, y: m.t, width: b - a, height: H - m.t - m.b, class: "shade" }, svg);
      text(svg, (a + b) / 2, m.t - 6, "COVID", "shade-text", { "text-anchor": "middle" });
    }
    for (const t of o.yTicks) {
      svgEl("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: "grid-line" }, svg);
      text(svg, m.l - 8, y(t), o.yFmt(t), "tick", { "text-anchor": "end", "dominant-baseline": "central" });
    }
    const step = W < 480 ? 4 : 2;       // fewer year labels on small screens
    for (let v = o.xMin; v <= o.xMax; v++) {
      // regular steps, plus the last year, skipping a step label that would collide with the last one
      const onStep = (v - o.xMin) % step === 0 && o.xMax - v >= step / 2;
      if (onStep || v === o.xMax) text(svg, x(v), H - 6, String(v), "tick", { "text-anchor": "middle" });
    }
    if (o.refValue != null) {
      svgEl("line", { x1: m.l, x2: W - m.r, y1: y(o.refValue), y2: y(o.refValue), class: "ref-line" }, svg);
      text(svg, m.l + 4, y(o.refValue) - 6, o.refLabel, "ref-text");
    }

    // Faded series first so the highlighted one sits on top
    const ordered = [...o.series].sort((a, b) => (a.faded === b.faded ? 0 : a.faded ? -1 : 1));
    for (const s of ordered) {
      if (s.band) {                     // shaded margin-of-error area
        const up = s.band.map((p, i) => `${i ? "L" : "M"}${x(p.x)},${y(p.hi)}`).join("");
        const down = [...s.band].reverse().map((p) => `L${x(p.x)},${y(p.lo)}`).join("");
        svgEl("path", { d: up + down + "Z", fill: s.color, class: "band" }, svg);
      }
      const d = s.points.map((p, i) => `${i ? "L" : "M"}${x(p.x)},${y(p.y)}`).join("");
      const path = svgEl("path", { d, class: "line" + (s.faded ? " faded" : "") }, svg);
      if (!s.faded) path.setAttribute("stroke", s.color);
      if (animate && !s.faded) {
        const len = path.getTotalLength();
        path.style.setProperty("--len", len);
        path.classList.add("draw");
      }
      if (s.endLabel) {                 // label the highlighted line at its last point
        const last = s.points[s.points.length - 1];
        text(svg, x(last.x) + 8, y(last.y), s.endLabel, "end-label", { fill: s.color, "dominant-baseline": "central" });
        svgEl("circle", { cx: x(last.x), cy: y(last.y), r: 4, fill: s.color, class: "dot" }, svg);
      }
    }

    // Hover: vertical rule + dot on the highlighted series, tooltip for the nearest year
    const main = o.series.find((s) => !s.faded);
    const rule = svgEl("line", { y1: m.t, y2: H - m.b, class: "rule", visibility: "hidden" }, svg);
    const dot = svgEl("circle", { r: 5, fill: main.color, class: "dot", visibility: "hidden" }, svg);
    const overlay = svgEl("rect", { x: m.l, y: 0, width: W - m.l - m.r, height: H, fill: "transparent" }, svg);
    const pick = (evt) => {
      const box = svg.getBoundingClientRect();
      const px = ((evt.clientX - box.left) / box.width) * W;
      const xv = Math.round(o.xMin + ((px - m.l) / (W - m.l - m.r)) * (o.xMax - o.xMin));   // nearest year
      const p = main.points.find((q) => q.x === xv);
      if (!p) return hide();
      rule.setAttribute("x1", x(p.x)); rule.setAttribute("x2", x(p.x)); rule.setAttribute("visibility", "visible");
      dot.setAttribute("cx", x(p.x)); dot.setAttribute("cy", y(p.y)); dot.setAttribute("visibility", "visible");
      showTip(o.tip(p.x), evt);
    };
    const hide = () => { rule.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); hideTip(); };
    overlay.addEventListener("pointermove", pick);
    overlay.addEventListener("pointerdown", pick);
    overlay.addEventListener("pointerleave", hide);
    drawn.add(el.id);
  }

  // ---------- data table view (toggled by each card's "Data" button) ----------
  const tables = {};
  function setTable(cardId, head, rows) { tables[cardId] = { head, rows }; refreshTable(cardId); }
  function refreshTable(cardId) {
    const wrap = document.querySelector(`#${cardId} .table-wrap`);
    if (!wrap || wrap.hidden || !tables[cardId]) return;
    const { head, rows } = tables[cardId];
    wrap.innerHTML = `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${
      rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
  document.querySelectorAll(".card").forEach((card) => {
    const btn = card.querySelector(".data-btn"), wrap = card.querySelector(".table-wrap");
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", () => {
      wrap.hidden = !wrap.hidden;
      btn.setAttribute("aria-expanded", String(!wrap.hidden));
      btn.textContent = wrap.hidden ? "Data" : "Chart only";
      refreshTable(card.id);
    });
  });

  // ---------- written answers (built from the data, so they stay right if the data changes) ----------
  const byShare = () => [...D.topicStats].sort((a, b) => b.shareNeg - a.shareNeg);
  const worstTopic = () => [...D.topicStats].sort((a, b) => a.gapFixed - b.gapFixed)[0];

  function renderText() {
    const top = byShare(), worst = worstTopic();
    const years = D.byYear.filter((r) => !r.partial && r.reviews >= 1000);
    const y0 = years[0], y1 = years[years.length - 1];
    const ty = D.topicsByYear, tFirst = ty[0], tLast = ty[ty.length - 1];
    // which complaints grew most between the first and last year
    const growth = D.topics.map((t) => ({ t, d: tLast.values[t] - tFirst.values[t] })).sort((a, b) => b.d - a.d);
    const stars = Object.fromEntries(D.stars.map((s) => [s.stars, s.pct]));

    $("#lede").innerHTML =
      `<strong>${esc(top[0].topic)}</strong> and <strong>${esc(top[1].topic.toLowerCase())}</strong> are the most common complaints. ` +
      `<strong>${esc(worst.topic)}</strong> does the most damage, costing about ${Math.abs(worst.gapFixed).toFixed(1)} stars.`;
    $("#answer-stars").innerHTML =
      `Mostly well: <strong>${Math.round(stars[5])}% give 5 stars</strong>. But about 1 in 5 reviews (<strong>${pctTxt(D.headline.pctNegative)}</strong>) are negative, and that is where the complaints are.`;
    $("#answer-rank").innerHTML =
      `<strong>${esc(top[0].topic)}</strong> and <strong>${esc(top[1].topic.toLowerCase())}</strong>. Each appears in about ${share(top[0].shareNeg)} of negative reviews, followed by ${esc(top[2].topic.toLowerCase())} (${share(top[2].shareNeg)}).`;
    $("#answer-cost").innerHTML =
      `<strong>${esc(worst.topic)}.</strong> A review that mentions it scores about <strong>${Math.abs(worst.gapFixed).toFixed(1)} stars lower</strong> than a similar review that doesn't, even though it is less common than food or waiting complaints.`;
    $("#answer-trend").innerHTML =
      `<strong>Yes, slowly.</strong> Negative reviews rose from ${Math.round(y0.pct)}% in ${y0.year} to ${Math.round(y1.pct)}% in ${y1.year}. ` +
      `Complaints about <strong>${esc(growth[0].t.toLowerCase())}</strong> and <strong>${esc(growth[1].t.toLowerCase())}</strong> grew the most.`;
    $("#answer-heat").innerHTML =
      `<strong>Yes.</strong> Burger, wings and American restaurants get the most <strong>wait</strong> complaints. Chinese restaurants get more <strong>got sick</strong> and cleanliness complaints. Steakhouses and seafood places hear more about <strong>price</strong>.`;
    $("#n-reviews").textContent = fmtInt(D.headline.reviews);
    $("#n-restaurants").textContent = fmtInt(D.headline.restaurants);
    $("#n-topic").textContent = fmtInt(D.headline.topicReviews);
    $("#generated").textContent = D.generated;
    $("#splash-sub").textContent = `Reading ${fmtInt(D.headline.reviews)} reviews from ${fmtInt(D.headline.restaurants)} restaurants…`;

    // Recommendations: most damaging, most common, common and rising
    const recs = [
      { title: "Fix staff attitude", topic: "Rude service",
        body: "The most damaging complaint, and one of the fastest growing. Friendly, attentive service protects ratings more than anything else." },
      { title: "Get the food right", topic: "Food quality",
        body: "The most common complaint in negative reviews: cold, bland or badly cooked food. It also costs close to a full star." },
      { title: "Cut the waiting", topic: "Long wait",
        body: "Almost as common as food complaints and rising, especially at burger, wings and American restaurants." },
    ];
    $("#recs").innerHTML = recs.map((r, i) => {
      const s = topicStat(r.topic), g = growth.find((x) => x.t === r.topic);
      return `<article class="rec glass"><div class="rec-num">${i + 1}</div><h3>${esc(r.title)}</h3><p>${esc(r.body)}</p>
        <p class="stat">${signed(s.gapFixed)}★ per mention · in ${share(s.shareNeg)} of negative reviews · ${g.d >= 0 ? "+" : "−"}${Math.abs(g.d * 100).toFixed(0)} pts since ${tFirst.year}</p></article>`;
    }).join("");
  }

  function renderKpis(animate) {
    const h = D.headline;
    const worst = worstTopic();
    const tiles = [
      { label: "Reviews analysed", value: h.reviews, fmt: fmtInt, sub: `from ${fmtInt(h.restaurants)} restaurants` },
      { label: "Average rating", value: h.avgStars, fmt: (v) => `${v.toFixed(2)}★`, sub: "out of 5 stars" },
      { label: "Negative reviews", value: h.pctNegative, fmt: (v) => pctTxt(v), sub: "1–2 stars · about 1 in 5" },
      { label: "Most damaging complaint", text: worst.topic, sub: `${signed(worst.gapFixed)}★ per review that mentions it`, highlight: true },
    ];
    const box = $("#kpis");
    box.innerHTML = tiles.map((t, i) => `
      <div class="kpi glass${t.highlight ? " highlight" : ""}">
        <div class="kpi-label">${esc(t.label)}</div>
        <div class="kpi-value" data-i="${i}">${t.text ? esc(t.text) : t.fmt(animate && !reduceMotion ? 0 : t.value)}</div>
        <div class="kpi-sub">${esc(t.sub)}</div>
      </div>`).join("");
    if (!animate || reduceMotion) return;
    // Count the numbers up from 0 (ease-out)
    const start = performance.now(), dur = 1100;
    const tick = (now) => {
      const k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
      tiles.forEach((t, i) => {
        if (t.text) return;
        const v = t.value * e;
        box.querySelector(`[data-i="${i}"]`).textContent = t.fmt(t.fmt === fmtInt ? Math.round(v) : v);
      });
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // The complaint chips appear on several screens; they all share one selection
  function renderChips() {
    document.querySelectorAll(".chips").forEach((box) => {
      box.innerHTML = D.topics.map((t) =>
        `<button class="chip" role="radio" aria-checked="${t === state.topic}" data-topic="${esc(t)}">${esc(t)}</button>`).join("");
      box.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => setTopic(b.dataset.topic)));
    });
  }

  function setTopic(t) {
    if (t === state.topic) return;
    state.topic = t;
    document.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.topic === t)));
    renderRank(); renderCost(); renderTopicTrend(); renderHeat();
  }

  // ---------- 0. Star ratings (vertical bars) ----------
  function renderStars() {
    const el = $("#chart-stars");
    el.innerHTML = "";
    const W = Math.max(280, el.clientWidth), H = 190, m = { t: 22, b: 26 };
    const max = Math.max(...D.stars.map((s) => s.pct));
    const slot = W / D.stars.length, barW = Math.min(64, slot * 0.56);
    const y = (v) => m.t + (1 - v / max) * (H - m.t - m.b);
    const svg = svgEl("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Bar chart: share of reviews at each star rating" }, el);
    const animate = !reduceMotion && !drawn.has(el.id);
    svgEl("line", { x1: 0, x2: W, y1: H - m.b, y2: H - m.b, class: "grid-line" }, svg);
    D.stars.forEach((s, i) => {
      const cx = slot * i + slot / 2, top = y(s.pct), r = 4, L = cx - barW / 2, R = cx + barW / 2;
      const neg = s.stars <= 2;
      // bar with only its top corners rounded (the data end)
      const d = `M${L},${H - m.b}V${top + r}Q${L},${top} ${L + r},${top}H${R - r}Q${R},${top} ${R},${top + r}V${H - m.b}Z`;
      const g = svgEl("g", {}, svg);
      svgEl("rect", { x: cx - slot / 2, y: 0, width: slot, height: H, class: "hit" }, g);   // bigger hover target
      const bar = svgEl("path", { d, fill: neg ? cssVar("--accent") : cssVar("--neutral") }, g);
      if (animate) { bar.classList.add("grow-y"); bar.style.animationDelay = `${i * 60}ms`; }
      text(g, cx, top - 7, `${Math.round(s.pct)}%`, "value", { "text-anchor": "middle" });
      text(g, cx, H - 8, `${s.stars}★`, "tick", { "text-anchor": "middle" });
      const tipHtml = `<div class="t-title">${s.stars} star${s.stars > 1 ? "s" : ""}</div><b>${pctTxt(s.pct)}</b> of all reviews${neg ? "<br>Counted as negative" : ""}`;
      g.addEventListener("pointerenter", (e) => showTip(tipHtml, e));
      g.addEventListener("pointermove", moveTip);
      g.addEventListener("pointerleave", hideTip);
    });
    drawn.add(el.id);
    setTable("card-stars", ["Stars", "% of reviews"], D.stars.map((s) => [`${s.stars}★`, pctTxt(s.pct)]));
  }

  // ---------- 1. Most common complaints ----------
  function renderRank() {
    const rows = [...D.topicStats].sort((a, b) => b.shareNeg - a.shareNeg).map((s) => ({
      key: s.topic, label: s.topic, value: s.shareNeg * 100,
      color: s.topic === state.topic ? cssVar("--accent") : cssVar("--neutral"),
      valueText: share(s.shareNeg),
      tip: `<div class="t-title">${esc(s.topic)}</div><b>${share(s.shareNeg, 1)}</b> of negative reviews<br>${share(s.sharePos, 1)} of positive reviews<br><b>${s.lift.toFixed(1)}×</b> more common when customers are unhappy`,
    }));
    hbar($("#chart-rank"), rows, {
      min: 0, max: 40, ticks: [0, 10, 20, 30, 40], tickFmt: (t) => `${t}%`,
      selected: state.topic, onClick: setTopic, aria: "Bar chart: share of negative reviews mentioning each complaint",
    });
    setTable("card-rank", ["Complaint", "% of negative", "% of positive", "× more in negative"],
      [...D.topicStats].sort((a, b) => b.shareNeg - a.shareNeg).map((s) => [s.topic, share(s.shareNeg, 1), share(s.sharePos, 1), `${s.lift.toFixed(1)}×`]));
  }

  // ---------- 2. Star cost ----------
  function renderCost() {
    const sorted = [...D.topicStats].sort((a, b) => a.gapFixed - b.gapFixed);
    const rows = sorted.map((s) => ({
      key: s.topic, label: s.topic, value: s.gapFixed,
      color: s.topic === state.topic ? cssVar("--accent") : cssVar("--neutral"),
      valueText: `${signed(s.gapFixed)}★`,
      tip: `<div class="t-title">${esc(s.topic)}</div>Mentioned in ${fmtInt(s.mentions)} reviews<br>Average <b>${s.starsWith.toFixed(2)}★</b> vs ${s.starsWithout.toFixed(2)}★ without it<br>Own effect: <b>${signed(s.gapFixed)} stars</b>${s.gapFixed > 0 ? "<br>Mostly mentioned as praise" : ""}`,
    }));
    hbar($("#chart-cost"), rows, {
      min: -1.5, max: 0.5, ticks: [-1.5, -1, -0.5, 0, 0.5], tickFmt: (t) => (t === 0 ? "0" : signed(t, 1)),
      selected: state.topic, onClick: setTopic, valueW: 62, aria: "Bar chart: star change linked to each complaint",
    });
    setTable("card-cost", ["Complaint", "Reviews", "Avg ★ with", "Avg ★ without", "Simple gap", "Own effect"],
      sorted.map((s) => [s.topic, fmtInt(s.mentions), s.starsWith.toFixed(2), s.starsWithout.toFixed(2), signed(s.gapSimple), signed(s.gapFixed)]));
  }

  // ---------- 3. Negative reviews over time ----------
  function renderTrend() {
    const years = D.byYear.filter((r) => !r.partial && r.reviews >= 1000);    // same rule as the EDA notebook
    const first = years[0], last = years[years.length - 1];
    $("#trend-title").textContent = `Negative reviews rose from ${Math.round(first.pct)}% in ${first.year} to ${Math.round(last.pct)}% in ${last.year}`;
    const color = cssVar("--accent");
    lineChart($("#chart-trend"), {
      xMin: first.year, xMax: last.year, yMin: 10, yMax: 26, yTicks: [10, 14, 18, 22, 26], yFmt: (v) => `${v}%`,
      shade: 2020, refValue: D.headline.pctNegative, refLabel: `all years ${pctTxt(D.headline.pctNegative)}`, right: 24,
      series: [{
        key: "neg", color,
        points: years.map((r) => ({ x: r.year, y: r.pct })),
        band: years.map((r) => ({ x: r.year, lo: r.pct - r.margin, hi: r.pct + r.margin })),
      }],
      tip: (yr) => { const r = years.find((q) => q.year === yr); return `<div class="t-title">${yr}</div><b>${pctTxt(r.pct)}</b> negative (±${r.margin.toFixed(1)})<br>${fmtInt(r.reviews)} reviews`; },
      aria: "Line chart: share of negative reviews by year",
    });
    setTable("card-trend", ["Year", "Reviews", "% negative", "± margin"],
      D.byYear.map((r) => [r.year + (r.partial ? " (partial)" : ""), fmtInt(r.reviews), pctTxt(r.pct), r.margin.toFixed(2)]));
  }

  // ---------- 4. Selected complaint over time ----------
  function renderTopicTrend() {
    const rows = D.topicsByYear;
    const t = state.topic, color = cssVar("--accent");
    const v0 = rows[0].values[t], v1 = rows[rows.length - 1].values[t];
    const dir = v1 - v0 > 0.01 ? "rose" : v1 - v0 < -0.01 ? "fell" : "held steady";
    $("#topic-trend-title").textContent =
      `${t} ${dir === "held steady" ? "held steady at" : dir + " from " + share(v0) + " to"} ${share(v1)} of negative reviews (${rows[0].year}–${rows[rows.length - 1].year})`;
    const max = Math.max(...rows.flatMap((r) => Object.values(r.values)));
    const yMax = Math.ceil(max * 10) / 10 * 100;
    lineChart($("#chart-topic-trend"), {
      xMin: rows[0].year, xMax: rows[rows.length - 1].year, yMin: 0, yMax,
      yTicks: Array.from({ length: Math.round(yMax / 10) + 1 }, (_, i) => i * 10), yFmt: (v) => `${v}%`,
      shade: 2020, right: 44,
      series: D.topics.map((name) => ({
        key: name, color, faded: name !== t,
        points: rows.map((r) => ({ x: r.year, y: r.values[name] * 100 })),
        endLabel: name === t ? share(v1) : null,
      })),
      tip: (yr) => {
        const r = rows.find((q) => q.year === yr);
        return `<div class="t-title">${yr}</div><b>${share(r.values[t], 1)}</b> of negative reviews mention ${esc(t.toLowerCase())}<br>${fmtInt(r.negReviews)} negative reviews that year`;
      },
      aria: `Line chart: share of negative reviews mentioning ${t} by year`,
    });
    setTable("card-topic-trend", ["Year", "Negative reviews", ...D.topics],
      rows.map((r) => [r.year, fmtInt(r.negReviews), ...D.topics.map((n) => share(r.values[n], 1))]));
  }

  // ---------- 5. Cuisine × complaint heatmap ----------
  const SHORT = { "Food quality": "Food", "Rude service": "Rude", "Long wait": "Wait", "Wrong order": "Order",
    "Price / value": "Price", "Cleanliness": "Clean", "Got sick": "Sick", "Atmosphere": "Vibe" };
  const MID = { "Food quality": "Food quality", "Rude service": "Rude service", "Long wait": "Long wait", "Wrong order": "Wrong order",
    "Price / value": "Price", "Cleanliness": "Cleanliness", "Got sick": "Got sick", "Atmosphere": "Atmosphere" };

  const CUISINE_SHORT = { "American (Traditional)": "American (Trad.)", "Breakfast & Brunch": "Breakfast" };

  function renderHeat() {
    const el = $("#chart-heat");
    el.innerHTML = "";
    const rows = D.topicsByCuisine, cols = D.topics;
    const avg = Object.fromEntries(D.topicStats.map((s) => [s.topic, s.shareNeg]));
    const diff = (r, c) => (r.values[c] - avg[c]) * 100;                     // percentage points vs. average
    const limit = Math.max(...rows.flatMap((r) => cols.map((c) => Math.abs(diff(r, c)))));
    const W = Math.max(300, el.clientWidth);
    const narrow = W < 520;
    const rowName = (n) => (narrow ? CUISINE_SHORT[n] || n : n);           // shorter cuisine names on phones
    const labelW = Math.min(W * 0.36, Math.max(...rows.map((r) => measure(rowName(r.cuisine)))) + 14);
    const cellW = (W - labelW) / cols.length, cellH = narrow ? 30 : 34;
    const names = cellW < 62 ? SHORT : MID;
    const tilt = cellW < 46;                                               // angle the headers when columns are thin
    const headH = tilt ? 52 : 34;
    const H = headH + rows.length * cellH;
    const svg = svgEl("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Heatmap: complaints by cuisine compared with the average" }, el);
    const [red, blue, mid] = [cssVar("--accent"), cssVar("--blue"), cssVar("--mid")];
    const colorFor = (v) => (v >= 0 ? mix(mid, red, Math.min(1, v / limit)) : mix(mid, blue, Math.min(1, -v / limit)));

    cols.forEach((c, j) => {
      const g = svgEl("g", { class: "clickable", tabindex: 0, role: "button", "aria-label": `Follow ${c}` }, svg);
      svgEl("rect", { x: labelW + j * cellW, y: 0, width: cellW, height: headH - 4, rx: 6, class: "hit" }, g);
      const hx = labelW + j * cellW + cellW / 2;
      const head = tilt
        ? text(g, hx - 4, headH - 8, names[c], "heat-head", { transform: `rotate(-40 ${hx - 4} ${headH - 8})` })
        : text(g, hx, headH / 2, names[c], "heat-head", { "text-anchor": "middle", "dominant-baseline": "central" });
      if (c === state.topic) { head.setAttribute("fill", cssVar("--text")); head.style.fontWeight = "800"; }
      g.addEventListener("click", () => setTopic(c));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTopic(c); } });
    });
    rows.forEach((r, i) => {
      const y = headH + i * cellH;
      text(svg, labelW - 10, y + cellH / 2, rowName(r.cuisine), "label", { "text-anchor": "end", "dominant-baseline": "central" });
      cols.forEach((c, j) => {
        const v = diff(r, c), fill = colorFor(v);
        const cell = svgEl("rect", { x: labelW + j * cellW, y, width: cellW, height: cellH, rx: 5, fill, class: "heat-cell clickable" }, svg);
        const strong = Math.abs(v) / limit > 0.55;                            // white text on the darkest cells
        text(svg, labelW + j * cellW + cellW / 2, y + cellH / 2, Math.abs(v) < 0.5 ? "0" : signed(v, 0), "heat-text",
          { "text-anchor": "middle", "dominant-baseline": "central", fill: strong ? "#fff" : cssVar("--text") });
        const tipHtml = `<div class="t-title">${esc(r.cuisine)} · ${esc(c)}</div><b>${share(r.values[c], 1)}</b> of negative reviews<br>All restaurants: ${share(avg[c], 1)}<br><b>${signed(v, 1)} points</b> vs. average`;
        cell.addEventListener("pointerenter", (e) => showTip(tipHtml, e));
        cell.addEventListener("pointermove", moveTip);
        cell.addEventListener("pointerleave", hideTip);
        cell.addEventListener("click", () => setTopic(c));
      });
    });
    const sel = cols.indexOf(state.topic);    // outline the followed complaint's column
    svgEl("rect", { x: labelW + sel * cellW + 1, y: headH - 1, width: cellW - 2, height: rows.length * cellH + 2, rx: 6, class: "heat-col-sel" }, svg);

    $("#heat-legend").innerHTML =
      `<span>Less common</span><span class="bar" style="background:linear-gradient(90deg, ${blue}, ${mid}, ${red})"></span><span>More common than average</span>` +
      `<span class="note" style="margin-left:auto">Numbers are percentage points, e.g. +6 = 6 points above average</span>`;
    setTable("card-heat", ["Cuisine", "Negative reviews", ...cols],
      rows.map((r) => [r.cuisine, fmtInt(r.negReviews), ...cols.map((c) => share(r.values[c], 1))]));
  }

  // ---------- 6. Cities / states / cuisines ----------
  function renderPlaces() {
    const src = { city: D.byCity, state: D.byState, cuisine: D.byCuisine }[state.place];
    const base = D.headline.pctNegative;
    const [red, blue, neutral] = [cssVar("--accent"), cssVar("--blue"), cssVar("--neutral")];
    const colorFor = (r) => (r.pct - r.margin > base ? red : r.pct + r.margin < base ? blue : neutral);   // coloured only when the whole whisker is on one side
    const rows = [...src].sort((a, b) => b.pct - a.pct).map((r) => ({
      key: r.name, label: r.name, value: r.pct, margin: r.margin, color: colorFor(r), valueText: pctTxt(r.pct),
      tip: `<div class="t-title">${esc(r.name)}</div><b>${pctTxt(r.pct)}</b> negative (±${r.margin.toFixed(1)})<br>${fmtInt(r.reviews)} reviews · ${fmtInt(r.restaurants)} restaurants`,
    }));
    const max = Math.ceil(Math.max(...src.map((r) => r.pct + r.margin)) / 5) * 5;
    hbar($("#chart-places"), rows, {
      min: 0, max, ticks: Array.from({ length: max / 10 + 1 }, (_, i) => i * 10).filter((t) => t <= max), tickFmt: (t) => `${t}%`,
      rowH: src.length > 20 ? 26 : 30, barH: src.length > 20 ? 14 : 16,
      refValue: base, refLabel: `average ${pctTxt(base)}`, aria: `Bar chart: share of negative reviews by ${state.place}`,
    });
    // Written answer for the chosen tab
    const sorted = [...src].sort((a, b) => b.pct - a.pct), hi = sorted[0], lo = sorted[sorted.length - 1];
    const group = { city: "the biggest cities", state: "the states", cuisine: "the biggest cuisines" }[state.place];
    $("#answer-places").innerHTML =
      `Among ${group}, <strong>${esc(hi.name)}</strong> has the highest share of negative reviews (<strong>${pctTxt(hi.pct)}</strong>) and <strong>${esc(lo.name)}</strong> the lowest (${pctTxt(lo.pct)}). The average is ${pctTxt(base)}.`;
    $("#places-legend").innerHTML =
      `<span><i style="background:${red}"></i>Clearly above average</span><span><i style="background:${blue}"></i>Clearly below</span><span><i style="background:${neutral}"></i>Can't tell from average</span>`;
    setTable("card-places", [{ city: "City", state: "State", cuisine: "Cuisine" }[state.place], "Reviews", "Restaurants", "% negative", "± margin"],
      [...src].sort((a, b) => b.pct - a.pct).map((r) => [r.name, fmtInt(r.reviews), fmtInt(r.restaurants), pctTxt(r.pct), r.margin.toFixed(2)]));
  }
  document.querySelectorAll("#place-tabs [role=tab]").forEach((tab) => tab.addEventListener("click", () => {
    state.place = tab.dataset.place;
    document.querySelectorAll("#place-tabs [role=tab]").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    drawn.delete("chart-places");             // replay the bar animation for the new list
    renderPlaces();
  }));

  // ---------- theme toggle (remembered per browser when storage is available) ----------
  const root = document.documentElement;
  try { const saved = localStorage.getItem("theme"); if (saved) root.dataset.theme = saved; } catch (e) { /* storage blocked: follow the OS */ }
  $("#themeBtn").addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) { /* ignore */ }
    renderCharts();
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (!root.dataset.theme) renderCharts(); });

  function renderCharts() { renderStars(); renderRank(); renderCost(); renderTrend(); renderTopicTrend(); renderHeat(); renderPlaces(); }

  // ---------- sliding screens ----------
  const slides = [...document.querySelectorAll(".slide")];
  const track = $("#track");
  const slideCharts = { 0: [renderStars], 1: [renderRank], 2: [renderCost], 3: [renderTrend, renderTopicTrend], 4: [renderHeat], 5: [renderPlaces] };
  const visited = new Set();
  let current = -1;

  // Step buttons in the top bar, dots in the pager
  $("#steps").innerHTML = slides.map((s, i) => {
    const tag = i === 0 ? "★" : i === slides.length - 1 ? "✓" : `Q${i}`;
    return `<button class="step" type="button" data-i="${i}" aria-label="${esc(s.dataset.title)}"><b>${tag}</b><span>${esc(s.dataset.title)}</span></button>`;
  }).join("");
  $("#dots").innerHTML = slides.map(() => "<i></i>").join("");
  const steps = [...document.querySelectorAll(".step")];
  steps.forEach((b) => b.addEventListener("click", () => goTo(+b.dataset.i)));

  function goTo(i, fromHash) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === current) return;
    current = i;
    track.style.transform = `translateX(${-i * 100}%)`;            // slide the whole row of screens sideways
    slides.forEach((s, k) => {
      s.classList.toggle("active", k === i);
      s.toggleAttribute("inert", k !== i);                         // keyboard focus stays on the visible screen
    });
    slides[i].scrollTop = 0;
    steps.forEach((b, k) => (k === i ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
    steps[i].scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
    document.querySelectorAll("#dots i").forEach((d, k) => d.classList.toggle("on", k === i));
    $("#progress-bar").style.transform = `scaleX(${(i + 1) / slides.length})`;
    $("#prev").disabled = i === 0;
    $("#next-label").textContent = i === 0 ? "Start" : i === slides.length - 1 ? "Start again" : "Next";
    hideTip();
    if (!fromHash) history.replaceState(null, "", i ? `#${i}` : location.pathname + location.search);   // shareable link to each screen
    // First visit to a screen: redraw its charts so the bars grow in as it arrives
    if (!visited.has(i)) {
      visited.add(i);
      slides[i].querySelectorAll(".chart").forEach((c) => drawn.delete(c.id));
      setTimeout(() => (slideCharts[i] || []).forEach((f) => f()), reduceMotion ? 0 : 300);
    }
  }
  const next = () => (current === slides.length - 1 ? goTo(0) : goTo(current + 1));
  const prev = () => goTo(current - 1);
  $("#next").addEventListener("click", next);
  $("#prev").addEventListener("click", prev);
  $("#restart").addEventListener("click", () => goTo(0));

  // Keyboard: left / right arrow keys
  document.addEventListener("keydown", (e) => {
    if (!opened || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  });

  // Touch: swipe left / right. Ignored when the finger moves mostly up/down (that's scrolling)
  let sx = null, sy = null;
  const viewport = $("#viewport");
  viewport.addEventListener("touchstart", (e) => {
    if (e.target.closest(".chips, .table-wrap")) { sx = null; return; }   // these scroll sideways on their own
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  viewport.addEventListener("touchend", (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
    sx = null;
  }, { passive: true });
  window.addEventListener("hashchange", () => goTo(parseInt(location.hash.slice(1), 10) || 0, true));

  // ---------- start-up: opening screen, then the app ----------
  renderText();
  renderChips();
  renderKpis(false);

  let lastW = window.innerWidth, timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; renderCharts(); } }, 150);
  });

  const splash = $("#splash");
  const shownAt = performance.now();
  // Labels are measured in the real font, so wait for it (but never more than 2.5 s)
  const fontsReady = document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]) : Promise.resolve();
  let opened = false;
  function openApp() {
    if (opened) return;
    opened = true;
    splash.classList.add("done");
    setTimeout(() => splash.remove(), 800);
    const startAt = parseInt(location.hash.slice(1), 10) || 0;     // a shared link can open on any screen
    goTo(startAt, true);
    if (startAt === 0) renderKpis(true);
  }
  fontsReady.then(() => {
    renderCharts();
    const wait = Math.max(0, (reduceMotion ? 300 : 2200) - (performance.now() - shownAt));   // let the intro play once
    setTimeout(openApp, wait);
  });
  $("#splash-skip").addEventListener("click", () => fontsReady.then(openApp));
})();
