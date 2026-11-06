/* ---------- le défi : sept tickets ---------- */
(function () {
  const L = (o) => (LANG === "en" && o.en !== undefined ? o.en : o.fr);
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const game = document.getElementById("game"),
    body = document.getElementById("gBody"),
    gId = document.getElementById("gId"),
    gTime = document.getElementById("gTime"),
    gScore = document.getElementById("gScore"),
    gHint = document.getElementById("gHint"),
    gQuit = document.getElementById("gQuit");
  const T = [
    { lv: { fr: "01 · Facile", en: "01 · Easy" }, tt: { fr: "La bibliothèque a disparu", en: "The library vanished" }, tag: "SharePoint" },
    { lv: { fr: "02 · Facile", en: "02 · Easy" }, tt: { fr: "Le site est injoignable", en: "The site is unreachable" }, tag: "DNS" },
    { lv: { fr: "03 · Moyen", en: "03 · Medium" }, tt: { fr: "La facture sort sans TVA", en: "The invoice has no VAT" }, tag: "Odoo" },
    {
      lv: { fr: "04 · Moyen", en: "04 · Medium" },
      tt: { fr: "Le flux n'envoie plus rien", en: "The flow sends nothing" },
      tag: "Power Automate",
    },
    {
      lv: { fr: "05 · Difficile", en: "05 · Hard" },
      tt: { fr: "Des doublons dans le rapport", en: "Duplicates in the report" },
      tag: "SQL",
    },
    {
      lv: { fr: "06 · Expert", en: "06 · Expert" },
      tt: { fr: "Panne générale à 8 h 02", en: "General outage at 8:02" },
      tag: "Diagnostic",
    },
    { lv: { fr: "07 · Expert", en: "07 · Expert" }, tt: { fr: "Le script de relance", en: "The reminder script" }, tag: "Python" },
  ];
  const tickets = document.getElementById("tickets");
  T.forEach((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ticket";
    b.innerHTML = '<span class="lv"></span><span class="tt"></span>';
    b.onclick = () => start(i);
    tickets.appendChild(b);
  });
  function paintTickets() {
    tickets.querySelectorAll(".ticket").forEach((b, i) => {
      b.querySelector(".lv").textContent = L(T[i].lv) + " · " + T[i].tag;
      b.querySelector(".tt").textContent = L(T[i].tt);
      b.classList.toggle("done", !!done[i]);
    });
  }
  let done = {};
  try {
    done = JSON.parse(localStorage.getItem("defiDone") || "{}");
  } catch (e) {}

  /* hall of fame local */
  const hallList = document.getElementById("hallList"),
    hallEmpty = document.getElementById("hallEmpty");
  function loadHall() {
    try {
      return JSON.parse(localStorage.getItem("defiHall") || "[]");
    } catch (e) {
      return [];
    }
  }
  function paintHall() {
    const h = loadHall()
      .map((e) => (e.sus && e.score > 1150 ? Object.assign({}, e, { score: 1150 }) : e))
      .sort((a, b) => b.score - a.score || a.time - b.time)
      .slice(0, 5);
    hallList.innerHTML = h
      .map(
        (e, i) =>
          '<li><span class="rk">' +
          (i < 3 ? ["🥇", "🥈", "🥉"][i] : "#" + (i + 1)) +
          "</span><span>" +
          esc(e.name) +
          '</span><span class="tm">' +
          fmtT(e.time) +
          '</span><span class="sc">' +
          e.score +
          (e.sus ? '<span class="sus">' + L({ fr: "à vérifier", en: "to check" }) + "</span>" : "") +
          "</span></li>",
      )
      .join("");
    hallEmpty.style.display = h.length ? "none" : "block";
  }
  const fmtT = (ms) => {
    const s = Math.round(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };
  paintTickets();
  paintHall();
  document.addEventListener("langchange", () => {
    paintTickets();
    if (game.open && cur >= 0) render();
  });

  /* moteur */
  let cur = -1,
    score = 0,
    tScore = 200,
    t0 = 0,
    timer = null,
    totalTime = 0,
    runAll = false,
    hintUsed = false,
    state = {};
  const MIN_MS = [12000, 12000, 18000, 20000, 30000, 30000, 45000];
  const rnd = (n) => Math.floor(Math.random() * n),
    pick = (a) => a[rnd(a.length)],
    shuffle = (a) => {
      const b = a.slice();
      for (let i = b.length - 1; i > 0; i--) {
        const j = rnd(i + 1);
        [b[i], b[j]] = [b[j], b[i]];
      }
      return b;
    };
  /* trop tôt pour valider : un vrai diagnostic prend du temps */
  function tooEarly() {
    const el = performance.now() - t0;
    if (el < MIN_MS[cur]) {
      say(
        L({
          fr: "Trop rapide pour un vrai diagnostic. Relisez le ticket, encore " + Math.ceil((MIN_MS[cur] - el) / 1000) + " s.",
          en: "Too fast for a real diagnosis. Re-read the ticket, " + Math.ceil((MIN_MS[cur] - el) / 1000) + " s to go.",
        }),
        "bad",
      );
      return true;
    }
    return false;
  }
  /* copier, couper, coller et menu contextuel bloqués dans le jeu */
  ["copy", "cut", "paste", "contextmenu", "dragstart"].forEach((ev) =>
    game.addEventListener(ev, (e) => {
      e.preventDefault();
      if (ev === "paste")
        say(L({ fr: "Le collage est désactivé : saisissez la réponse au clavier.", en: "Pasting is disabled: type the answer." }), "bad");
    }),
  );
  game.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["c", "x", "v", "a", "p", "s", "u"].includes(e.key.toLowerCase())) e.preventDefault();
  });
  const pen = (n, msg) => {
    tScore = Math.max(0, tScore - n);
    paintScore();
    say(msg, "bad");
  };
  const paintScore = () => {
    gScore.textContent = score + tScore;
  };
  const say = (m, cls) => {
    const el = body.querySelector(".g-msg");
    if (el) {
      el.textContent = m;
      el.className = "g-msg " + (cls || "");
    }
  };
  function tick() {
    gTime.textContent = fmtT(totalTime + (performance.now() - t0));
  }
  function start(i) {
    runAll = i === "all";
    if (runAll) i = 0;
    cur = i;
    score = 0;
    totalTime = 0;
    openTicket();
    if (typeof game.showModal === "function") {
      if (!game.open) game.showModal();
    } else game.setAttribute("open", "");
  }
  function openTicket() {
    tScore = 200;
    hintUsed = false;
    state = {};
    t0 = performance.now();
    clearInterval(timer);
    timer = setInterval(tick, 250);
    gHint.disabled = false;
    render();
    paintScore();
  }
  function render() {
    gId.textContent = (LANG === "en" ? "Ticket " : "Ticket ") + String(cur + 1).padStart(2, "0") + " / 07";
    body.innerHTML = "";
    P[cur].render();
  }
  function head(t, task) {
    return (
      '<div class="g-ticket"><span class="lab">' +
      esc(L(T[cur].lv)) +
      " · " +
      esc(T[cur].tag) +
      "</span><h4>" +
      esc(L(T[cur].tt)) +
      "</h4><p>" +
      esc(L(t)) +
      '</p></div><p class="g-task">' +
      esc(L(task)) +
      "</p>"
    );
  }
  function guard(fn) {
    return () => {
      if (tooEarly()) return;
      fn();
    };
  }
  function foot(validateLabel) {
    return (
      '<div class="g-foot"><span class="g-msg"></span><button type="button" class="g-btn pri" id="gOk">' +
      esc(L(validateLabel || { fr: "Valider", en: "Check" })) +
      "</button></div>"
    );
  }
  function solved(extra) {
    clearInterval(timer);
    totalTime += performance.now() - t0;
    score += tScore;
    tScore = 0;
    paintScore();
    done[cur] = true;
    try {
      localStorage.setItem("defiDone", JSON.stringify(done));
    } catch (e) {}
    paintTickets();
    const msg = L({ fr: "Ticket résolu. ", en: "Ticket solved. " }) + L(extra);
    if (false) {
    }
    body.innerHTML =
      '<div class="g-result"><div class="big">+' +
      score +
      '</div><p class="sub">' +
      esc(msg) +
      '</p><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">' +
      (cur < 6
        ? '<button type="button" class="g-btn pri" id="gNext">' + esc(L({ fr: "Ticket suivant", en: "Next ticket" })) + "</button>"
        : '<button type="button" class="g-btn pri" id="gEnd">' + esc(L({ fr: "Voir mon score", en: "See my score" })) + "</button>") +
      '<button type="button" class="g-btn" id="gClose">' +
      esc(L({ fr: "Fermer", en: "Close" })) +
      "</button></div></div>";
    const nx = document.getElementById("gNext");
    if (nx)
      nx.onclick = () => {
        cur++;
        openTicket();
      };
    const en = document.getElementById("gEnd");
    if (en) en.onclick = finish;
    document.getElementById("gClose").onclick = close;
  }
  function finish() {
    body.innerHTML =
      '<div class="g-result"><div class="big">' +
      score +
      ' / 1400</div><p class="sub">' +
      esc(L({ fr: "Temps total", en: "Total time" })) +
      " " +
      fmtT(totalTime) +
      " · " +
      esc(
        score > 1150
          ? L({ fr: "Vous avez battu le développeur.", en: "You beat the developer." })
          : L({ fr: "Le développeur garde la main, pour l'instant.", en: "The developer keeps the lead, for now." }),
      ) +
      '</p><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center"><input class="g-input" id="gName" maxlength="18" placeholder="' +
      esc(L({ fr: "Votre pseudo", en: "Your nickname" })) +
      '"><button type="button" class="g-btn pri" id="gSave">' +
      esc(L({ fr: "Enregistrer", en: "Save" })) +
      '</button><button type="button" class="g-btn" id="gClose">' +
      esc(L({ fr: "Fermer", en: "Close" })) +
      "</button></div></div>";
    document.getElementById("gSave").onclick = () => {
      const n = document.getElementById("gName").value.trim() || L({ fr: "Anonyme", en: "Anonymous" });
      const h = loadHall();
      h.push({ name: n, score, time: Math.round(totalTime), d: Date.now(), sus: totalTime < 75000 });
      try {
        localStorage.setItem("defiHall", JSON.stringify(h));
      } catch (e) {}
      paintHall();
      close();
      document.getElementById("defi").scrollIntoView({ behavior: "smooth" });
    };
    document.getElementById("gClose").onclick = close;
  }
  function close() {
    clearInterval(timer);
    if (game.open) game.close();
    else game.removeAttribute("open");
    cur = -1;
  }
  gQuit.onclick = close;
  game.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  gHint.onclick = () => {
    if (hintUsed || cur < 0) return;
    hintUsed = true;
    gHint.disabled = true;
    tScore = Math.max(0, tScore - 50);
    paintScore();
    say(L(P[cur].hint), "");
  };
  document.getElementById("defiStart").onclick = () => start("all");

  /* ---------- les sept énigmes ---------- */
  const P = [];

  /* 01 · SharePoint : permissions */
  P[0] = {
    hint: {
      fr: "Regardez dans quel groupe se trouve réellement la personne du ticket, et ce que ce groupe peut voir.",
      en: "Check which group the person in the ticket is actually in, and what that group can see.",
    },
    render() {
      const who = state.who || (state.who = pick(["Aminata", "Rasmata", "Koudbi", "Zalissa", "Inoussa"])),
        wrongG = state.wrongG === undefined ? (state.wrongG = pick([2, 3])) : state.wrongG;
      const libs = ["Contrats", "Factures", "Procédures", "Communication"],
        groups = [
          { n: "Direction financière", p: ["w", "w", "r", "r"], m: ["Boukary", "Salimata", "Issa"] },
          { n: "Comptabilité", p: ["r", "w", "r", "r"], m: ["Mariam", "Oumar"] },
          { n: "RH", p: ["x", "x", "w", "r"], m: ["Fatou", "Hamidou"] },
          { n: "Visiteurs", p: ["x", "x", "r", "r"], m: ["Stagiaire", "Prestataire"] },
          { n: "Propriétaires", p: ["w", "w", "w", "w"], m: ["Daouda"] },
        ];
      groups[wrongG].m.splice(1, 0, who);
      body.innerHTML =
        head(
          {
            fr:
              "« Depuis ce matin, " +
              who +
              ", de la Direction financière, ne voit plus la bibliothèque Contrats sur l'intranet. Ses collègues la voient toujours. »",
            en:
              "“Since this morning " +
              who +
              ", from the Finance department, can no longer see the Contracts library on the intranet. Her colleagues still can.”",
          },
          {
            fr: "Trouvez la cause dans les groupes, cliquez sur la personne concernée, puis choisissez le bon groupe de destination.",
            en: "Find the cause in the groups, click the person concerned, then pick the right destination group.",
          },
        ) +
        '<div class="g-area"><div class="g-cols"><div><table class="g-table"><thead><tr><th>' +
        L({ fr: "Groupe", en: "Group" }) +
        "</th>" +
        libs.map((l) => "<th>" + l + "</th>").join("") +
        "</tr></thead><tbody>" +
        groups
          .map(
            (g) =>
              "<tr><td>" +
              g.n +
              "</td>" +
              g.p
                .map(
                  (p) =>
                    '<td><span class="perm ' +
                    p +
                    '" data-perm>' +
                    { r: L({ fr: "lecture", en: "read" }), w: L({ fr: "modif.", en: "edit" }), x: L({ fr: "aucun", en: "none" }) }[p] +
                    "</span></td>",
                )
                .join("") +
              "</tr>",
          )
          .join("") +
        "</tbody></table></div><div>" +
        groups
          .map(
            (g, gi) =>
              '<div class="g-group"><h5>' +
              g.n +
              " · " +
              g.m.length +
              "</h5>" +
              g.m.map((m) => '<span class="chip" data-m="' + m + '" data-g="' + gi + '">' + m + "</span>").join("") +
              "</div>",
          )
          .join("") +
        "</div></div>" +
        '<div style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="g-small">' +
        L({ fr: "Déplacer la personne sélectionnée vers :", en: "Move the selected person to:" }) +
        '</span><select class="g-select" id="gTarget"><option value="">—</option>' +
        groups.map((g, gi) => '<option value="' + gi + '">' + g.n + "</option>").join("") +
        "</select></div></div>" +
        foot();
      body
        .querySelectorAll("[data-perm]")
        .forEach((el) =>
          el.addEventListener("click", () =>
            pen(
              25,
              L({
                fr: "Les droits des groupes sont corrects. Le problème est ailleurs.",
                en: "Group permissions are correct. The problem is elsewhere.",
              }),
            ),
          ),
        );
      body.querySelectorAll(".chip").forEach((c) =>
        c.addEventListener("click", () => {
          body.querySelectorAll(".chip").forEach((x) => x.classList.remove("sel"));
          c.classList.add("sel");
          state.m = c.dataset.m;
          if (c.dataset.m !== who)
            pen(25, L({ fr: "Cette personne n'est pas concernée par le ticket.", en: "This person is not the one in the ticket." }));
          else
            say(
              L({
                fr: who + " est dans le groupe " + groups[wrongG].n + ", qui n'a aucun accès à Contrats.",
                en: who + " is in the " + groups[wrongG].n + " group, which has no access to Contracts.",
              }),
              "ok",
            );
        }),
      );
      document.getElementById("gOk").onclick = guard(() => {
        const tgt = document.getElementById("gTarget").value;
        if (state.m !== who) return pen(25, L({ fr: "Sélectionnez d'abord la bonne personne.", en: "Select the right person first." }));
        if (tgt === "0")
          solved({
            fr: who + " retrouve la Direction financière et la bibliothèque Contrats.",
            en: who + " is back in Finance and can see the Contracts library.",
          });
        else if (tgt === "4")
          pen(
            50,
            L({
              fr: "Propriétaires lui donnerait tous les droits sur le site : trop large.",
              en: "Owners would give her full control of the site: too much.",
            }),
          );
        else pen(25, L({ fr: "Ce groupe ne correspond pas à son service.", en: "That group does not match her department." }));
      });
    },
  };

  /* 02 · DNS */
  P[1] = {
    hint: {
      fr: "Le ping donne la vraie adresse du serveur web. Comparez-la à l'enregistrement A de www.",
      en: "The ping shows the web server's real address. Compare it with the A record for www.",
    },
    render() {
      const ip = state.ip || (state.ip = pick(["41.207.188.10", "41.207.191.34", "154.68.12.77", "41.207.176.58"])),
        old = state.old || (state.old = pick(["41.207.160.42", "154.68.3.9", "41.207.133.200"]));
      let rows = [
        ["@", "A", ip],
        ["www", "A", old],
        ["www", "AAAA", "2c0f:f698:c::10"],
        ["mail", "A", ip.replace(/\d+$/, "25")],
        ["@", "MX 10", "mail.exemple.bf."],
        ["@", "TXT", "v=spf1 mx -all"],
        ["@", "NS", "ns1.ikadns.bf."],
        ["@", "NS", "ns2.ikadns.bf."],
      ];
      if (!state.perm) state.perm = shuffle(rows.map((_, i) => i));
      rows = state.perm.map((i) => rows[i]);
      const bad = rows.findIndex((r) => r[0] === "www" && r[1] === "A");
      body.innerHTML =
        head(
          {
            fr: "« Le site www.exemple.bf ne répond plus depuis le renouvellement du domaine hier. Le serveur web, lui, fonctionne. »",
            en: "“www.exemple.bf has not responded since yesterday's domain renewal. The web server itself is up.”",
          },
          {
            fr: "Cliquez sur l'enregistrement fautif, puis saisissez la valeur correcte.",
            en: "Click the faulty record, then type the correct value.",
          },
        ) +
        '<div class="g-area"><div class="g-cols"><div><table class="g-table"><thead><tr><th>' +
        L({ fr: "Nom", en: "Name" }) +
        "</th><th>Type</th><th>" +
        L({ fr: "Valeur", en: "Value" }) +
        "</th></tr></thead><tbody>" +
        rows
          .map(
            (r, i) =>
              '<tr class="pick" data-i="' + i + '"><td>' + r[0] + "</td><td>" + r[1] + '</td><td class="mono-box">' + r[2] + "</td></tr>",
          )
          .join("") +
        '</tbody></table></div><div class="mono-box" style="color:var(--dark-ink-2)">$ ping web01.ikahost.bf<br>PING web01.ikahost.bf (' +
        ip +
        "): 56 data bytes<br>64 bytes from " +
        ip +
        ": icmp_seq=0 ttl=57 time=14.2 ms<br>64 bytes from " +
        ip +
        ': icmp_seq=1 ttl=57 time=13.9 ms<br><br>$ curl -I https://www.exemple.bf<br>curl: (28) Connection timed out</div></div><div style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="g-small">' +
        L({ fr: "Nouvelle valeur :", en: "New value:" }) +
        '</span><input class="g-input" id="gVal" placeholder="…"></div></div>' +
        foot();
      body.querySelectorAll("tr.pick").forEach((tr) =>
        tr.addEventListener("click", () => {
          body.querySelectorAll("tr.pick").forEach((x) => x.classList.remove("sel"));
          tr.classList.add("sel");
          state.i = +tr.dataset.i;
          if (state.i !== bad) pen(25, L({ fr: "Cet enregistrement est correct.", en: "This record is correct." }));
          else
            say(
              L({
                fr: "L'enregistrement A de www pointe vers une ancienne adresse.",
                en: "The A record for www points to an old address.",
              }),
              "ok",
            );
        }),
      );
      document.getElementById("gOk").onclick = guard(() => {
        const v = document.getElementById("gVal").value.trim();
        if (state.i !== bad)
          return pen(25, L({ fr: "Sélectionnez d'abord l'enregistrement fautif.", en: "Select the faulty record first." }));
        if (v === ip)
          solved({
            fr: "www pointe à nouveau vers le serveur, le site répond après propagation.",
            en: "www points to the server again, the site answers after propagation.",
          });
        else
          pen(
            25,
            L({
              fr: "Ce n'est pas l'adresse du serveur web. Relisez le ping.",
              en: "That is not the web server's address. Re-read the ping.",
            }),
          );
      });
    },
  };

  /* 03 · Odoo Python */
  P[2] = {
    hint: {
      fr: "Un taux de 18 doit devenir un facteur 1,18. Cherchez la multiplication.",
      en: "A rate of 18 must become a 1.18 factor. Look at the multiplication.",
    },
    render() {
      const code = [
        "class AccountMove(models.Model):",
        "    _inherit = 'account.move'",
        "",
        "    x_rccm = fields.Char(related='company_id.x_rccm')",
        "    amount_total_custom = fields.Monetary(compute='_compute_amount_custom')",
        "",
        "    @api.depends('invoice_line_ids.price_subtotal')",
        "    def _compute_amount_custom(self):",
        "        for move in self:",
        "            subtotal = sum(move.invoice_line_ids.mapped('price_subtotal'))",
        "            tax_rate = move.company_id.x_default_tax_rate or 18",
        "            move.amount_total_custom = subtotal * (tax_rate / 100)",
      ];
      const opts = [
        "move.amount_total_custom = subtotal * (1 + tax_rate / 100)",
        "move.amount_total_custom = subtotal + tax_rate",
        "move.amount_total_custom = subtotal * tax_rate",
      ];
      body.innerHTML =
        head(
          {
            fr: "« Depuis la mise à jour du module, les factures d'un client affichent un montant TTC égal à 18 % du montant HT au lieu du total. »",
            en: "“Since the module update, a client's invoices show a total equal to 18% of the subtotal instead of the full amount.”",
          },
          { fr: "Cliquez sur la ligne fautive, puis choisissez la correction.", en: "Click the faulty line, then choose the fix." },
        ) +
        '<div class="g-area"><div class="mono-box">' +
        code.map((l, i) => '<div class="ln" data-i="' + i + '"><i>' + (i + 1) + "</i><span>" + esc(l) + "</span></div>").join("") +
        '</div><div class="g-opts" id="gOpts" hidden>' +
        opts.map((o, i) => '<button type="button" class="g-opt" data-o="' + i + '">' + esc(o) + "</button>").join("") +
        "</div></div>" +
        foot();
      body.querySelectorAll(".ln").forEach((l) =>
        l.addEventListener("click", () => {
          body.querySelectorAll(".ln").forEach((x) => x.classList.remove("sel"));
          l.classList.add("sel");
          state.i = +l.dataset.i;
          if (state.i !== 11) pen(25, L({ fr: "Cette ligne est correcte.", en: "This line is correct." }));
          else {
            say(
              L({
                fr: "Le total est multiplié par le taux seul : 18 % du HT.",
                en: "The total is multiplied by the rate alone: 18% of the subtotal.",
              }),
              "ok",
            );
            document.getElementById("gOpts").hidden = false;
          }
        }),
      );
      body.querySelectorAll(".g-opt").forEach((o) =>
        o.addEventListener("click", () => {
          body.querySelectorAll(".g-opt").forEach((x) => x.classList.remove("sel"));
          o.classList.add("sel");
          state.o = +o.dataset.o;
        }),
      );
      document.getElementById("gOk").onclick = guard(() => {
        if (state.i !== 11) return pen(25, L({ fr: "Trouvez d'abord la ligne fautive.", en: "Find the faulty line first." }));
        if (state.o === 0)
          solved({
            fr: "HT × 1,18 : le TTC est de retour sur la facture PDF.",
            en: "Subtotal × 1.18: the total is back on the PDF invoice.",
          });
        else if (state.o === undefined) pen(0, L({ fr: "Choisissez une correction.", en: "Pick a fix." }));
        else pen(25, L({ fr: "Cette correction donne encore un mauvais total.", en: "That fix still gives a wrong total." }));
      });
    },
  };

  /* 04 · Power Automate */
  P[3] = {
    hint: {
      fr: "L'e-mail doit partir après la décision, et pas au demandeur.",
      en: "The email must go out after the decision, and not to the requester.",
    },
    render() {
      const steps = [
        { k: "trigger", fr: "Déclencheur : nouvel élément créé dans Congés", en: "Trigger: new item created in Leave" },
        { k: "manager", fr: "Obtenir le manager du demandeur", en: "Get the requester's manager" },
        { k: "approval", fr: "Démarrer une approbation et attendre la réponse", en: "Start an approval and wait for the response" },
        { k: "cond", fr: "Condition : réponse = Approuvé ?", en: "Condition: response = Approved?" },
        { k: "update", fr: "Mettre à jour l'élément (statut)", en: "Update the item (status)" },
        { k: "mail", fr: "Envoyer un e-mail de notification", en: "Send a notification email", cfg: true },
      ];
      if (!state.order) {
        do {
          state.order = shuffle(["trigger", "manager", "approval", "cond", "update", "mail"]);
        } while (state.order.join() === "trigger,manager,approval,cond,update,mail");
        state.to = pick(["requester", "all"]);
      }
      const draw = () => {
        const ul = body.querySelector("#gSteps");
        ul.innerHTML = state.order
          .map((k, i) => {
            const st = steps.find((x) => x.k === k);
            return (
              '<li><span class="k">' +
              (i + 1) +
              "</span><span>" +
              esc(L(st)) +
              (st.cfg
                ? '<span class="cfg">' +
                  L({ fr: "Destinataire :", en: "Recipient:" }) +
                  '<select class="g-select" id="gTo"><option value="requester"' +
                  (state.to === "requester" ? " selected" : "") +
                  ">" +
                  L({ fr: "Demandeur", en: "Requester" }) +
                  '</option><option value="manager"' +
                  (state.to === "manager" ? " selected" : "") +
                  ">" +
                  L({ fr: "Manager", en: "Manager" }) +
                  '</option><option value="all"' +
                  (state.to === "all" ? " selected" : "") +
                  ">" +
                  L({ fr: "Tout le service", en: "Whole department" }) +
                  "</option></select></span>"
                : "") +
              '</span><span class="mv"><button type="button" data-up="' +
              i +
              '" aria-label="↑">↑</button><button type="button" data-dn="' +
              i +
              '" aria-label="↓">↓</button></span></li>'
            );
          })
          .join("");
        ul.querySelectorAll("[data-up]").forEach(
          (b) =>
            (b.onclick = () => {
              const i = +b.dataset.up;
              if (i > 0) {
                [state.order[i - 1], state.order[i]] = [state.order[i], state.order[i - 1]];
                draw();
              }
            }),
        );
        ul.querySelectorAll("[data-dn]").forEach(
          (b) =>
            (b.onclick = () => {
              const i = +b.dataset.dn;
              if (i < 5) {
                [state.order[i + 1], state.order[i]] = [state.order[i], state.order[i + 1]];
                draw();
              }
            }),
        );
        const sel = ul.querySelector("#gTo");
        if (sel)
          sel.onchange = () => {
            state.to = sel.value;
          };
      };
      body.innerHTML =
        head(
          {
            fr: "« Le circuit d'approbation des congés ne notifie plus les managers. Aucune erreur dans l'historique des exécutions. »",
            en: "“The leave approval flow no longer notifies managers. No error in the run history.”",
          },
          {
            fr: "Remettez les six étapes dans l'ordre et corrigez l'étape mal configurée.",
            en: "Put the six steps back in order and fix the misconfigured step.",
          },
        ) +
        '<div class="g-area"><ul class="steps-list" id="gSteps"></ul></div>' +
        foot();
      draw();
      document.getElementById("gOk").onclick = guard(() => {
        const ok = state.order.join(",") === "trigger,manager,approval,cond,update,mail";
        if (ok && state.to === "manager")
          solved({
            fr: "Le manager reçoit la notification après la décision. Le flux est réparé.",
            en: "The manager receives the notification after the decision. The flow is fixed.",
          });
        else if (!ok)
          pen(
            25,
            L({
              fr: "L'ordre n'est pas encore bon. Pensez : déclencheur, données, approbation, décision, mise à jour, notification.",
              en: "The order is not right yet. Think: trigger, data, approval, decision, update, notification.",
            }),
          );
        else
          pen(
            25,
            L({
              fr: "L'ordre est bon, mais l'e-mail part encore à la mauvaise personne.",
              en: "The order is right, but the email still goes to the wrong person.",
            }),
          );
      });
    },
  };

  /* 05 · SQL */
  P[4] = {
    hint: {
      fr: "Deux problèmes : une jointure sans condition sur le client, et un GROUP BY qui ne regroupe pas par commande.",
      en: "Two problems: a join with no condition on the client, and a GROUP BY that does not group by order.",
    },
    render() {
      const q =
        "SELECT o.id, c.name AS client, SUM(l.qty * l.unit_price) AS total\nFROM orders o\nJOIN order_lines l ON l.order_id = o.id\nJOIN clients c\nWHERE o.month = '2026-10'\nGROUP BY c.name\nORDER BY o.id;";
      body.innerHTML =
        head(
          {
            fr: "« Le rapport mensuel des ventes affiche chaque commande deux ou trois fois et les totaux sont faux. »",
            en: "“The monthly sales report shows each order two or three times and the totals are wrong.”",
          },
          {
            fr: "Corrigez la requête puis exécutez-la. Le moteur compare votre résultat au résultat attendu.",
            en: "Fix the query and run it. The engine compares your result with the expected one.",
          },
        ) +
        '<div class="g-area"><div class="g-cols"><div><textarea class="g-sql" id="gSql" spellcheck="false">' +
        esc(q) +
        '</textarea></div><div class="mono-box" style="font-size:12px;color:var(--dark-ink-2)"><b style="color:var(--dark-ink)">clients</b> (id, name) : 1 Alpha · 2 Bêta · 3 Gamma<br><b style="color:var(--dark-ink)">orders</b> (id, client_id, month) : 101→1 · 102→2 · 103→1<br><b style="color:var(--dark-ink)">order_lines</b> (order_id, qty, unit_price) : 101: 2×500, 1×300 · 102: 1×1000 · 103: 4×250<br><br>' +
        L({ fr: "Attendu", en: "Expected" }) +
        " : 101 Alpha 1300 · 102 Bêta 1000 · 103 Alpha 1000</div></div></div>" +
        foot({ fr: "Exécuter", en: "Run" });
      document.getElementById("gOk").onclick = guard(() => {
        const sql = document.getElementById("gSql").value.replace(/\s+/g, " ");
        const join = /JOIN\s+clients\s+c\s+ON\s+(c\.id\s*=\s*o\.client_id|o\.client_id\s*=\s*c\.id)/i.test(sql);
        const grp = /GROUP\s+BY\s+(o\.id\s*,\s*c\.name|c\.name\s*,\s*o\.id|o\.id)\b/i.test(sql);
        if (join && grp)
          solved({
            fr: "Trois lignes, trois totaux justes. Le rapport mensuel est fiable.",
            en: "Three rows, three correct totals. The monthly report is reliable.",
          });
        else if (!join)
          pen(
            25,
            L({
              fr: "Résultat : 9 lignes. La jointure clients multiplie chaque commande par le nombre de clients.",
              en: "Result: 9 rows. The clients join multiplies every order by the number of clients.",
            }),
          );
        else
          pen(
            25,
            L({
              fr: "Résultat : 2 lignes. Les commandes d'Alpha sont fusionnées : il manque la commande dans le GROUP BY.",
              en: "Result: 2 rows. Alpha's orders are merged: the order is missing from GROUP BY.",
            }),
          );
      });
    },
  };

  /* 06 · Diagnostic */
  P[5] = {
    hint: {
      fr: "Tout commence par l'authentification. Cherchez la ligne la plus ancienne qui parle de certificat.",
      en: "It all starts with authentication. Look for the earliest line that mentions a certificate.",
    },
    render() {
      const hh = state.hh || (state.hh = pick(["08", "09", "10", "14"]));
      const H = (t) => hh + t.slice(2);
      const logs0 = [
        ["08:01:12", "FW", "allow tcp 10.4.2.15:443 -> 41.207.188.10:443"],
        ["08:01:45", "DNS", "query intranet.corp.bf A -> 10.4.1.20 (cached)"],
        ["08:02:03", "ADFS", "ERROR certificate 'adfs-signing' expired at 2026-11-02T08:02:00Z"],
        ["08:02:09", "ADFS", "WARN token signing failed: no valid signing certificate"],
        ["08:02:11", "SP", "WARN claims authentication failed for user bdiallo (invalid token signature)"],
        ["08:02:14", "ODOO", "werkzeug 401 /auth_oidc/signin ... invalid_token"],
        ["08:02:15", "EXCH", "OWA authentication failed: federation trust token rejected"],
        ["08:02:20", "SP", "WARN claims authentication failed for user asanou (invalid token signature)"],
        ["08:02:31", "FW", "allow tcp 10.4.2.31:443 -> 10.4.1.20:443"],
        ["08:02:40", "AD", "INFO Kerberos ticket granted for host web01"],
        ["08:03:02", "ODOO", "werkzeug 401 /auth_oidc/signin ... invalid_token (x17)"],
        ["08:03:10", "DNS", "query mail.corp.bf A -> 10.4.1.25"],
        ["08:03:22", "SP", "INFO health check OK, 0 errors in app pool"],
        ["08:03:40", "EXCH", "OWA authentication failed (x42)"],
        ["08:04:00", "MON", "ALERT 124 login failures in 2 min, agence Bobo"],
        ["08:04:05", "FW", "deny tcp 197.239.68.2:22 -> 41.207.188.10:22 (bruteforce rule)"],
        ["08:04:30", "AD", "INFO replication OK with DC02"],
        ["08:05:01", "ADFS", "INFO service restarted by operator, still no valid certificate"],
      ];
      const logs = logs0.map((l) => [H(l[0]), l[1], l[2].replace("08:02:00Z", hh + ":02:00Z")]);
      const opts = [
        { fr: "Redémarrer le serveur Odoo", en: "Restart the Odoo server" },
        {
          fr: "Renouveler le certificat de signature ADFS et republier les métadonnées",
          en: "Renew the ADFS signing certificate and republish the metadata",
        },
        { fr: "Purger le cache DNS des postes de l'agence", en: "Flush the DNS cache on the branch workstations" },
        { fr: "Ouvrir un ticket chez Microsoft pour SharePoint", en: "Open a Microsoft ticket for SharePoint" },
      ];
      body.innerHTML =
        head(
          {
            fr:
              "« Tous les utilisateurs de l'agence de Bobo sont déconnectés de l'intranet, d'Odoo et de la messagerie depuis " +
              +hh +
              " h 02. »",
            en: "“Every user in the Bobo branch has been logged out of the intranet, Odoo and email since " + +hh + ":02.”",
          },
          {
            fr: "Repérez la cause racine dans le journal, puis choisissez l'action d'escalade. Cliquer sur une conséquence coûte des points.",
            en: "Spot the root cause in the log, then choose the escalation action. Clicking a consequence costs points.",
          },
        ) +
        '<div class="g-area"><div class="mono-box" style="font-size:12px">' +
        logs
          .map(
            (l, i) =>
              '<div class="ln" data-i="' +
              i +
              '"><i>' +
              l[0] +
              '</i><span><b style="color:var(--dark-ink-2);font-weight:500">' +
              l[1].padEnd(5, " ") +
              "</b> " +
              esc(l[2]) +
              "</span></div>",
          )
          .join("") +
        '</div><div class="g-opts" id="gOpts" hidden>' +
        opts
          .map(
            (o, i) =>
              '<button type="button" class="g-opt" data-o="' +
              i +
              '" style="font-family:inherit;font-size:14px">' +
              esc(L(o)) +
              "</button>",
          )
          .join("") +
        "</div></div>" +
        foot();
      const consequences = [3, 4, 5, 6, 7, 10, 13, 14, 17];
      body.querySelectorAll(".ln").forEach((l) =>
        l.addEventListener("click", () => {
          const i = +l.dataset.i;
          body.querySelectorAll(".ln").forEach((x) => x.classList.remove("sel"));
          l.classList.add("sel");
          state.i = i;
          if (i === 2) {
            say(
              L({
                fr: "Cause racine : le certificat de signature ADFS a expiré à " + +hh + " h 02. Tout le reste en découle.",
                en: "Root cause: the ADFS signing certificate expired at " + +hh + ":02. Everything else follows.",
              }),
              "ok",
            );
            document.getElementById("gOpts").hidden = false;
          } else if (consequences.includes(i)) {
            l.classList.add("bad");
            pen(
              25,
              L({
                fr: "C'est une conséquence, pas la cause. Remontez dans le temps.",
                en: "That is a consequence, not the cause. Go back in time.",
              }),
            );
          } else pen(15, L({ fr: "Cette ligne est du bruit normal.", en: "This line is normal noise." }));
        }),
      );
      body.querySelectorAll(".g-opt").forEach((o) =>
        o.addEventListener("click", () => {
          body.querySelectorAll(".g-opt").forEach((x) => x.classList.remove("sel"));
          o.classList.add("sel");
          state.o = +o.dataset.o;
        }),
      );
      document.getElementById("gOk").onclick = guard(() => {
        if (state.i !== 2) return pen(25, L({ fr: "Identifiez d'abord la cause racine.", en: "Identify the root cause first." }));
        if (state.o === 1)
          solved({
            fr: "Certificat renouvelé, jetons à nouveau signés : SharePoint, Odoo et la messagerie reviennent ensemble.",
            en: "Certificate renewed, tokens signed again: SharePoint, Odoo and email come back together.",
          });
        else if (state.o === undefined) pen(0, L({ fr: "Choisissez une action.", en: "Pick an action." }));
        else
          pen(
            50,
            L({
              fr: "Cette action ne traite qu'un symptôme, la panne continue.",
              en: "That action only treats a symptom, the outage goes on.",
            }),
          );
      });
    },
  };
  /* 07 · Python réel, exécuté dans le navigateur : Pyodide dans un worker, avec délai de garde */
  let pyWorker = null,
    pyReady = null,
    pySeq = 0;
  function initPy() {
    if (pyReady) return pyReady;
    pyReady = new Promise((res, rej) => {
      try {
        const src =
          'importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");let py;const ready=loadPyodide().then(p=>{py=p;postMessage({ready:true});}).catch(e=>postMessage({fail:String(e)}));onmessage=async e=>{await ready;try{py.globals.set("CASES_JSON",e.data.cases);py.runPython(e.data.code);const out=py.runPython(e.data.tests);postMessage({id:e.data.id,out:String(out)});}catch(err){postMessage({id:e.data.id,err:String(err&&err.message||err)});}};';
        pyWorker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
        const to = setTimeout(() => rej("timeout"), 40000);
        pyWorker.addEventListener("message", (ev) => {
          if (ev.data.ready) {
            clearTimeout(to);
            res(true);
          } else if (ev.data.fail) {
            clearTimeout(to);
            rej(ev.data.fail);
          }
        });
        pyWorker.addEventListener("error", () => {
          clearTimeout(to);
          rej("worker");
        });
      } catch (e) {
        rej(e);
      }
    });
    pyReady.catch(() => {});
    return pyReady;
  }
  function runPy(code, tests, cases) {
    return new Promise((res, rej) => {
      const id = ++pySeq,
        w = pyWorker;
      const to = setTimeout(() => {
        try {
          w.terminate();
        } catch (e) {}
        pyWorker = null;
        pyReady = null;
        rej("timeout");
      }, 6000);
      const h = (ev) => {
        if (ev.data.id !== id) return;
        clearTimeout(to);
        w.removeEventListener("message", h);
        if (ev.data.err) rej(ev.data.err);
        else res(ev.data.out);
      };
      w.addEventListener("message", h);
      w.postMessage({ id, code, tests, cases });
    });
  }
  const PY_TESTS = [
    "import json",
    "def _run():",
    "    out = []",
    "    for name, F, exp in json.loads(CASES_JSON):",
    "        try:",
    "            got = relances([dict(f) for f in F])",
    "            got = [list(x) for x in got]",
    "            out.append([name, got == exp, repr(got)[:140]])",
    "        except Exception as e:",
    "            out.append([name, False, type(e).__name__ + ': ' + str(e)[:120]])",
    "    return json.dumps(out)",
    "_run()",
  ].join(String.fromCharCode(10));
  P[6] = {
    hint: {
      fr: "Trois étapes : filtrer (non payée et retard strictement au-delà du seuil), calculer la pénalité avec deux divisions entières, puis trier par pénalité décroissante et par numéro.",
      en: "Three steps: filter (unpaid and overdue strictly beyond the threshold), compute the penalty with two integer divisions, then sort by penalty descending and by number.",
    },
    render() {
      const NL = String.fromCharCode(10);
      const taux = state.taux || (state.taux = pick([2, 3])),
        seuil = state.seuil || (state.seuil = pick([30, 45]));
      const starter = ["def relances(factures):", "    resultat = []", "    # votre code ici", "    return resultat", ""].join(NL);
      if (state.code === undefined) state.code = starter;
      const ref = (F) =>
        F.filter((f) => !f.payee && f.jours_retard > seuil)
          .map((f) => [f.num, Math.floor((f.montant * taux) / 100) * Math.floor(f.jours_retard / seuil)])
          .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      const mk = (num, montant, jours, payee) => ({ num, montant, jours_retard: jours, payee });
      const sets = [
        [
          L({ fr: "filtre de base", en: "basic filter" }),
          [mk("FAC/001", 500000, seuil + 15, false), mk("FAC/002", 300000, seuil - 10, false), mk("FAC/003", 200000, seuil * 2 + 5, true)],
        ],
        [L({ fr: "seuil strict", en: "strict threshold" }), [mk("FAC/010", 400000, seuil, false), mk("FAC/011", 400000, seuil + 1, false)]],
        [L({ fr: "pénalité sur plusieurs périodes", en: "penalty over several periods" }), [mk("FAC/020", 1250000, seuil * 3 + 2, false)]],
        [
          L({ fr: "tri et égalités", en: "sorting and ties" }),
          [
            mk("FAC/032", 100000, seuil + 5, false),
            mk("FAC/030", 900000, seuil + 5, false),
            mk("FAC/031", 100000, seuil + 9, false),
            mk("FAC/033", 300000, seuil * 2 + 1, false),
          ],
        ],
        [L({ fr: "liste vide", en: "empty list" }), []],
      ];
      const cases = JSON.stringify(sets.map((x) => [x[0], x[1], ref(x[1])]));
      const ex = ref([mk("FAC/001", 500000, seuil + 15, false)])[0];
      body.innerHTML =
        head(
          {
            fr: "« La comptabilité veut la liste des factures à relancer, avec la pénalité de retard de chacune. Le script existant a disparu avec l'ancien serveur. »",
            en: "“Accounting wants the list of invoices to chase, each with its late penalty. The existing script vanished with the old server.”",
          },
          {
            fr: "Écrivez la fonction relances, puis lancez les tests. Votre code est réellement exécuté en Python.",
            en: "Write the relances function, then run the tests. Your code really runs in Python.",
          },
        ) +
        '<div class="g-area"><div class="g-cols"><div><textarea class="g-sql g-py" id="gPy" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea><div class="py-status" id="pyStatus"><i></i><span></span></div></div>' +
        '<div class="py-spec"><div>' +
        L({
          fr: "<b>Entrée</b> : une liste de factures, chacune un dictionnaire.",
          en: "<b>Input</b>: a list of invoices, each one a dictionary.",
        }) +
        '</div><pre>{"num": "FAC/001", "montant": 500000,' +
        NL +
        ' "jours_retard": ' +
        (seuil + 15) +
        ', "payee": False}</pre>' +
        "<div>" +
        L({
          fr: "<b>À relancer</b> : facture non payée dont <code>jours_retard</code> est strictement supérieur à <b>" + seuil + "</b>.",
          en: "<b>To chase</b>: unpaid invoice whose <code>jours_retard</code> is strictly greater than <b>" + seuil + "</b>.",
        }) +
        "</div>" +
        "<div>" +
        L({
          fr: "<b>Pénalité</b> : <code>(montant * " + taux + " // 100) * (jours_retard // " + seuil + ")</code>",
          en: "<b>Penalty</b>: <code>(montant * " + taux + " // 100) * (jours_retard // " + seuil + ")</code>",
        }) +
        "</div>" +
        "<div>" +
        L({
          fr: "<b>Sortie</b> : une liste de tuples <code>(num, penalite)</code>, triée par pénalité décroissante, puis par <code>num</code> croissant.",
          en: "<b>Output</b>: a list of tuples <code>(num, penalite)</code>, sorted by penalty descending, then by <code>num</code> ascending.",
        }) +
        "</div>" +
        '<pre>relances([...]) -> [("' +
        ex[0] +
        '", ' +
        ex[1] +
        ')]</pre></div></div><ul class="py-tests" id="pyTests"></ul></div>' +
        foot({ fr: "Lancer les tests", en: "Run the tests" });
      const ta = document.getElementById("gPy"),
        st = document.getElementById("pyStatus"),
        list = document.getElementById("pyTests");
      ta.value = state.code;
      const setSt = (cls, o) => {
        st.className = "py-status " + cls;
        st.querySelector("span").textContent = L(o);
      };
      ta.addEventListener("input", () => {
        state.code = ta.value;
      });
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
          e.preventDefault();
          const a = ta.selectionStart;
          ta.setRangeText("    ", a, ta.selectionEnd, "end");
          state.code = ta.value;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          const a = ta.selectionStart,
            line = ta.value.slice(0, a).split(NL).pop(),
            ind = (line.match(/^\s*/) || [""])[0] + (/:\s*$/.test(line) ? "    " : "");
          ta.setRangeText(NL + ind, a, ta.selectionEnd, "end");
          state.code = ta.value;
        }
      });
      let pyOK = null;
      const READY = { fr: "Interpréteur Python prêt", en: "Python interpreter ready" };
      setSt("", { fr: "Chargement de l'interpréteur Python (environ 10 Mo)…", en: "Loading the Python interpreter (about 10 MB)…" });
      initPy().then(
        () => {
          pyOK = true;
          setSt("ok", READY);
        },
        () => {
          pyOK = false;
          setSt("off", {
            fr: "Interpréteur indisponible ici : validation simplifiée, sans exécution",
            en: "Interpreter unavailable here: simplified check, without execution",
          });
        },
      );
      const show = (rows) => {
        list.innerHTML = rows
          .map(
            (r) =>
              '<li class="' +
              (r[1] ? "ok" : "ko") +
              '"><b>' +
              (r[1] ? "✓" : "✗") +
              '</b><span style="color:var(--dark-ink)">' +
              esc(r[0]) +
              "</span><span>" +
              esc(r[2]) +
              "</span></li>",
          )
          .join("");
      };
      document.getElementById("gOk").onclick = guard(async () => {
        const code = ta.value;
        if (pyOK === null)
          return say(
            L({
              fr: "L'interpréteur finit de se charger, réessayez dans quelques secondes.",
              en: "The interpreter is still loading, try again in a few seconds.",
            }),
            "",
          );
        if (pyOK) {
          say(L({ fr: "Exécution des tests…", en: "Running the tests…" }), "");
          try {
            const rows = JSON.parse(await runPy(code, PY_TESTS, cases));
            show(rows);
            const ok = rows.filter((r) => r[1]).length;
            if (ok === rows.length)
              solved({
                fr: "Cinq tests sur cinq : la comptabilité a de nouveau son script de relance.",
                en: "Five tests out of five: accounting has its reminder script back.",
              });
            else
              pen(
                20,
                L({
                  fr: ok + " test(s) sur " + rows.length + " réussis. Regardez la valeur obtenue à droite de chaque test.",
                  en: ok + " of " + rows.length + " tests passed. Look at the value obtained next to each test.",
                }),
              );
          } catch (err) {
            if (err === "timeout") {
              list.innerHTML = "";
              pyOK = null;
              setSt("", {
                fr: "Exécution interrompue, rechargement de l'interpréteur…",
                en: "Execution stopped, reloading the interpreter…",
              });
              initPy().then(
                () => {
                  pyOK = true;
                  setSt("ok", READY);
                },
                () => {
                  pyOK = false;
                },
              );
              pen(
                20,
                L({
                  fr: "Trop long : boucle infinie ? Le code a été arrêté après 6 secondes.",
                  en: "Too slow: infinite loop? The code was stopped after 6 seconds.",
                }),
              );
            } else {
              const last = String(err).trim().split(NL).pop();
              list.innerHTML =
                '<li class="ko"><b>✗</b><span style="color:var(--dark-ink)">Python</span><span>' + esc(last) + "</span></li>";
              pen(20, L({ fr: "Erreur Python : " + last, en: "Python error: " + last }));
            }
          }
        } else {
          const okF = /payee/.test(code) && new RegExp(">\\s*" + seuil + "\\b").test(code);
          const okP =
            /\/\/\s*100\b/.test(code) &&
            new RegExp("\\/\\/\\s*" + seuil + "\\b").test(code) &&
            new RegExp("\\*\\s*" + taux + "\\b|\\b" + taux + "\\s*\\*").test(code);
          const okS = /sort/.test(code);
          show([
            [L({ fr: "filtre", en: "filter" }), okF, ""],
            [L({ fr: "pénalité", en: "penalty" }), okP, ""],
            [L({ fr: "tri", en: "sorting" }), okS, ""],
          ]);
          if (okF && okP && okS)
            solved({
              fr: "Validation simplifiée réussie (interpréteur indisponible sur cet hébergement).",
              en: "Simplified check passed (interpreter unavailable on this host).",
            });
          else
            pen(
              20,
              L({
                fr: "Il manque encore un élément : filtre, calcul de pénalité ou tri.",
                en: "Something is still missing: filter, penalty calculation or sorting.",
              }),
            );
        }
      });
    },
  };
})();
