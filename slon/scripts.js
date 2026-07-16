/* Auto-service template behaviors. Vanilla JS, no dependencies.
   Reads page data from window.SITE_DATA (embedded by the generator). */
(function () {
  "use strict";
  var DATA = window.SITE_DATA || {};
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- form timestamp (spam time-trap) ---------- */
  var ts = document.getElementById("form_ts");
  if (ts) ts.value = Date.now();

  /* ---------- scroll reveal ---------- */
  // tag the revealable elements (no-JS browsers just see everything)
  document.querySelectorAll(".section__head, .step, .quote--sm, .gcard, .diag, .calc")
    .forEach(function (el) { el.classList.add("rv"); });
  var revealables = document.querySelectorAll(".rv");
  if (!reduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- count-up gauges (rating sweeps up like a needle) ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
    var dur = 900, t0 = null;
    function frame(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      p = 1 - Math.pow(1 - p, 3); // ease-out
      var val = (target * p).toFixed(decimals);
      el.textContent = decimals ? val : Math.round(target * p).toLocaleString("ru-RU");
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  var counters = document.querySelectorAll("[data-count]");
  if (!reduced && "IntersectionObserver" in window) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { countUp(e.target); io2.unobserve(e.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { io2.observe(el); });
  }

  /* ---------- price calculator ---------- */
  var calc = document.getElementById("calc");
  if (calc && DATA.services && DATA.services.length) {
    var state = { brand: null, service: null };
    var steps = calc.querySelectorAll(".calc__step");
    // moveFocus=true on user-initiated changes: keyboard/screen-reader users
    // land on the new step's heading instead of a hidden button
    function show(i, moveFocus) {
      steps.forEach(function (s, j) { s.classList.toggle("on", i === j); });
      var prog = calc.querySelector(".calc__prog");   // aria-live announces it
      if (prog) prog.textContent = "Шаг " + (i + 1) + " из 3";
      if (moveFocus) {
        var q = steps[i].querySelector(".calc__q");
        if (q) { q.setAttribute("tabindex", "-1"); q.focus(); }
      }
    }
    function select(box, chip) {   // pressed state on the chosen chip
      box.querySelectorAll(".chip").forEach(function (x) {
        x.classList.remove("sel"); x.setAttribute("aria-pressed", "false");
      });
      chip.classList.add("sel"); chip.setAttribute("aria-pressed", "true");
    }
    // step 1: brands
    var brandBox = calc.querySelector("[data-brands]");
    (DATA.brands || []).concat([DATA.brand_other || "Другая марка"]).forEach(function (b) {
      var c = document.createElement("button");
      c.type = "button"; c.className = "chip"; c.textContent = b;
      c.setAttribute("aria-pressed", "false");
      c.addEventListener("click", function () { state.brand = b; select(brandBox, c); show(1, true); });
      brandBox.appendChild(c);
    });
    // step 2: services
    var svcBox = calc.querySelector("[data-services]");
    DATA.services.forEach(function (s) {
      var c = document.createElement("button");
      c.type = "button"; c.className = "chip"; c.textContent = s.name;
      c.setAttribute("aria-pressed", "false");
      c.addEventListener("click", function () {
        state.service = s; select(svcBox, c);
        var res = calc.querySelector("[data-result]");
        res.querySelector(".calc__price").textContent =
          (String(s.price).match(/^от/i) ? s.price : s.price) + " ₽";
        res.querySelector("[data-svc-name]").textContent =
          s.name + (state.brand && state.brand !== "Другая марка" ? " — " + state.brand : "");
        show(2, true);
      });
      svcBox.appendChild(c);
    });
    calc.querySelectorAll(".calc__back").forEach(function (b) {
      b.addEventListener("click", function () {
        show(parseInt(b.getAttribute("data-to"), 10), true);
      });
    });
    show(0);
  }

  /* ---------- contact form ---------- */
  // With DATA.form_endpoint set, submissions go to our Telegram relay.
  // Without it (unwired demo), show the explanatory alert.
  window.demoSubmit = function (e) {
    e.preventDefault();
    var form = e.target;
    if (!DATA.form_endpoint) {
      alert("Демо: в рабочей версии заявка мгновенно уходит владельцу в Telegram.");
      return false;
    }
    var btn = form.querySelector('button[type="submit"]');
    var note = form.querySelector(".form__note");
    // salesperson attribution: the ?ref=<code> a manager appended to the link
    // they sent — travels into the Telegram notification so a converted lead
    // is credited to the right seller. The seller WANTS to keep it (it's how
    // they get paid), so it survives naturally.
    var ref = "";
    try { ref = new URLSearchParams(location.search).get("ref") || ""; } catch (x) {}
    var payload = {
      name: form.name.value, phone: form.phone.value,
      email: form.email ? form.email.value : "",
      website_url: form.website_url.value, form_ts: form.form_ts.value,
      site: DATA.site || document.title, ref: ref
    };
    btn.disabled = true; btn.textContent = "Отправляем…";
    fetch(DATA.form_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      btn.textContent = "Заявка отправлена ✓";
      if (note) note.textContent = "Получили! Перезвоним в течение 15 минут в рабочее время.";
      form.name.value = ""; form.phone.value = "";
      if (form.email) form.email.value = "";
    }).catch(function () {
      btn.disabled = false; btn.textContent = "Перезвоните мне";
      if (note) note.textContent = "Не отправилось — проверьте интернет и попробуйте ещё раз, или просто позвоните: " + (DATA.phone || "");
    });
    return false;
  };
})();
