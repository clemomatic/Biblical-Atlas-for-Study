/* JW Study Desk 0.22.9 — Atelier discours : EXTRACTION DE RÉFÉRENCE. */
/* Source : le bundle JavaScript distribué dans JW-Study-Desk-0.22.9(3).zip. */
/* ATTENTION : ce fichier n’est PAS exécutable indépendamment ; noms internes minifiés,
 * dépendances globales à retrouver dans main.recovered.js. Ne pas utiliser comme source
 * pour remplacer main.js dans Obsidian. Aucun contenu fonctionnel n’a été ajouté. */

/* === oa, kr, ya, Ds === */
const oa = (t, e) => t.nodes.find(a => a.id === e), kr = t => t.nodes[0].title, ya = (t, e) => t.nodes.filter(a => a.parent === e && a.id !== Ye), Ds = t => structuredClone(t), Na = t => Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"), sp = 359999, Dm = 500, $n = 15e4, MS = (t, e, a) => Math.max(e, Math.min(a, t)), Dd = t => Number.isInteger(t) && t >= 0 && t <= sp;

/* === Zr === */
function Zr(t, e) { let a = e; for (; a.parent && a.parent !== Ye;) {
    const i = oa(t, a.parent);
    if (!i)
        break;
    a = i;
} return a; }

/* === Qc === */
function Qc(t, e = "horizontal") { const a = t.nodes[0], i = ya(t, a.id); if (e === "vertical") {
    const p = [-116, 116], v = [a.position.y + 124, a.position.y + 124];
    i.forEach((h, y) => { const B = y % p.length, Q = a.position.x + p[B]; h.position = { x: Q, y: v[B] }; for (const w of Rr(t, h.id))
        v[B] += 102, w.position = { x: Q - Math.sign(p[B]) * 14, y: v[B] }; v[B] += 112; });
    return;
} const n = new Map; function o(p) { const v = Math.max(1, ya(t, p.id).reduce((h, y) => h + o(y), 0)); return n.set(p.id, v), v; } i.forEach(o); const l = i.filter((p, v) => v % 2 === 0), d = i.filter((p, v) => v % 2 !== 0); function g(p, v, h, y) { let B = h; for (const Q of p) {
    const w = n.get(Q.id) * 116;
    Q.position = { x: v, y: B + w / 2 }, g(ya(t, Q.id), v + 250 * y, B, y), B += w;
} } for (const [p, v] of [[l, -1], [d, 1]]) {
    const h = p.reduce((y, B) => y + n.get(B.id) * 116, 0);
    g(p, a.position.x + 250 * v, a.position.y - h / 2, v);
} }

/* === u2 === */
function u2(t, e, a = {}) {
    const i = Object.hasOwn(Ac, String(a.discourse_type)) ? a.discourse_type : "personal", n = Number(a.duration_minutes), o = typeof a.title == "string" ? a.title : e, l = ky({ title: o, duration: Number.isFinite(n) && n > 0 ? n : 10, kind: i, scripture: "", goal: "", template: "empty" }), d = [{ level: 0, node: l.nodes[0] }], g = t.replace(/^\uFEFF?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, "");
    let p, v = !1, h = 0;
    for (const y of g.split(/\r?\n/)) {
        const B = /^ {0,3}(`{3,}|~{3,})/.exec(y)?.[1];
        B && (p ? B[0] === p.character && B.length >= p.length && /^ {0,3}[`~]+\s*$/.test(y) && (p = void 0) : p = { character: B[0], length: B.length });
        const Q = !p && !B ? /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(y) : null;
        if (!Q) {
            d[d.length - 1].node.note += y + `
`;
            continue;
        }
        const w = Q[1].length;
        if (!v && w === 1) {
            v = !0, a.title || (l.nodes[0].title = Q[2].trim());
            continue;
        }
        for (v = !0; d.length > 1 && d[d.length - 1].level >= w;)
            d.pop();
        const f = d[d.length - 1].node, M = SS.exec(Q[2]), D = (M ? Q[2].slice(0, M.index) : Q[2]).replace(/^\d+\s*·\s*/, "").replace(/\s+[—–]\s*$/, "").trim(), R = f.id === Ye && RS.has(D.toLocaleLowerCase("fr")), z = qs(l, R ? null : f.id, D || Q[2]);
        if (M) {
            const N = op(M[1] ?? M[2]);
            N !== null && (z.mode = "fixed", z.seconds = N, f.id === Ye && !R && (h += N));
        }
        d.push({ level: w, node: z });
    }
    !(n > 0) && h > 0 && (l.target = Math.min(sp, h));
    for (const y of l.nodes)
        y.note = y.note.trim();
    return Qc(l), l;
}

/* === Sn === */
function Sn(t, e = !0) { const a = Ep(t), i = /^(?:n(?:[°ºᵒ]|o)\.?|num[ée]ro|discours\s+n(?:[°ºᵒ]|o)\.?|plan\s+n(?:[°ºᵒ]|o)\.?|#)\s*(\d{1,3})(?!\d)\s*[.)·:\-–—]?\s*(.*)$/iu.exec(a) ?? (e ? /^(\d{1,3})\s*[.)·:\-–—]\s*(.+)$/u.exec(a) ?? /^(0\d{1,2})\s+(.+)$/u.exec(a) : null); return !i || !m2(Number(i[1])) ? null : { number: Number(i[1]), title: i[2].trim() }; }

/* === GS === */
function GS(t, e) {
    const a = u2(t.markdown, t.title, { title: t.title, discourse_type: "public", duration_minutes: e / 60 }), i = a.nodes[0];
    for (const n of a.nodes.slice(1)) {
        const o = US(n.note), l = [[]];
        let d = 0, g = 0;
        for (const v of o) {
            const h = v.replace(Pd, "").trim();
            if (/^S[-–]34(?:[-–][A-Z]+)?\s+(?:(?:N[°ºo]\.?\s*)?\d{1,3}\s+)?\d{1,2}\/\d{2,4}$/i.test(h)) {
                i.note = [i.note, v].filter(Boolean).join(`

`);
                continue;
            }
            h && g && (d + h.length > 500 || g >= 5) && (l.push([]), d = g = 0), l.at(-1).push(v), h && (d += h.length, g++);
        }
        n.note = l[0].join(`

`);
        const p = ya(a, n.id)[0]?.id;
        for (const [v, h] of l.slice(1).entries()) {
            const y = h.join(`

`), B = h[0].replace(Pd, "").trim(), Q = qs(a, n.id, h2(B, v + 2), { x: 0, y: 0 }, p);
            Q.note = y, Q.mapText = !0;
        }
    }
    return Qc(a), a;
}

/* === g9 === */
class g9 extends Y.Modal {
    constructor(e, a) { super(e), this.save = a; }
    onOpen() { this.modalEl.addClass("jwsd-theme", "jwsd-modal"), this.contentEl.addClass("jwsd-theme", "biblelab-talk-modal"); const e = this.contentEl; e.empty(), e.createEl("h2", { text: "Créer un plan de discours" }); const a = { title: "", duration: 10, scripture: "", goal: "", kind: "meeting", template: "outline" }; new Y.Setting(e).setName("Titre").addText(i => i.setPlaceholder("Cultiver la paix").onChange(n => { a.title = n; })), new Y.Setting(e).setName("Type").addDropdown(i => i.addOptions(Ac).setValue("meeting").onChange(n => { a.kind = n; })), new Y.Setting(e).setName("Modèle").addDropdown(i => i.addOption("outline", "Ouverture, développement, conclusion").addOption("empty", "Carte vide").setValue("outline").onChange(n => { a.template = n; })), new Y.Setting(e).setName("Durée cible (min)").addText(i => i.setValue("10").onChange(n => { a.duration = Number(n.replace(",", ".")); })), new Y.Setting(e).setName("Verset central").addText(i => i.setPlaceholder("Romains 12:18").onChange(n => { a.scripture = n; })), new Y.Setting(e).setName("Objectif").addTextArea(i => i.onChange(n => { a.goal = n; })), new Y.Setting(e).addButton(i => i.setButtonText("Créer le plan").setCta().onClick(async () => { if (!a.title.trim()) {
        new Y.Notice("Indique un titre pour retrouver ce plan.");
        return;
    } if (!Number.isFinite(a.duration) || a.duration <= 0 || a.duration > 360) {
        new Y.Notice("Indique une durée entre 0 et 360 minutes.");
        return;
    } i.setDisabled(!0); try {
        await this.save(a), this.close();
    }
    catch (n) {
        new Y.Notice(n instanceof Error ? n.message : "Création impossible."), i.setDisabled(!1);
    } })); }
}

/* === Hg === */
class Hg extends Y.FuzzySuggestModal {
    constructor(e, a, i, n, o) { super(e), this.entries = i, this.describe = n, this.choose = o, this.setPlaceholder(a); }
    getItems() { return this.entries; }
    getItemText(e) { return this.describe(e); }
    onChooseItem(e) { this.choose(e); }
}

/* === sQ === */
function sQ(t, e) {
    const a = c0(t.saved), i = c0(e);
    if (t.raw === a || t.raw.replace(/\r\n/g, `
`) === a)
        return i;
    const n = "```" + np + `
`, o = new RegExp("^```" + np + "[ \\t]*\\r?\\n[\\s\\S]*?^```[ \\t]*$", "m"), l = i.indexOf(n), d = a.slice(0, a.indexOf(n));
    return (t.raw.startsWith(d) ? i.slice(0, l) + t.raw.slice(d.length) : t.raw).replace(o, () => i.slice(l).trimEnd());
}

/* === u9 === */
class u9 {
    constructor(e, a) { this.app = e, this.noteFolder = a, this.summaries = new WeakMap, this.importing = new Map; }
    directory() { return [this.noteFolder(), "Discours"].join("/").split("/").filter(Boolean).join("/"); }
    async folder(e) { let a = ""; for (const i of e.split("/").filter(Boolean)) {
        a = a ? a + "/" + i : i;
        const n = this.app.vault.getAbstractFileByPath(a);
        if (!(n instanceof Y.TFolder)) {
            if (n)
                throw new Error("Un fichier occupe le dossier « " + a + " ».");
            try {
                await this.app.vault.createFolder(a);
            }
            catch (o) {
                if (!(this.app.vault.getAbstractFileByPath(a) instanceof Y.TFolder))
                    throw o;
            }
        }
    } }
    async create(e, a, i, n) { await this.folder(e); const o = $d(a).slice(0, 110) || "Discours"; for (let l = 1;; l++) {
        const d = e + "/" + o + (l === 1 ? "" : " (" + l + ")") + "." + i;
        if (!this.app.vault.getAbstractFileByPath(d))
            try {
                return typeof n == "string" ? await this.app.vault.create(d, n) : await this.app.vault.createBinary(d, n);
            }
            catch (g) {
                if (!this.app.vault.getAbstractFileByPath(d))
                    throw g;
            }
    } }
    outlineCatalogPath() { return this.directory() + "/Catalogue JWPub/catalogue.json"; }
    async outlines() { const e = this.outlineCatalogPath(), a = this.app.vault.getAbstractFileByPath(e); if (!a)
        return Kd(); if (!(a instanceof Y.TFile))
        throw new Error("Le fichier du catalogue JWPub est indisponible."); return tQ(await this.app.vault.read(a)); }
    async saveOutlines(e, a, i, n) {
        const o = this.outlineCatalogPath(), l = o.slice(0, o.lastIndexOf("/")), d = new Map, g = [];
        for (const B of i) {
            for (const f of B.markdown.matchAll(Pd)) {
                const M = f[2] || f[3], D = e.assets.get(M);
                if (!D || d.has(M))
                    continue;
                const R = M.split("/").pop(), z = Zl.exec(R)[0], N = await Nr(D), U = l + "/Illustrations/" + N.slice(0, 24) + "-" + $d(R.slice(0, -z.length)) + z;
                if (await this.folder(l + "/Illustrations"), !this.file(U))
                    try {
                        await this.app.vault.createBinary(U, new Uint8Array(D).buffer);
                    }
                    catch (O) {
                        if (!this.file(U))
                            throw O;
                    }
                d.set(M, U);
            }
            const Q = d9(B.markdown.replace(Pd, (f, M, D, R) => { const z = d.get(D || R); return z ? "![" + M + "](<" + z + ">)" : M; })), w = await Nr(Gs(JSON.stringify([B.title, B.seconds, Q])));
            g.push({ ...B, id: Ap(), revision: w, markdown: Q });
        }
        await this.folder(l);
        const p = Ap();
        let v;
        const h = B => {
            const Q = tQ(B);
            return v = KS(Q, a, e, g, n, p), JSON.stringify(Q) + `
`;
        };
        let y = this.file(o);
        if (!y) {
            const B = h(JSON.stringify(Kd()));
            try {
                return await this.app.vault.create(o, B), v;
            }
            catch (Q) {
                if (y = this.file(o), !y)
                    throw Q;
            }
        }
        return await this.app.vault.process(y, h), v;
    }
    async prepareOutline(e, a) { const i = await this.currentOutline(e), n = GS(i, a); n.outline = e; const o = this.outlineCatalogPath().replace(/catalogue\.json$/, "Illustrations/"); for (const l of n.nodes)
        l.note = l.note.replace(Pd, (d, g, p, v) => { const h = p || v; return h.startsWith(o) ? (l.images.some(y => y.path === h) || l.images.push({ path: h, caption: g, show: !1 }), "") : g; }).trim(); return this.createPlan(n, DA(i)); }
    async currentOutline(e) { const a = g0(await this.outlines(), e)?.template; if (!a || a.revision !== e.revision || a.number !== e.number)
        throw new Error("Le modèle a changé. Rouvre son aperçu pour utiliser la version à jour."); return a; }
    async cards() { const e = this.directory() + "/", a = this.app.vault.getMarkdownFiles().filter(l => { const d = this.app.metadataCache.getFileCache(l)?.frontmatter; return !!d?.jwsd_discours || d?.bible_lab_kind === "discourse" || !d && l.path.startsWith(e); }), n = (await Promise.all(a.map(async (l) => { const d = this.app.metadataCache.getFileCache(l)?.frontmatter, g = l.path + "|" + l.stat.mtime + "|" + l.stat.size, p = this.summaries.get(l); if (p?.stamp === g)
        return p.card; let v; try {
        const h = await this.app.vault.cachedRead(l);
        if (/^```jwsd-discours[ \t]*\r?$/m.test(h) || d?.jwsd_discours)
            v = { file: l, plan: aQ(h) };
        else if (d?.bible_lab_kind === "discourse")
            v = { file: l };
        else
            return null;
    }
    catch {
        v = { file: l, broken: !0 };
    } return this.summaries.set(l, { stamp: g, card: v }), v; }))).filter(l => !!l), o = new Set(n.map(l => l.plan?.source).filter(Boolean)); return n.filter(l => l.plan || l.broken || !o.has(l.file.path)); }
    file(e) { const a = this.app.vault.getAbstractFileByPath(e); return a instanceof Y.TFile ? a : void 0; }
    async open(e) { const a = await this.app.vault.read(e); return { file: e, raw: a, saved: aQ(a) }; }
    async save(e, a) { if (this.file(e.file.path) !== e.file)
        throw new Error("Le fichier de ce plan a été déplacé ou supprimé."); const i = sQ(e, a); await this.app.vault.process(e.file, n => { if (n !== e.raw)
        throw new Error("Ce plan a changé ailleurs. Tes modifications peuvent être enregistrées dans une copie."); return i; }), e.raw = i, e.saved = a, this.summaries.delete(e.file); }
    async trash(e) { const { file: a } = e; if (await this.app.vault.read(a) !== e.raw || this.file(a.path) !== a)
        throw new Error("Ce plan a changé. Rouvre le menu du plan pour confirmer sa suppression."); await this.app.vault.trash(a, !1), this.summaries.delete(a); }
    createPlan(e, a = kr(e)) { return this.create(this.directory(), a, "md", c0(e)); }
    noteFiles() { return this.app.vault.getMarkdownFiles().filter(e => !this.app.metadataCache.getFileCache(e)?.frontmatter?.jwsd_discours); }
    images() { return this.app.vault.getFiles().filter(e => Zl.test(e.path)); }
    async readSource(e) { const a = await this.app.vault.read(e); if (/^```jwsd-discours[ \t]*\r?$/m.test(a))
        throw new Error("Cette note possède déjà une carte de discours."); const i = u2(a, e.basename, this.app.metadataCache.getFileCache(e)?.frontmatter); i.source = e.path; for (const n of i.nodes) {
        const o = n.note.matchAll(/!\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]|!\[[^\]]*\]\(<?([^\s)>]+)>?\)/g);
        for (const l of o) {
            const d = l[1] || l[2];
            if (!Zl.test(d) || /^[a-z]+:/i.test(d))
                continue;
            const g = this.file(d) ?? this.app.metadataCache.getFirstLinkpathDest?.(d, e.path);
            g && !n.images.some(p => p.path === g.path) && n.images.push({ path: g.path, caption: "", show: !1 });
        }
    } return i; }
    importPlan(e) { const a = e.source, i = this.importing.get(a); if (i)
        return i; const n = (async () => (await this.cards()).find(l => l.plan?.source === a)?.file ?? this.createPlan(e))().finally(() => { this.importing.delete(a); }); return this.importing.set(a, n), n; }
    readXmind(e) { return _S(e, a => { const i = Y.sanitizeHTMLToDom(a); for (const n of i.querySelectorAll("img"))
        n.replaceWith(i.ownerDocument.createTextNode(n.alt)); for (const n of i.querySelectorAll("a"))
        /^https?:\/\/[^\s<>]+$/i.test(n.getAttribute("href") ?? "") || n.removeAttribute("href"); return Y.htmlToMarkdown(i); }); }
    async importXmind(e, a, i) { const n = Ds(a.plan), o = { archive: e.archive, sheet: a.index, filename: e.filename, number: a.number }; n.xmind = o; const l = D => D.xmind?.archive === o.archive && D.xmind.sheet === o.sheet; let d; if (i.kind === "plan") {
        const D = this.file(i.path);
        if (!D)
            throw new Error("Le plan choisi est introuvable. Rouvre l’import pour sélectionner sa destination.");
        if (d = await this.open(D), l(d.saved))
            return { file: D, reused: !0 };
        if (JSON.stringify(d.saved) !== JSON.stringify(i.previous))
            throw new Error("Le plan choisi a changé. Rouvre l’import pour voir sa version actuelle.");
    }
    else {
        const D = i.kind === "outline" ? i.source : void 0, R = (await this.cards()).find(z => z.plan && z.plan.status !== "archived" && l(z.plan) && (D ? z.plan.outline?.collectionId === D.collectionId && z.plan.outline.templateId === D.templateId : !z.plan.outline));
        if (R)
            return { file: R.file, reused: !0 };
        if (D) {
            const z = await this.currentOutline(D);
            n.outline = D, n.kind = "public", n.target = z.seconds ?? 1800;
        }
    } const g = new Map; for (const [D, R] of a.images) {
        const z = Zl.exec(D)[0].slice(1).toLowerCase(), N = await Nr(R), U = this.directory() + "/Illustrations/Xmind", O = U + "/image-" + N.slice(0, 24) + "." + z;
        if (!this.file(O)) {
            await this.folder(U);
            try {
                await this.app.vault.createBinary(O, new Uint8Array(R).buffer);
            }
            catch (Z) {
                if (!this.file(O))
                    throw Z;
            }
        }
        g.set(D, O);
    } for (const D of n.nodes)
        for (const R of D.images)
            R.path = g.get(R.path); if (!d)
        return { file: await this.createPlan(n, tc(n)), reused: !1 }; const p = d.saved, v = Ds(p); l0(v, "archived"), v.nodes[0].title += " (avant import Xmind)"; const h = sQ(d, v), y = await this.create(this.directory(), tc(v), "md", h), { nodes: B, relations: Q, mapLayout: w, xmind: f } = n, M = { ...p, nodes: B, relations: Q, mapLayout: w, xmind: f }; delete M.lastRehearsal; try {
        await this.save(d, M);
    }
    catch (D) {
        throw await this.app.vault.trash(y, !1).catch(() => { }), D;
    } return { file: d.file, backup: y, reused: !1 }; }
    async addImage(e) { if (!Zl.test(e.name) || e.size === 0 || e.size > 25 * 1024 * 1024)
        throw new Error("Choisis un fichier image de 25 Mo maximum."); const a = e.name.lastIndexOf("."); return this.create(this.directory() + "/Illustrations", e.name.slice(0, a), e.name.slice(a + 1).toLowerCase(), await e.arrayBuffer()); }
    export(e, a) { const i = kr(e) + (a === "md" ? " - Plan" : " - Carte"); return this.create(this.directory() + "/Exports", i, a, a === "md" ? m9(e) : I9(e)); }
}

/* === tc === */
function tc(t) { const e = kr(t), a = t.outline?.number ?? t.xmind?.number, i = Sn(e); return DA({ title: i && i.number === a && i.title ? i.title : e, number: a }); }

/* === I0 === */
function I0(t) {
    const e = yc(t), a = [t.note];
    for (const i of e) {
        const n = i.url ? l9(i.label, i.url) : i.label;
        a.push("- " + (i.read ? "**À lire** · " : "") + n + (i.excerpt ? `
  > ` + i.excerpt.replace(/\n/g, `
  > `) : ""));
    }
    for (const i of t.images)
        a.push((i.show ? "**À montrer** · " : "") + i.caption + `
![[` + i.path + "]]");
    return a.filter(Boolean).join(`

`);
}

/* === m9 === */
function m9(t) {
    const e = Lo(t), a = ["# " + kr(t), "**Durée cible** " + Na(t.target) + " · **Prévue** " + Na(e.total), I0(t.nodes[0])];
    function i(o, l) { const d = e.slots.get(o.id), g = l <= 6 ? "#".repeat(l) + " " : "  ".repeat(l - 6) + "- "; a.push(g + o.title + (d?.seconds ? " — " + Na(d.start) + " à " + Na(d.end) : ""), I0(o)), ya(t, o.id).forEach(p => i(p, l + 1)); }
    ya(t, Ye).forEach(o => i(o, 2));
    const n = ya(t, null);
    return n.length && (a.push("## Sujets flottants"), n.forEach(o => i(o, 3))), a.filter(Boolean).join(`

`) + `
`;
}

/* === I9 === */
function I9(t) {
    const e = Lo(t), a = t.nodes.map(n => {
        const o = e.slots.get(n.id), l = o?.seconds ? `

` + Na(o.start) + " → " + Na(o.end) : "", d = I0(n);
        return { id: n.id, type: "text", x: Math.round(n.position.x - 106), y: Math.round(n.position.y - 46), width: 212, height: 92, color: oQ[Zr(t, n).color], text: "### " + n.title + l + (d ? `

` + d : "") };
    }), i = t.nodes.flatMap(n => n.parent ? [{ id: "branch-" + n.id, fromNode: n.parent, toNode: n.id, color: oQ[Zr(t, n).color], toEnd: "none" }] : []);
    return t.relations.forEach((n, o) => i.push({ id: "relation-" + o, fromNode: n.from, toNode: n.to, color: "#8490a3", toEnd: "none", label: n.label })), JSON.stringify({ nodes: a, edges: i }, null, 2);
}

/* === f2 === */
class f2 {
    constructor(e) { this.actions = e, this.tiles = new Map, this.layoutPositions = new Map, this.touches = new Map, this.arrowId = "jwsd-talk-arrow-" + Ap(), this.selected = new Set, this.fitted = !0, this.readingContext = new Set, this.skipClickUntil = 0; }
    dispose(e = !1) { this.finishEdit(!1, !1), this.endWidthDrag(!1), this.observer?.disconnect(), this.observer = void 0, this.drag = void 0, this.viewport = void 0, this.sheet = void 0, this.lines = void 0, this.viewportSize = void 0, this.readingFrame = void 0, this.readingPath = void 0, this.readingContext.clear(), this.status = void 0, this.zoomText = void 0, this.bubbleTools = void 0, this.topicTools = void 0, this.primary = void 0, this.plan = void 0, this.tiles.clear(), this.layoutPositions.clear(), this.touches.clear(), this.pinch = void 0, this.lastTap = void 0, e && (this.camera = void 0, this.fitted = !0, this.skipClickUntil = 0); }
    render(e, a, i, n, o = {}) { this.dispose(), this.plan = a, this.selected = n; const l = e.createDiv({ cls: "jwsd-talk-map-shell" }), d = this.actions.edit; if (o.overview) {
        this.renderOverview(l, a, i, n);
        return;
    } const { renderNote: g } = o, p = l.createDiv({ cls: "jwsd-talk-map" + (d ? "" : " is-reading"), attr: { "aria-label": d ? "Carte mentale du discours" : "Carte Orateur", role: "region" } }); this.viewport = p, this.sheet = p.createDiv({ cls: "jwsd-talk-sheet" }), this.lines = p.ownerDocument.createElementNS(Jl, "svg"), this.lines.classList.add("jwsd-talk-edges"), this.lines.setAttribute("aria-hidden", "true"), this.sheet.append(this.lines); const v = p.ownerDocument.createElementNS(Jl, "defs"), h = p.ownerDocument.createElementNS(Jl, "marker"); for (const [M, D] of Object.entries({ id: this.arrowId, viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "10", markerHeight: "10", markerUnits: "userSpaceOnUse", orient: "auto" }))
        h.setAttribute(M, D); const y = p.ownerDocument.createElementNS(Jl, "path"); y.setAttribute("d", "M 0 0 L 10 5 L 0 10 Z"), h.append(y), v.append(h), this.lines.append(v), this.status = l.createDiv({ cls: "jwsd-talk-drop-hint", attr: { hidden: "" } }); const B = M => { this.addTile(this.sheet, M, a, i, n, o), (!d || !M.collapsed) && ya(a, M.id).forEach(B); }; B(a.nodes[0]), ya(a, null).forEach(B); const Q = l.createDiv({ cls: "jwsd-talk-zoom" }); Be(Q, "Zoom arrière", "minus", () => this.zoom(1 / 1.2), "is-icon"), this.zoomText = Q.createSpan(), Be(Q, "Zoom avant", "plus", () => this.zoom(1.2), "is-icon"), Be(Q, "Recentrer la carte", "scan", () => { this.actions.recenter ? this.actions.recenter() : this.fit(); }, "is-icon"), d && (this.topicTools = l.createEl("nav", { cls: "jwsd-talk-topic-tools", attr: { "aria-label": "Créer près de la bulle", hidden: "" } }), this.bubbleTools = l.createEl("nav", { cls: "jwsd-talk-bubble-tools", attr: { "aria-label": "Actions de la bulle" } })), this.selectNodes(n), p.addEventListener("pointerdown", M => this.begin(M)), p.addEventListener("pointermove", M => this.move(M)), p.addEventListener("pointerup", M => this.release(M, !0)), p.addEventListener("pointercancel", M => this.release(M, !1)), p.addEventListener("lostpointercapture", M => { M.target === p && this.release(M, !1); }), p.addEventListener("pointerleave", M => { M.pointerType !== "touch" && this.drag && !this.drag.moved && (this.drag = void 0); }), p.addEventListener("contextmenu", M => { !this.inline && M instanceof PointerEvent && M.pointerType === "touch" && M.preventDefault(); }), d && p.addEventListener("dblclick", M => { if (M.target.closest(".jwsd-talk-tile") || performance.now() < this.skipClickUntil)
        return; const D = this.pointAt(M); D && d.floating(D); }), p.addEventListener("wheel", M => { !M.ctrlKey && !M.metaKey || (M.preventDefault(), this.zoom(M.deltaY < 0 ? 1.15 : 1 / 1.15, this.local(M))); }, { passive: !1 }); const w = C2(a), f = () => { const { clientWidth: M, clientHeight: D } = p; if (!M || !D || this.drag || this.pinch || this.widthDrag)
        return; const R = this.viewportSize; if (this.viewportSize = { width: M, height: D }, this.inline) {
        this.inline.reveal(!1), this.paint();
        return;
    } if (w ? this.layoutPositions = B2(a, this.measureTiles()) : g && !a.mapLayout && this.spaceNotes(a), this.readingFrame) {
        this.frameBranch(this.readingFrame);
        return;
    } if (!this.camera || this.fitted) {
        this.fit();
        return;
    } !d && R && (this.camera.x += (M - R.width) / 2, this.camera.y += (D - R.height) / 2), this.paint(); }; this.observer = new ResizeObserver(f), this.observer.observe(p); for (const M of this.tiles.values())
        this.observer.observe(M); f(); }
    renderOverview(e, a, i, n) { const o = e.createDiv({ cls: "jwsd-talk-overview", attr: { "aria-label": this.actions.edit ? "Vue d’ensemble du discours" : "Carte Orateur", role: "region", tabindex: "0" } }), l = new Set([...n].map(v => Zr(a, oa(a, v)).id)), d = (v, h) => this.addTile(v, h, a, i, l, { overview: !0 }); d(o, a.nodes[0]); const g = ya(a, Ye); if (g.length) {
        const v = o.createDiv({ cls: "jwsd-talk-overview-grid" });
        g.forEach(h => d(v, h));
    } const p = ya(a, null); if (p.length) {
        o.createEl("h3", { text: "Sujets flottants", cls: "jwsd-talk-kicker" });
        const v = o.createDiv({ cls: "jwsd-talk-overview-grid" });
        p.forEach(h => d(v, h));
    } }
    addTile(e, a, i, n, o, l) { const d = a.id === Ye, g = Zr(i, a), p = d ? "theme" : a.parent === null ? "floating" : a.parent === Ye ? "part" : "child", v = !l.overview && v2(i, a) && (!!l.renderNote && !!a.note.trim() || a.images.length > 0), h = e.createDiv({ cls: "jwsd-talk-tile is-" + p + (v ? " is-text-only" : "") + (o.has(a.id) ? " is-selected" : ""), attr: { "data-node": a.id, "data-talk-color": g.color } }); !l.overview && a.mapWidth !== void 0 && h.style.setProperty("--talk-node-width", a.mapWidth + "px"); const y = a.mapColor ?? g.mapColor; y && !d && this.paintMapColor(h, y); const B = h.createEl("button", { cls: "jwsd-talk-topic", attr: { type: "button", "aria-label": a.title, "aria-pressed": String(o.has(a.id)) } }); a.parent === Ye && B.createSpan({ cls: "jwsd-talk-number", text: String(ya(i, Ye).indexOf(a) + 1) }), B.createEl("strong", { text: a.title }); const Q = !!this.actions.edit && !l.overview, w = _ => { if (performance.now() < this.skipClickUntil) {
        _.preventDefault();
        return;
    } const le = _.target, be = le.closest("a[href]"); if (be) {
        const ee = la(be.href);
        Q && ee && !_.ctrlKey && !_.metaKey && (_.preventDefault(), this.actions.read({ label: be.textContent?.trim() || ee, url: ee, read: !1 }, be));
        return;
    } const W = _ instanceof PointerEvent && _.pointerType === "touch", K = W && this.lastTap?.id === a.id && performance.now() - this.lastTap.time < 340; this.lastTap = W && !K ? { id: a.id, time: performance.now() } : void 0, this.actions.select(a.id, _.shiftKey || _.ctrlKey || _.metaKey), Q && K && this.editNode(a.id, le.closest(".jwsd-talk-map-note") ? "note" : "title"); }; B.addEventListener("click", w); let f; if (l.renderNote && a.note.trim() && (f = h.createDiv({ cls: "jwsd-talk-map-note jwsd-talk-speaker-notes" }), l.renderNote(f, a.note), f.addEventListener("click", w)), Q && h.addEventListener("dblclick", _ => { const le = _.target; le.closest("a, .jwsd-talk-inline-editor") || !le.closest(".jwsd-talk-topic, .jwsd-talk-map-note") || this.editNode(a.id, le.closest(".jwsd-talk-map-note") ? "note" : "title"); }), !l.overview)
        for (const [_, le] of a.images.entries()) {
            const be = this.actions.source(le);
            if (!be)
                continue;
            const W = le.caption ? "Voir " + le.caption : _ === 0 ? "Voir l’image de " + a.title : "Voir " + le.path.split("/").pop(), K = h.createEl("button", { cls: "jwsd-talk-map-image", attr: { type: "button", "aria-label": W, title: W } }), ee = K.createEl("img", { attr: { src: be, alt: le.caption, draggable: "false", loading: "lazy" } });
            le.mapRatio !== void 0 && (ee.style.aspectRatio = String(le.mapRatio)), K.addEventListener("click", V => { performance.now() < this.skipClickUntil || (Q && !this.selected.has(a.id) ? this.actions.select(a.id, !1) : this.actions.image(le), V.stopPropagation()); });
        } const M = n.slots.get(a.id), D = yc(a), R = this.actions.edit, z = D.filter(_ => _.url).sort((_, le) => Number(le.read) - Number(_.read)), N = l.overview ? z.slice(0, 1) : z, U = ya(i, a.id), O = !!R && !l.overview && U.length > 0 && !d, Z = l.overview && !d ? Rr(i, a.id).length : 0, X = a.images.length && (l.overview || !this.actions.source(a.images[0])); if (M?.seconds || N.length || X || O || Z) {
        const _ = h.createDiv({ cls: "jwsd-talk-tile-foot" });
        M?.seconds && _.createSpan({ text: l.overview ? Na(M.seconds) : Na(M.end), cls: l.overview ? "jwsd-talk-duration" : "jwsd-talk-clock-badge", attr: { title: "Fin à " + Na(M.end) } }), Z && _.createSpan({ text: Z + (Z === 1 ? " point" : " points"), cls: "jwsd-talk-overview-count" });
        for (const le of N) {
            const be = !!l.overview, W = Be(_, "Lire " + le.label, "book-open-text", () => { performance.now() >= this.skipClickUntil && this.actions.read(le, W); }, be ? "is-icon" : "jwsd-talk-map-reference" + (le.read ? " is-to-read" : ""));
            be || (W.lastElementChild.textContent = le.label);
        }
        X && Be(_, "Voir l’image de " + a.title, "image", () => this.actions.image(a.images[0]), "is-icon"), O && Be(_, a.collapsed ? "Déplier " + a.title : "Replier " + a.title, a.collapsed ? "plus" : "minus", () => R.collapse(a.id), "is-icon");
    } this.tiles.set(a.id, h); }
    measureTiles() { return new Map([...this.tiles].map(([e, a]) => [e, { width: a.offsetWidth, height: a.offsetHeight }])); }
    paintMapColor(e, a) { const [i, n, o] = a.slice(1).match(/../g).map(l => { const d = parseInt(l, 16) / 255; return d <= .04045 ? d / 12.92 : ((d + .055) / 1.055) ** 2.4; }); e.style.setProperty("--talk-branch", a), e.style.setProperty("--talk-part-ink", .2126 * i + .7152 * n + .0722 * o > .179 ? "#111111" : "#ffffff"); }
    branchSizes() { return this.measureTiles(); }
    spaceNotes(e) { const a = [...this.tiles].map(([o, l]) => ({ id: o, ...oa(e, o).position, width: l.offsetWidth, height: l.offsetHeight })).sort((o, l) => o.y - l.y || o.x - l.x), i = [], n = 12; for (const { id: o, x: l, y: d, width: g, height: p } of a) {
        let v = d - p / 2;
        for (const h of i)
            Math.abs(l - h.x) >= (g + h.width) / 2 + n || (v = Math.max(v, h.bottom + n));
        this.layoutPositions.set(o, { x: l, y: v + p / 2 }), i.push({ x: l, width: g, bottom: v + p });
    } }
    refresh(e, a, i, n, o) { return this.drag || this.pinch || this.inline ? !1 : (e.empty(), this.render(e, a, i, n, o), !0); }
    focus(e) { this.tiles.get(e)?.querySelector(".jwsd-talk-topic")?.focus({ preventScroll: !0 }); }
    selectNodes(e, a = [...e].at(-1)) { this.selected = e, this.primary = a; for (const [i, n] of this.tiles)
        n.classList.toggle("is-selected", e.has(i)), n.querySelector(".jwsd-talk-topic")?.setAttribute("aria-pressed", String(e.has(i))); this.showWidthHandle(e.size === 1 ? a : void 0), this.renderTopicTools(); }
    renderTopicTools() { const e = this.bubbleTools, a = this.topicTools, i = this.actions.edit; if (!e || !a || !i)
        return; e.empty(), a.empty(), a.hidden = !0, this.inline && (Be(e, "Enregistrer la bulle", "check", () => this.finishEdit(!0), "is-icon is-primary"), Be(e, "Annuler la modification", "x", () => this.finishEdit(!1), "is-icon")); const n = this.primary, o = n && this.tiles.get(n); if (!n || !o || !this.plan || (this.inline || Be(e, "Modifier la bulle", "square-pen", () => this.editNode(n), "is-icon"), this.selected.size !== 1))
        return; const l = oa(this.plan, n); a.dataset.talkColor = o.dataset.talkColor; const d = o.style.getPropertyValue("--talk-branch"); if (d ? a.style.setProperty("--talk-branch", d) : a.style.removeProperty("--talk-branch"), Be(a, "Ajouter un sous-sujet", "corner-down-right", () => i.add(n, !1), "is-icon"), n !== Ye && Be(a, "Ajouter un sujet après", "plus", () => i.add(n, !0), "is-icon"), this.inline) {
        this.paintTopicTools();
        return;
    } const g = o.classList.contains("is-text-only"); g || Be(a, l.note.trim() ? "Modifier le texte" : "Ajouter du texte", "file-pen-line", () => this.editNode(n, "note"), "is-icon"); const p = [{ label: "Largeur par défaut", icon: "rotate-ccw", run: () => i.format(n, { width: void 0 }) }]; if (g && p.unshift({ label: "Modifier le titre", icon: "square-pen", run: () => this.editNode(n, "title") }), n !== Ye) {
        p.unshift({ label: "Couleur de la branche", icon: "palette", run: () => i.colors(n) });
        const v = { left: "arrow-left", right: "arrow-right", up: "arrow-up", down: "arrow-down" };
        for (const h of Object.keys(A0))
            p.push({ label: A0[h], icon: v[h], run: () => i.format(n, { direction: h }) });
        l.mapDirection && p.push({ label: "Direction automatique", icon: "workflow", run: () => i.format(n, { direction: void 0 }) }), p.push({ label: "Supprimer la bulle", icon: "trash-2", danger: !0, run: () => i.remove(n, !1) }), ya(this.plan, n).length && p.push({ label: "Supprimer toute la branche", icon: "trash-2", danger: !0, run: () => i.remove(n, !0) });
    } _r(e, "Format de la bulle", p), this.paintTopicTools(); }
    showWidthHandle(e) { const a = this.viewport; if (!a || !this.actions.edit || (a.querySelector(".jwsd-talk-width-handle")?.remove(), !e || !this.tiles.has(e)))
        return; const i = this.tiles.get(e), n = Be(a, "Redimensionner la bulle", "move-horizontal", () => n.focus({ preventScroll: !0 }), "is-icon jwsd-talk-width-handle"); n.dataset.widthFor = e, n.addEventListener("pointerdown", o => { o.button !== 0 || this.inline || this.drag || this.pinch || this.widthDrag || !this.camera || (o.preventDefault(), o.stopPropagation(), this.widthDrag = { id: e, pointer: o.pointerId, handle: n, tile: i, start: o.clientX, width: i.offsetWidth }, n.setPointerCapture(o.pointerId)); }), n.addEventListener("pointermove", o => { const l = this.widthDrag; if (!l || o.pointerId !== l.pointer || !this.camera)
        return; o.stopPropagation(); const d = mi(Math.round(l.width + 2 * (o.clientX - l.start) / this.camera.scale), tm, im); i.style.setProperty("--talk-node-width", d + "px"), this.paint(); }), n.addEventListener("pointerup", o => { this.widthDrag?.pointer === o.pointerId && this.endWidthDrag(!0); }), n.addEventListener("pointercancel", () => this.endWidthDrag(!1)), n.addEventListener("lostpointercapture", () => this.endWidthDrag(!1)), n.addEventListener("keydown", o => { if (o.key !== "ArrowLeft" && o.key !== "ArrowRight")
        return; o.preventDefault(); const l = o.key === "ArrowLeft" ? -20 : 20; this.actions.edit?.format(e, { width: mi(i.offsetWidth + l, tm, im) }); }), this.paintWidthHandle(); }
    endWidthDrag(e) { const a = this.widthDrag; if (!a)
        return; const i = a.tile.offsetWidth; if (this.widthDrag = void 0, a.handle.hasPointerCapture(a.pointer) && a.handle.releasePointerCapture(a.pointer), e && i !== a.width)
        this.actions.edit?.format(a.id, { width: i });
    else {
        const n = oa(this.plan, a.id)?.mapWidth;
        n === void 0 ? a.tile.style.removeProperty("--talk-node-width") : a.tile.style.setProperty("--talk-node-width", n + "px"), this.paint();
    } }
    paintWidthHandle() { const e = this.viewport?.querySelector(".jwsd-talk-width-handle"); if (!e || !this.camera || !this.viewport)
        return; const a = e.dataset.widthFor, i = this.tiles.get(a); if (!i)
        return; const n = this.position(a), { x: o, y: l, scale: d } = this.camera, g = o + (n.x + i.offsetWidth / 2) * d, p = l + n.y * d; e.hidden = !!this.inline || g < 8 || p < 8 || g > this.viewport.clientWidth - 8 || p > this.viewport.clientHeight - 8, e.style.left = g + "px", e.style.top = p + "px"; }
    screenBox(e) { const a = this.tiles.get(e), i = this.camera; if (!a || !i)
        return; const n = this.position(e); return { x: i.x + n.x * i.scale, y: i.y + n.y * i.scale, halfWidth: a.offsetWidth * i.scale / 2, halfHeight: a.offsetHeight * i.scale / 2 }; }
    paintTopicTools() { const e = this.topicTools, a = this.viewport, i = this.primary && this.screenBox(this.primary); if (!e || !a || !i || !e.childElementCount)
        return; const { x: n, y: o, halfWidth: l, halfHeight: d } = i, { clientWidth: g, clientHeight: p } = a; if (e.hidden = !!(this.drag?.moved || this.pinch) || n + l < 0 || n - l > g || o + d < 0 || o - d > p, e.hidden)
        return; const { offsetWidth: v, offsetHeight: h } = e, y = g <= 480 ? 54 : 6, B = Math.max(y, p - h - 55), Q = mi(n - v / 2, 6, g - v - 6), w = o + d + 6, f = o - d - h - 6, M = mi(o - h / 2, y, B), D = [{ x: Q, y: w }, { x: Q, y: f }, { x: n - l - v - 16, y: M }, { x: n + l + 16, y: M }], R = O => O.x >= 6 && O.x + v <= g - 6 && O.y >= y && O.y <= B, z = [...this.tiles.keys()].filter(O => O !== this.primary).map(O => this.screenBox(O)), U = D.find(O => R(O) && z.every(Z => O.x + v <= Z.x - Z.halfWidth || O.x >= Z.x + Z.halfWidth || O.y + h <= Z.y - Z.halfHeight || O.y >= Z.y + Z.halfHeight)) ?? D.find(R) ?? { x: Q, y: mi(w <= B ? w : f, y, B) }; e.style.left = U.x + "px", e.style.top = U.y + "px"; }
    editNode(e, a, i = !1) { const n = this.plan && oa(this.plan, e), o = this.tiles.get(e), l = this.actions.edit; if (!n || !o || !l || !this.camera || !this.viewport?.clientWidth || !this.viewport.clientHeight)
        return !1; if (a ?? (a = o.classList.contains("is-text-only") ? "note" : "title"), this.inline?.id === e && this.inline.field === a)
        return !0; if (this.inline)
        return this.finishEdit(!0, !0, !1), this.editNode(e, a, i); (this.primary !== e || this.selected.size !== 1) && this.actions.select(e, !1), o.classList.add("is-editing"); const d = a === "title", g = o.querySelector(d ? ".jwsd-talk-topic" : ".jwsd-talk-map-note"), p = o.createDiv({ cls: "jwsd-talk-inline-editor " + (d ? "jwsd-talk-topic" : "jwsd-talk-map-note") }), v = g?.querySelector(".jwsd-talk-number"); d && v && p.append(v.cloneNode(!0)), g ? g.replaceWith(p) : o.firstElementChild?.after(p); const h = p.createEl("textarea", { attr: { rows: "1", "aria-label": d ? "Titre de la bulle" : "Texte de la bulle", placeholder: d ? i ? n.title : "Titre" : "Texte Markdown", ...d ? { enterkeyhint: "done" } : {} } }); h.value = i ? "" : n[a]; const y = p.ownerDocument, B = M => { const D = M.target; !(D instanceof Node) || p.contains(D) || this.bubbleTools?.contains(D) || y.defaultView?.setTimeout(() => { this.inline === f && this.finishEdit(!0, !0, !1); }, 0); }, Q = y.defaultView?.visualViewport, w = () => f.reveal(!1), f = { id: e, field: a, reveal: M => this.revealEditor(e, o, p, h, M), finish: (M, D) => { y.removeEventListener("click", B, !0), Q?.removeEventListener("resize", w), g ? p.replaceWith(g) : p.remove(), o.classList.remove("is-editing"); const R = d ? h.value.replace(/[\r\n]+/g, " ").trim() : h.value, z = M && (!d || R) ? R : void 0; (i || z !== void 0 && z !== n[a]) && l.update(e, a, z, D); } }; return this.inline = f, y.addEventListener("click", B, !0), Q?.addEventListener("resize", w), h.addEventListener("input", () => f.reveal(!0)), h.addEventListener("keydown", M => { if (!M.isComposing) {
        if (d && M.key === "Tab" && !M.shiftKey && !M.altKey && !M.ctrlKey && !M.metaKey) {
            M.preventDefault(), M.stopPropagation(), (!i || h.value.trim()) && l.add(e, !1);
            return;
        }
        (M.key === "Escape" || M.key === "Enter" && (d || M.ctrlKey || M.metaKey)) && (M.preventDefault(), M.stopPropagation(), this.finishEdit(M.key !== "Escape"));
    } }), this.renderTopicTools(), f.reveal(!0), h.focus({ preventScroll: !0 }), d ? h.select() : h.setSelectionRange(h.value.length, h.value.length), !0; }
    revealEditor(e, a, i, n, o) { if (!this.camera || !this.viewport?.clientWidth || !this.viewport.clientHeight)
        return; const { clientWidth: l, clientHeight: d } = this.viewport, { x: g, y: p, scale: v } = this.camera, h = Math.min(Math.max(v, 1), Math.max(1, l - 20) / a.offsetWidth), y = Math.min(l <= 480 ? 54 : 12, d / 5), B = this.viewport.ownerDocument.defaultView?.visualViewport, Q = B && B.height < this.viewport.ownerDocument.documentElement.clientHeight ? B.offsetTop + B.height - this.viewport.getBoundingClientRect().top - 8 : d, w = Math.max(y + 28, Math.min(d - 54, Q)); n.style.maxHeight = Math.max(24, (w - y) / h - 16) + "px", o && (n.style.height = "auto", n.style.height = n.scrollHeight + "px"); const f = this.position(e), M = i.offsetTop + i.offsetHeight / 2 - a.offsetHeight / 2, D = a.offsetWidth * h / 2, R = i.offsetHeight * h / 2, z = mi(g + f.x * v, 10 + D, l - 10 - D), N = mi(p + (f.y + M) * v, y + R, w - R); this.camera = { x: z - f.x * h, y: N - (f.y + M) * h, scale: h }, this.fitted = !1, this.paintCamera(); }
    finishEdit(e, a = !0, i = a) { const n = this.inline; if (!n)
        return !1; if (this.inline = void 0, n.finish(e, a), a) {
        this.renderTopicTools();
        const o = this.tiles.has(n.id) ? n.id : this.primary;
        i && o && !this.tileInView(o) && this.center(o), this.paint();
    } return i && this.focus(this.tiles.has(n.id) ? n.id : this.primary ?? Ye), !0; }
    tileInView(e) { const a = this.screenBox(e), i = this.viewport; if (!a || !i)
        return !1; const { x: n, y: o } = a; return n >= 12 && n <= i.clientWidth - 12 && o >= 12 && o <= i.clientHeight - 12; }
    savePlacement(e) { for (const a of e.nodes) {
        const i = this.layoutPositions.get(a.id);
        i && (a.position = { x: mi(i.x, -15e4, 15e4), y: mi(i.y, -15e4, 15e4) });
    } e.mapLayout = "free"; }
    placeBeside(e, a) { if (!this.plan || !this.viewport)
        return; const i = this.measureTiles(), n = e ? this.position(e) : { x: 0, y: 0 }, o = this.position(Ye), l = e && e !== Ye ? u0(this.plan, oa(this.plan, e)) : "right", d = l === "up" || l === "down", g = l === "left" || l === "up" ? -1 : 1, p = a && i.get(a) || { width: d2.part, height: 70 }, v = e ? i.get(e) : void 0, h = d ? "height" : "width", y = d ? "width" : "height", B = d ? "y" : "x", Q = d ? "x" : "y", w = e ? n[B] + g * (((v?.[h] ?? 286) + p[h]) / 2 + 54) : o.x, f = [...i].flatMap(([D, R]) => { const z = this.position(D); return D !== a && Math.abs(z[B] - w) < (R[h] + p[h]) / 2 + 12 ? [{ top: z[Q] - R[y] / 2, bottom: z[Q] + R[y] / 2 }] : []; }).sort((D, R) => D.top - R.top); let M = e ? n[Q] : o.y + 150; for (const D of f)
        M - p[y] / 2 - 20 < D.bottom && M + p[y] / 2 + 20 > D.top && (M = D.bottom + p[y] / 2 + 20); return d ? { x: mi(M, -15e4, 15e4), y: mi(w, -15e4, 15e4) } : { x: mi(w, -15e4, 15e4), y: mi(M, -15e4, 15e4) }; }
    highlightReading(e, a, i) { if (!this.plan || !this.viewport)
        return; const n = a ? new Set([e, ...Rr(this.plan, e).map(l => l.id)]) : void 0; this.readingPath = n; const o = this.readingContext; if (o.clear(), n) {
        o.add(Ye);
        for (const { from: l, to: d } of this.plan.relations) {
            if (n.has(l) === n.has(d))
                continue;
            const g = n.has(l) ? d : l, p = oa(this.plan, g);
            p && Zr(this.plan, p).parent === null && o.add(g);
        }
    } this.viewport.classList.toggle("is-guided", a); for (const [l, d] of this.tiles) {
        const g = d.querySelector(".jwsd-talk-topic");
        d.classList.toggle("is-selected", l === e), d.classList.toggle("is-reading-path", !!n?.has(l)), d.classList.toggle("is-reading-context", o.has(l)), g.setAttribute("aria-pressed", String(l === e)), l === e ? g.setAttribute("aria-current", "step") : g.removeAttribute("aria-current");
    } a && i ? this.frameBranch(e) : this.paint(); }
    frameBranch(e) { this.tiles.has(e) && (this.readingFrame = e, this.frame(this.readingPath ?? [e], !0)); }
    center(e) { if (!this.tiles.has(e) || !this.camera || !this.viewport)
        return; const a = this.position(e); this.camera.x = this.viewport.clientWidth / 2 - a.x * this.camera.scale, this.camera.y = this.viewport.clientHeight / 2 - a.y * this.camera.scale, this.fitted = !1, this.readingFrame = void 0, this.paintCamera(); }
    fit() { this.readingFrame = void 0, this.frame(this.tiles.keys(), !1); }
    frame(e, a) { if (!this.viewport?.clientWidth || !this.viewport.clientHeight || !this.plan)
        return; const i = [...e].map(f => { const M = this.tiles.get(f), D = this.position(f); return { left: D.x - M.offsetWidth / 2, right: D.x + M.offsetWidth / 2, top: D.y - M.offsetHeight / 2, bottom: D.y + M.offsetHeight / 2 }; }); if (!i.length)
        return; const n = Math.min(...i.map(f => f.left)), o = Math.max(...i.map(f => f.right)), l = Math.min(...i.map(f => f.top)), d = Math.max(...i.map(f => f.bottom)), g = this.viewport.clientWidth, p = this.viewport.clientHeight, v = !!this.actions.edit, h = v ? 46 : Math.min(42, p / 5), y = v ? 54 : Math.min(32, g / 5), B = v && g <= 480 ? 54 : Math.min(24, p / 12), Q = Math.min(24, p / 12), w = mi(Math.min((g - y) / Math.max(1, o - n), (p - h - B - Q) / Math.max(1, d - l)), .001, a ? 1.3 : 1.15); this.camera = { x: g / 2 - (n + o) / 2 * w, y: (p + B - h - Q) / 2 - (l + d) / 2 * w, scale: w }, this.fitted = !a, this.paint(); }
    local(e) { const a = this.viewport.getBoundingClientRect(); return { x: e.clientX - a.left, y: e.clientY - a.top }; }
    pointAt(e) { if (!this.camera || !this.viewport || !(e.target instanceof Node) || !this.viewport.contains(e.target))
        return; const a = this.local(e); return { x: mi((a.x - this.camera.x) / this.camera.scale, -15e4, 15e4), y: mi((a.y - this.camera.y) / this.camera.scale, -15e4, 15e4) }; }
    zoom(e, a) { if (!this.camera || !this.viewport)
        return; const { scale: i, x: n, y: o } = this.camera, l = mi(i * e, .001, 3.5), d = a ?? { x: this.viewport.clientWidth / 2, y: this.viewport.clientHeight / 2 }; this.camera = { scale: l, x: d.x - (d.x - n) * l / i, y: d.y - (d.y - o) * l / i }, this.fitted = !1, this.readingFrame = void 0, this.paintCamera(); }
    position(e) { return this.drag?.positions.get(e) ?? this.layoutPositions.get(e) ?? oa(this.plan, e).position; }
    paintCamera() { if (!this.camera || !this.sheet)
        return; const { x: e, y: a, scale: i } = this.camera; this.sheet.style.transform = "translate(" + e + "px," + a + "px) scale(" + i + ")", this.zoomText && (this.zoomText.textContent = Math.max(1, Math.round(i * 100)) + " %"), this.paintWidthHandle(), this.paintTopicTools(); }
    paint() { if (!this.camera || !this.sheet || !this.lines || !this.plan)
        return; this.paintCamera(); for (const [i, n] of this.tiles) {
        const o = this.position(i);
        n.style.left = o.x + "px", n.style.top = o.y + "px";
    } const e = this.lines.ownerDocument.createDocumentFragment(), a = (i, n, o, l, d) => { const g = this.tiles.get(i), p = this.tiles.get(n); if (!g || !p)
        return; const v = { ...this.position(i) }, h = { ...this.position(n) }, y = oa(this.plan, i), B = l === void 0 && y.mapDirection ? u0(this.plan, y) : void 0, Q = B ? B === "left" || B === "right" : Math.abs(h.x - v.x) >= (g.offsetWidth + p.offsetWidth) * .45, w = this.lines.ownerDocument.createElementNS(Jl, "path"); if (Q) {
        const M = Math.sign(h.x - v.x);
        v.x += M * g.offsetWidth / 2, h.x -= M * p.offsetWidth / 2;
        const D = (v.x + h.x) / 2;
        w.setAttribute("d", "M " + v.x + " " + v.y + " C " + D + " " + v.y + " " + D + " " + h.y + " " + h.x + " " + h.y);
    }
    else {
        const M = Math.sign(h.y - v.y) || 1;
        v.y += M * g.offsetHeight / 2, h.y -= M * p.offsetHeight / 2;
        const D = (v.y + h.y) / 2;
        w.setAttribute("d", "M " + v.x + " " + v.y + " C " + v.x + " " + D + " " + h.x + " " + D + " " + h.x + " " + h.y);
    } w.setAttribute("data-talk-color", o); const f = l === void 0 ? this.readingPath?.has(n) : this.readingPath?.has(i) || this.readingPath?.has(n); if (f && w.classList.add("is-reading-path"), d && w.style.setProperty("--talk-branch", d), l !== void 0 && (w.classList.add("is-relation"), w.setAttribute("marker-end", "url(#" + this.arrowId + ")")), e.append(w), l) {
        const M = this.lines.ownerDocument.createElementNS(Jl, "text");
        M.setAttribute("x", String((v.x + h.x) / 2)), M.setAttribute("y", String((v.y + h.y) / 2 - 7)), M.textContent = l, f && M.classList.add("is-reading-path"), e.append(M);
    } }; for (const i of this.plan.relations)
        a(i.from, i.to, "blue", i.label); for (const i of this.plan.nodes)
        if (i.parent) {
            const n = Zr(this.plan, i);
            a(i.parent, i.id, n.color, void 0, i.mapColor ?? n.mapColor);
        } this.lines.replaceChildren(this.lines.firstElementChild, e); }
    begin(e) { if (!this.plan || !this.camera || !this.viewport || this.inline || this.widthDrag)
        return; const a = e.target, i = e.pointerType === "touch", n = this.local(e); if (i && (this.touches.set(e.pointerId, n), this.touches.size >= 2)) {
        const v = this.camera;
        this.end(!1, !0), this.camera = v, this.paintCamera(), this.startPinch();
        return;
    } if (this.drag || e.button !== 0 || !e.isPrimary)
        return; this.skipClickUntil = 0; const o = a.closest("a, input, textarea, select, button:not(.jwsd-talk-topic, .jwsd-talk-map-image)"); if (o && !i)
        return; const d = a.closest(".jwsd-talk-tile")?.dataset.node, g = this.actions.edit && !o ? d : void 0, p = new Map; if (g) {
        const v = this.selected.has(g) ? [...this.selected] : [g];
        for (const h of v) {
            const y = oa(this.plan, h);
            if (y)
                for (const B of [y, ...Rr(this.plan, h)])
                    p.set(B.id, this.position(B.id));
        }
    } this.drag = { pointer: e.pointerId, start: n, started: performance.now(), camera: { ...this.camera }, source: g, origin: p, positions: new Map, moved: !1 }; }
    touchPair() { const [e, a] = this.touches.values(); if (!(!e || !a))
        return { center: { x: (e.x + a.x) / 2, y: (e.y + a.y) / 2 }, distance: Math.max(1, Math.hypot(a.x - e.x, a.y - e.y)) }; }
    startPinch() { const e = this.touchPair(); if (!(!e || !this.camera || !this.viewport)) {
        this.pinch = { ...e, camera: { ...this.camera } }, this.lastTap = void 0, this.paintTopicTools();
        for (const a of this.touches.keys())
            try {
                this.viewport.setPointerCapture(a);
            }
            catch { }
    } }
    release(e, a) { const i = this.touches.delete(e.pointerId); if (this.pinch) {
        if (!i)
            return;
        this.skipClickUntil = performance.now() + 260, this.touches.size ? this.touches.size >= 2 && this.startPinch() : (this.pinch = void 0, this.paintTopicTools());
        return;
    } this.drag?.pointer === e.pointerId && this.end(a); }
    move(e) { this.touches.has(e.pointerId) && this.touches.set(e.pointerId, this.local(e)); const a = this.pinch; if (a) {
        const d = this.touchPair();
        if (!d)
            return;
        const g = mi(a.camera.scale * d.distance / a.distance, .001, 3.5), p = g / a.camera.scale;
        this.camera = { scale: g, x: d.center.x - (a.center.x - a.camera.x) * p, y: d.center.y - (a.center.y - a.camera.y) * p }, this.fitted = !1, this.readingFrame = void 0, this.paintCamera();
        return;
    } const i = this.drag; if (!i || !this.viewport || i.pointer !== e.pointerId || !this.plan || !this.camera)
        return; const n = this.local(e), o = n.x - i.start.x, l = n.y - i.start.y; if (!(!i.moved && Math.hypot(o, l) < 6)) {
        if (i.moved || (e.pointerType === "touch" && performance.now() - i.started < 280 && (i.source = void 0), i.moved = !0, this.lastTap = void 0, this.viewport.setPointerCapture(e.pointerId), this.viewport.classList.add("is-dragging")), !i.source) {
            this.camera.x = i.camera.x + o, this.camera.y = i.camera.y + l, this.fitted = !1, this.readingFrame = void 0, this.paintCamera();
            return;
        }
        for (const [d, g] of i.origin)
            i.positions.set(d, { x: mi(g.x + o / this.camera.scale, -15e4, 15e4), y: mi(g.y + l / this.camera.scale, -15e4, 15e4) });
        i.drop = this.dropTarget(e, i);
        for (const [d, g] of this.tiles)
            g.classList.toggle("is-moving", i.origin.has(d)), g.classList.toggle("is-drop", i.drop?.target === d && i.drop.type === "attach"), g.classList.toggle("is-before", i.drop?.target === d && i.drop.type === "before"), g.classList.toggle("is-after", i.drop?.target === d && i.drop.type === "after");
        this.status && (this.status.hidden = !i.drop, this.status.textContent = i.drop?.type === "attach" ? "Relâcher pour rattacher" : "Relâcher pour changer l’ordre"), this.paint();
    } }
    dropTarget(e, a) { const i = oa(this.plan, a.source); if (!(i.id === Ye || a.origin.size !== Rr(this.plan, i.id).length + 1))
        for (const [n, o] of [...this.tiles].reverse()) {
            if (a.origin.has(n))
                continue;
            const l = o.getBoundingClientRect();
            if (e.clientX <= l.left + l.width * .14 || e.clientX >= l.right - l.width * .14)
                continue;
            const d = oa(this.plan, n);
            if (n !== Ye && i.parent === d.parent) {
                if (Math.abs(e.clientY - l.top) <= 8)
                    return { type: "before", target: n };
                if (Math.abs(e.clientY - l.bottom) <= 8)
                    return { type: "after", target: n };
            }
            if (n !== i.parent && e.clientY > l.top + 8 && e.clientY < l.bottom - 8)
                return { type: "attach", target: n };
        } }
    cancelDrag() { return this.widthDrag ? (this.endWidthDrag(!1), !0) : this.drag ? (this.end(!1), !0) : !1; }
    end(e, a = !1) { const i = this.drag; if (this.drag = void 0, !(!i?.moved || !this.viewport)) {
        !a && this.viewport.hasPointerCapture(i.pointer) && this.viewport.releasePointerCapture(i.pointer), this.viewport.classList.remove("is-dragging"), this.status && (this.status.hidden = !0);
        for (const n of this.tiles.values())
            n.removeClass("is-moving", "is-drop", "is-before", "is-after");
        if (this.skipClickUntil = performance.now() + 180, e || (this.camera = i.camera), e && i.source) {
            this.fitted = !1;
            const n = new Map([[i.source, i.positions.get(i.source)], ...[...i.positions].filter(([o]) => o !== i.source)]);
            this.actions.edit?.move(n, i.drop);
        }
        else
            this.paint();
    } }
}

/* === jwsdParseSonoPlaylist === */
/* JW Study Desk 0.22.7 - read-only JW Library playlist bridge. */
async function jwsdParseSonoPlaylist(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.byteLength < 100 || bytes.byteLength > 80 * 1024 * 1024)
        throw Error('Playlist trop volumineuse ou vide (80 Mo maximum).');
    // Existing safe ZIP reader rejects traversal, duplicate paths and ZIP64.
    const entries = vS(bytes, name => name === 'manifest.json' || name === 'userData.db');
    if (!entries['manifest.json'] || !entries['userData.db'])
        throw Error('Ce fichier ne contient pas une playlist JW Library valide.');
    let manifest;
    try {
        manifest = JSON.parse(Ts(entries['manifest.json']));
    }
    catch {
        throw Error('Manifeste JW Library illisible.');
    }
    if (manifest?.type !== 1 || manifest?.version !== 1 || manifest?.userDataBackup?.databaseName !== 'userData.db')
        throw Error('Ce fichier n’est pas un export de playlist JW Library reconnu.');
    const dbBytes = entries['userData.db'];
    if (await Nr(dbBytes) !== manifest.userDataBackup?.hash)
        throw Error('Le contenu de la playlist est endommagé (empreinte incorrecte).');
    const db = await Po(dbBytes);
    let result = [];
    try {
        const version = Number(db.exec('PRAGMA user_version')?.[0]?.values?.[0]?.[0]);
        if (!Number.isInteger(version) || version < 14 || version > 16)
            throw Error('Version de playlist JW Library non prise en charge (schéma ' + version + ').');
        result = Di(db, `SELECT p.PlaylistItemId AS id,p.Label AS label,p.ThumbnailFilePath AS thumbnail,
    tm.Position AS position,loc.KeySymbol AS symbol,loc.Track AS track,
    loc.DocumentId AS documentId,media.FilePath AS mediaPath,media.MimeType AS mime
    FROM TagMap tm JOIN Tag tag ON tag.TagId=tm.TagId AND tag.Type=2
    JOIN PlaylistItem p ON p.PlaylistItemId=tm.PlaylistItemId
    LEFT JOIN PlaylistItemLocationMap lm ON lm.PlaylistItemId=p.PlaylistItemId
    LEFT JOIN Location loc ON loc.LocationId=lm.LocationId
    LEFT JOIN PlaylistItemIndependentMediaMap im ON im.PlaylistItemId=p.PlaylistItemId
    LEFT JOIN IndependentMedia media ON media.IndependentMediaId=im.IndependentMediaId
    ORDER BY tm.Position,p.PlaylistItemId`).map(row => ({
            position: Number(row.position), id: Number(row.id), label: String(row.label || 'Sans titre').slice(0, 250),
            thumbnail: typeof row.thumbnail === 'string' ? row.thumbnail : null,
            mediaPath: typeof row.mediaPath === 'string' ? row.mediaPath : null,
            mime: typeof row.mime === 'string' ? row.mime : null,
            type: row.mediaPath ? 'image' : row.symbol === 'sjjm' ? 'song' : row.documentId ? 'video' : 'linked',
            track: row.track === null ? null : Number(row.track),
            documentId: row.documentId === null ? null : Number(row.documentId)
        }));
        if (!result.length || result.length > 500)
            throw Error('Aucun média exploitable dans cette playlist.');
    }
    finally {
        db.close();
    }
    return { name: String(manifest.name || 'Playlist JW Library').slice(0, 200), items: result, bytes };
}

/* === jwsdPlaylistAssets === */
function jwsdPlaylistAssets(parsed) {
    const names = new Set(parsed.items.flatMap(item => [item.thumbnail, item.mediaPath]).filter(Boolean));
    // Extract only referenced images; the ZIP is unmodified.
    const map = vS(parsed.bytes, name => names.has(name));
    return { map, urls: new Map() };
}

/* === jwsdPlaylistObjectUrl === */
function jwsdPlaylistObjectUrl(assets, path, mime) {
    if (!path || !assets.map[path])
        return null;
    if (!assets.urls.has(path))
        assets.urls.set(path, URL.createObjectURL(new Blob([assets.map[path]], {
            type: mime || (path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')
        })));
    return assets.urls.get(path);
}

/* === jwsdDownloadPlaylist === */
function jwsdDownloadPlaylist(bytes, name) {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = /\.jwlplaylist$/i.test(name) ? name : 'Playlist-JW-Library.jwlplaylist';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/* === jwsdFindOfficialSong === */
async function jwsdFindOfficialSong(number) {
    const n = Number(number);
    if (!Number.isInteger(n) || n < 1 || n > 164)
        throw Error('Le numéro du cantique doit être compris entre 1 et 164.');
    if (jwsdSongCache.has(n))
        return jwsdSongCache.get(n);
    const response = await Y.requestUrl({ url: jwsdSongCatalogueUrl, throw: false });
    if (response.status !== 200 || response.text.length > 3000000)
        throw Error('Le catalogue officiel des cantiques n’est pas accessible.');
    const document = new DOMParser().parseFromString(response.text, 'text/html');
    for (const a of document.querySelectorAll('a[href]')) {
        const label = (a.textContent || '').replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim();
        const match = /^(\d{1,3})\s*[.·]\s*(.+)$/.exec(label);
        if (!match || Number(match[1]) !== n)
            continue;
        let url;
        try {
            url = new URL(a.getAttribute('href') || '', jwsdSongCatalogueUrl);
        }
        catch {
            continue;
        }
        if (url.protocol !== 'https:' || url.hostname !== 'www.jw.org' ||
            !decodeURI(url.pathname).startsWith('/fr/bibliothèque/musique-chansons/chantons-joyeusement/'))
            continue;
        const title = match[2].trim().slice(0, 200);
        if (title.length < 3)
            continue;
        const song = { number: n, title, url: url.href };
        jwsdSongCache.set(n, song);
        return song;
    }
    throw Error('Le cantique ' + n + ' n’a pas été trouvé dans le recueil officiel.');
}

/* === C9 === */
class C9 {
    constructor(e, a) { this.app = e, this.actions = a, this.cursor = 0, this.elapsed = 0, this.checkpoints = {}, this.font = 1, this.completed = !1, this.scrollTop = 0, this.layout = "map", this.inlineNotes = !0, this.guided = !0, this.reader = new v9, this.map = new f2({ select: i => this.inspect?.(i), read: (i, n) => this.read?.(i, n), image: i => this.showImage(i), source: i => this.actions.source(i), recenter: () => this.recenter?.() }); }
    time() { const e = this.started === void 0 ? 0 : performance.now() - this.started; return (this.elapsed + e) / 1e3; }
    pause() { this.started !== void 0 && (this.elapsed += performance.now() - this.started), this.started = void 0, clearInterval(this.interval), this.interval = void 0, this.update?.(); }
    reset(e = !1) { this.pause(), this.elapsed = 0, this.cursor = 0, this.checkpoints = {}, this.completed = !1, this.scrollTop = 0, e && (this.map.dispose(!0), this.guided = !1), this.update?.(!0); }
    detach() { this.reader.close(), this.leaveFullscreen?.(!1), this.pause(), this.rendered?.unload(), this.rendered = void 0, this.renderedMapNotes?.unload(), this.renderedMapNotes = void 0, this.map.dispose(), this.update = void 0, this.navigate = void 0, this.inspect = void 0, this.recenter = void 0, this.read = void 0; }
    toggleClock() { if (this.started !== void 0) {
        this.pause();
        return;
    } this.completed || (this.started = performance.now(), this.interval = setInterval(() => this.update?.(), 250), this.update?.()); }
    step(e) { this.navigate?.(e); }
    render(e, a, i, n) {
        const o = !!this.leaveFullscreen;
        this.reader.close(), this.leaveFullscreen?.(!1), this.rendered?.unload(), this.renderedMapNotes?.unload(), this.renderedMapNotes = void 0, this.map.dispose(), this.rendered = new Y.Component, this.rendered.load(), e.empty(), e.addEventListener("keydown", Re => { if (!(Re.defaultPrevented || Re.ctrlKey || Re.metaKey || Re.altKey || Re.shiftKey || !(Re.target instanceof Element))) {
            if (Re.key === "Escape" && this.reader.close(!0)) {
                Re.preventDefault(), Re.stopPropagation();
                return;
            }
            Re.target.closest(".jwsd-talk-reference-reader, input, textarea, select, [contenteditable]") || Re.key !== "ArrowLeft" && Re.key !== "ArrowRight" || (Re.preventDefault(), this.step(Re.key === "ArrowLeft" ? -1 : 1));
        } }), e.addEventListener("click", Re => { if (Re.ctrlKey || Re.metaKey || Re.altKey || Re.shiftKey || !(Re.target instanceof Element))
            return; const Ve = Re.target.closest(".jwsd-talk-speaker-notes a[href]"), ea = Ve && la(Ve.href); !Ve || !ea || (Re.preventDefault(), Re.stopPropagation(), this.read?.({ label: Ve.dataset.biblelabResolvedLabel || Ve.textContent?.trim() || ea, url: ea }, Ve)); }, !0), e.style.setProperty("--talk-font-factor", String(this.font));
        const l = ya(a, Ye), d = l.length ? l : [a.nodes[0]], g = d.map(Re => i.slots.get(Re.id)), p = d.length - 1;
        this.cursor = Math.min(this.cursor, p);
        const v = e.createDiv({ cls: "jwsd-talk-speaker-top" }), h = v.createDiv({ cls: "jwsd-talk-speaker-titlebar" });
        Be(h, "Mes plans", "arrow-left", this.actions.library, "is-icon is-quiet");
        const y = kr(a);
        h.createEl("h2", { text: y, attr: { title: y + " · " + Na(i.total) } }), Be(h, "Carte", "network", () => this.actions.edit("map"), "is-icon is-quiet"), Be(h, "Plan", "list-tree", () => this.actions.edit("plan"), "is-icon is-quiet");
        const resources = Be(h, "Ressources du discours", "list-music", () => this.actions.media?.(), "is-icon is-quiet");
        resources.addClass('jwsd-talk-resource-button');
        resources.setAttribute('title', a.introSong ? "Cantique " + a.introSong.number + " — " + a.introSong.title + " · Médias et sono" : "Cantique · Médias & Sono");
        if (a.introSong) {
            const songPill = h.createSpan({ cls: 'jwsd-speaker-song-pill', text: '♪ ' + a.introSong.number });
            songPill.setAttribute('title', a.introSong.title || 'Cantique du discours');
        }
        const B = Be(h, "Orateur plein écran", "maximize-2", () => this.fullscreen(e, B), "is-icon");
        B.setAttribute("aria-pressed", "false");
        const Q = v.createEl("nav", { cls: "jwsd-talk-views jwsd-talk-speaker-layouts", attr: { "aria-label": "Affichage Orateur" } }), w = y9.map(([Re, Ve, ea]) => [Re, Be(Q, Ve, ea, () => ge(Re))]), f = e.createDiv({ cls: "jwsd-talk-speaker-bar" }), M = f.createDiv({ cls: "jwsd-talk-speaker-clock" });
        M.createSpan({ cls: "jwsd-talk-clock-caption", text: "Temps écoulé" });
        const D = M.createEl("strong", { attr: { "aria-label": "Temps écoulé" } }), R = M.createSpan({ cls: "jwsd-talk-speaker-marker" }), z = R.createSpan(), N = R.createSpan({ cls: "jwsd-talk-speaker-overrun" }), U = f.createDiv({ cls: "jwsd-talk-actions" }), O = Be(U, "Démarrer le chrono", "play", () => this.toggleClock(), "is-primary jwsd-talk-speaker-timer"), Z = a.nodes.some(Re => Re.note.trim()) ? Be(U, "Afficher les notes sur la carte", "align-left", () => { this.inlineNotes = !this.inlineNotes, ge("map"); }, "jwsd-talk-inline-toggle") : void 0;
        Z && (Z.lastElementChild.textContent = "Notes");
        const X = Re => { this.font = Math.max(.85, Math.min(1.6, this.font + Re)), e.style.setProperty("--talk-font-factor", String(this.font)), this.update?.(); }, _ = [{ label: "Réinitialiser le chrono", icon: "rotate-ccw", run: () => this.reset() }, { label: "Agrandir le texte", icon: "zoom-in", run: () => X(.15) }, { label: "Réduire le texte", icon: "zoom-out", run: () => X(-.15) }, { label: "Enregistrer la répétition", icon: "save", run: () => { this.pause(); const Re = Math.floor(this.time()); Re > 0 ? this.actions.record({ date: Date.now(), seconds: Re, checkpoints: { ...this.checkpoints } }) : new Y.Notice("Démarre le chrono pour enregistrer une répétition."); } }];
        a.lastRehearsal && _.push({ label: "Dernière répétition", icon: "history", run: () => { this.leaveFullscreen?.(!1), this.actions.review(a.lastRehearsal); } });
        const le = U.createEl("details"), be = le.createEl("summary", { cls: "jwsd-button is-icon", attr: { "aria-label": "Options Orateur", title: "Options Orateur", role: "button" } });
        Y.setIcon(be, "ellipsis");
        const W = le.createDiv({ cls: "jwsd-talk-speaker-option-items" });
        for (const Re of _)
            Be(W, Re.label, Re.icon, () => { le.open = !1, be.focus({ preventScroll: !0 }), Re.run(); });
        le.addEventListener("focusout", Re => { (!(Re.relatedTarget instanceof Node) || !le.contains(Re.relatedTarget)) && (le.open = !1); }), le.addEventListener("keydown", Re => { Re.key !== "Escape" || !le.open || (Re.preventDefault(), le.open = !1, be.focus({ preventScroll: !0 })); });
        const K = f.createEl("span", { text: "Discours terminé", cls: "jwsd-talk-speaker-done", attr: { role: "status" } }), ee = e.createEl("nav", { cls: "jwsd-talk-speaker-navigation", attr: { "aria-label": "Parcours des branches" } }), V = Be(ee, "Suivre la branche", "route", () => { this.guided = !this.guided, re(this.guided), this.guided || this.map.fit(); }, "jwsd-talk-guide");
        V.lastElementChild.textContent = "Suivre";
        V.setAttribute("aria-pressed", String(this.guided));
        V.title = "Centrer la branche en cours et atténuer les autres";
        const ce = Be(ee, "Précédent", "chevron-left", () => this.step(-1), "is-icon"), pe = ee.createDiv({ cls: "jwsd-talk-speaker-overview" }), qe = l.map((Re, Ve) => { const ea = Re.title + ", fin à " + Na(g[Ve].end), qa = pe.createEl("button", { cls: "jwsd-talk-mark", attr: { type: "button", "data-talk-color": Re.color, "aria-label": ea, title: ea } }); return qa.createSpan({ text: Ve + 1 + " · " + Re.title }), qa.createEl("strong", { text: Na(g[Ve].end) }), Re.mapColor && qa.style.setProperty("--talk-branch", Re.mapColor), qa.addEventListener("click", () => ta(Ve)), qa; }), fe = Be(ee, "Suivant", "chevron-right", () => this.step(1), "is-icon"), G = void 0, ie = e.createDiv({ cls: "jwsd-talk-speaker-stage" }), de = ie.createDiv({ cls: "jwsd-talk-speaker-map" });
        this.read = (Re, Ve) => this.reader.open(ie, Re, Ve);
        let he, je, oe = this.cursor;
        const we = () => { if (!je || this.layout !== "board")
            return; const Re = je.host.getBoundingClientRect(), Ve = je.cards[this.cursor].getBoundingClientRect(); je.host.scrollTop += Ve.top - Re.top - 4, this.scrollTop = je.host.scrollTop, oe = this.cursor; }, re = (Re = !1) => { if (he === void 0 || this.layout === "board")
            return; const Ve = d[this.cursor]; V.setAttribute("aria-pressed", String(this.guided)), this.map.highlightReading(Ve.id, this.guided, Re); };
        this.recenter = () => { this.guided = !1, re(), this.map.fit(); };
        const ge = Re => { this.layout = Re; for (const [ea, qa] of w)
            qa.setAttribute("aria-pressed", String(ea === Re)); const Ve = Re === "map" && !!Z && this.inlineNotes; if (Z && (Z.hidden = Re !== "map", Z.setAttribute("aria-pressed", String(Ve))), V.hidden = Re === "board" || !qe.length, ee.hidden = !qe.length, G && (G.hidden = Re === "board"), de.hidden = Re === "board", Re === "board" && (je ?? (je = this.renderBoard(ie, a, i, n, l, d)), je.cards[this.cursor].setAttribute("aria-current", "step")), je && (je.host.hidden = Re !== "board", Re === "board" && (je.host.scrollTop = this.scrollTop, oe !== this.cursor && we())), Re !== "board" && he !== Ve) {
            he !== void 0 && this.map.dispose(!0), this.renderedMapNotes?.unload();
            const ea = Ve ? new Y.Component : void 0;
            this.renderedMapNotes = ea, ea?.load(), de.empty(), this.map.render(de, a, i, new Set, { renderNote: ea ? (qa, We) => this.renderMarkdown(qa, We, n, ea) : void 0 }), he = Ve;
        } re(!0), Re === "map" && this.showBranchReferences(G, d[this.cursor].id); };
        this.inspect = Re => { const Ve = oa(a, Re); if (!Ve)
            return; const ea = Zr(a, Ve), qa = l.indexOf(ea); qa >= 0 ? ta(qa) : Ve.id === Ye ? this.recenter?.() : this.map.center(Ve.id); };
        let Te = -1, pa = -1, da;
        this.update = (Re = !1) => { const Ve = this.time(), ea = Math.floor(Ve), qa = this.started !== void 0, We = g[this.cursor], Lt = Te !== this.cursor; if (Lt) {
            je?.cards[Te]?.removeAttribute("aria-current"), qe[Te]?.setAttribute("aria-pressed", "false"), Te = this.cursor, je?.cards[Te].setAttribute("aria-current", "step"), qe[Te]?.setAttribute("aria-pressed", "true");
            const ct = qe[Te];
            if (ct) {
                const Ta = pe.getBoundingClientRect(), Za = ct.getBoundingClientRect();
                Za.left < Ta.left ? pe.scrollLeft += Za.left - Ta.left : Za.right > Ta.right && (pe.scrollLeft += Za.right - Ta.right);
            }
        } if (ea !== pa || Lt) {
            const ct = We?.end ?? i.total;
            D.textContent = Na(ea), Lt && (z.textContent = "Repère " + Na(ct)), N.textContent = ea > ct ? " · +" + Na(ea - ct) : "", pa = ea;
        } ce.disabled = this.cursor === 0, fe.disabled = this.completed || !l.length; const vt = this.cursor === p ? "Terminer" : "Suivant"; fe.getAttribute("aria-label") !== vt && (fe.setAttribute("aria-label", vt), fe.title = vt, Y.setIcon(fe.firstElementChild, this.cursor === p ? "check" : "chevron-right")), O.disabled = this.completed; const Pt = qa ? "Mettre le chrono en pause" : ea ? "Reprendre le chrono" : "Démarrer le chrono"; (O.getAttribute("aria-label") !== Pt || da === void 0) && (O.setAttribute("aria-label", Pt), O.title = Pt, O.lastElementChild.textContent = qa ? "Pause" : ea ? "Reprendre" : "Démarrer"), da !== qa && (Y.setIcon(O.firstElementChild, qa ? "pause" : "play"), da = qa), K.hidden = !this.completed, (Lt || Re) && re(Re), Re && we(); };
        const ta = Re => { Re < 0 || Re > p || (Re > this.cursor && this.mark(l[this.cursor]), this.cursor = Re, this.layout === "map" && (this.guided = !0), this.completed = !1, this.update?.(!0), this.layout === "map" && this.showBranchReferences(G, d[this.cursor].id)); };
        this.navigate = Re => { if (!(!l.length || Re > 0 && this.completed)) {
            if (Re > 0 && this.cursor === p) {
                this.mark(l[this.cursor]), this.completed = !0, this.pause();
                return;
            }
            ta(this.cursor + Re);
        } }, this.update(), ge(this.layout), o && this.fullscreen(e, B);
    }
    fullscreen(e, a) { if (this.leaveFullscreen) {
        this.leaveFullscreen(!0);
        return;
    } const i = e.parentElement; if (!i)
        return; const n = i.createEl("dialog", { cls: "jwsd-talk-presenter-fullscreen", attr: { "aria-label": "Orateur en plein écran" } }), o = d => { const g = d ? "Quitter le plein écran Orateur" : "Orateur plein écran"; a.setAttribute("aria-label", g), a.setAttribute("aria-pressed", String(d)), a.title = g, Y.setIcon(a.firstElementChild, d ? "minimize-2" : "maximize-2"); }, l = d => { this.leaveFullscreen === l && (this.leaveFullscreen = void 0, n.open && n.close(), n.parentElement === i && i.insertBefore(e, n), n.remove(), o(!1), d && a.isConnected && a.focus({ preventScroll: !0 })); }; this.leaveFullscreen = l, n.addEventListener("close", () => l(!0), { once: !0 }), n.append(e), n.showModal(), o(!0), a.focus({ preventScroll: !0 }); }
    showImage(e) { this.reader.close(), this.leaveFullscreen?.(!1), this.actions.image(e); }
    referenceIndex(e, a) { const i = new Map; for (const l of a.nodes) {
        const d = Zr(a, l);
        for (const g of yc(l)) {
            if (!g.url)
                continue;
            const p = i.get(d) ?? new Map, v = ks(g);
            (!p.has(v) || g.read) && p.set(v, g), i.set(d, p);
        }
    } if (!i.size)
        return; const n = e.createEl("nav", { cls: "jwsd-talk-speaker-references", attr: { "aria-label": "Références du discours", tabindex: "0" } }), o = [a.nodes[0], ...ya(a, Ye), ...ya(a, null)]; for (const l of o) {
        const d = i.get(l);
        if (!d)
            continue;
        const g = n.createDiv({ cls: "jwsd-talk-speaker-reference-group", attr: { "data-talk-color": l.color } });
        g.dataset.branch = l.id, l.mapColor && g.style.setProperty("--talk-branch", l.mapColor), g.createEl("strong", { text: l.id === Ye ? "Fil conducteur" : l.title });
        for (const p of [...d.values()].sort((v, h) => Number(h.read) - Number(v.read))) {
            const v = Be(g, p.read ? "À lire · " + p.label : p.label, "book-open-text", () => this.read?.(p, v), p.read ? "is-to-read" : "");
            v.lastElementChild.textContent = p.label;
        }
    } return n; }
    showBranchReferences(e, a) { if (!e)
        return; const i = Array.from(e.children).find(n => n.dataset.branch === a); i && (e.scrollLeft += i.getBoundingClientRect().left - e.getBoundingClientRect().left); }
    renderBoard(e, a, i, n, o, l) { const d = e.createDiv({ cls: "jwsd-talk-speaker-board", attr: { "aria-label": "Tableau du discours", role: "region", tabindex: "0" } }), g = d.createDiv({ cls: "jwsd-talk-speaker-track" }), p = (B, Q, w) => { const f = B.createEl("article", { cls: "jwsd-talk-speaker-content", attr: { "data-talk-color": Zr(a, Q).color } }), M = f.createDiv({ cls: "jwsd-talk-speaker-heading" }), D = M.createDiv({ cls: "jwsd-talk-speaker-kicker" }); D.createSpan({ text: Q.id === Ye ? "Fil conducteur" : w === void 0 ? "Sujet flottant" : "Partie " + (w + 1) + " / " + o.length }).createSpan({ text: " · En cours", cls: "jwsd-talk-speaker-current", attr: { "aria-hidden": "true" } }); const z = i.slots.get(Q.id); z && D.createSpan({ text: Na(z.start) + " → " + Na(z.end) }), M.createEl("h2", { text: Q.title }); const N = f.createDiv({ cls: "jwsd-talk-speaker-body" }); return this.write(N, Q, a, i, n, 0, this.rendered), f; }, v = l.map((B, Q) => p(g, B, Q)), h = a.nodes[0], y = ya(a, null); if (o.length && (h.note || h.references.length || h.images.length) && y.unshift(h), y.length) {
        const B = d.createDiv({ cls: "jwsd-talk-speaker-track" });
        y.forEach(Q => p(B, Q));
    } return d.addEventListener("scroll", () => { d.hidden || (this.scrollTop = d.scrollTop); }, { passive: !0 }), { host: d, cards: v }; }
    mark(e) { const a = Math.floor(this.time()); e && a > 0 && !Object.hasOwn(this.checkpoints, e.id) && (this.checkpoints[e.id] = a); }
    renderMarkdown(e, a, i, n) { Y.MarkdownRenderer.render(this.app, a, e, i, n).catch(() => { e.textContent = a; }); }
    write(e, a, i, n, o, l, d) { const g = e.createEl("section", { cls: "jwsd-talk-speaker-point" }); if (l) {
        const v = g.createEl(l === 1 ? "h3" : "h4", { text: a.title }), h = n.slots.get(a.id);
        h?.seconds && v.createSpan({ text: Na(h.end), cls: "jwsd-talk-duration" });
    } if (a.note) {
        const v = g.createDiv({ cls: "jwsd-talk-speaker-notes" });
        this.renderMarkdown(v, a.note, o, d);
    } const p = yc(a); if (p.length || a.images.length) {
        const v = g.createDiv({ cls: "jwsd-talk-actions jwsd-talk-speaker-attachments" });
        for (const h of p) {
            if (h.url) {
                const y = Be(v, (h.read ? "À lire · " : "") + h.label, "book-open-text", () => this.read?.(h, y), h.read ? "is-primary" : "");
            }
            h.excerpt && v.createEl("blockquote", { text: h.excerpt });
        }
        for (const h of a.images) {
            const y = h.caption || h.path.split("/").pop(), B = Be(v, (h.show ? "À montrer · " : "") + y, "image", () => this.showImage(h));
            B.disabled = !this.actions.source(h);
        }
    } if (a.id !== Ye)
        for (const v of ya(i, a.id))
            this.write(g, v, i, n, o, l + 1, d); }
}

/* === Nd === */
const b9 = '.jwsd-talk-studio{container:jwsd-talk / inline-size;min-height:100%;padding:0;background:var(--jwsd-surface);--talk-main: #2851bd;--talk-on-main: #fff;--talk-theme: #233454;--talk-on-theme: #f6f8ff;--jwsd-accent: var(--talk-main);--jwsd-on-accent: var(--talk-on-main)}.theme-dark .jwsd-talk-studio{--talk-main: #abc2ff;--talk-on-main: #192b53;--talk-theme: #dce6ff;--talk-on-theme: #1a2842}:is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=blue]{--talk-branch: #2857bd}:is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=green]{--talk-branch: #22704d}:is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=amber]{--talk-branch: #815710}:is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=violet]{--talk-branch: #6842a3}:is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=teal]{--talk-branch: #146a70}:is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=rose]{--talk-branch: #984067}:is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=indigo]{--talk-branch: #4b51a6}:is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=orange]{--talk-branch: #944719}.theme-dark :is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=blue]{--talk-branch: #a4bfff}.theme-dark :is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=green]{--talk-branch: #87d4ac}.theme-dark :is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=amber]{--talk-branch: #ecc781}.theme-dark :is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=violet]{--talk-branch: #c9a9f8}.theme-dark :is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=teal]{--talk-branch: #82d3d5}.theme-dark :is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=rose]{--talk-branch: #f6a9ca}.theme-dark :is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=indigo]{--talk-branch: #b7baff}.theme-dark :is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color=orange]{--talk-branch: #f6b587}:is(.jwsd-talk-studio,.jwsd-talk-studio-colors) [data-talk-color]{--talk-branch-soft: color-mix(in srgb, var(--talk-branch) 14%, var(--jwsd-surface))}.jwsd-talk-studio :is(h2,h3,h4,p),.jwsd-talk-form h2{margin:0}.jwsd-talk-header,.jwsd-talk-toolbar,.jwsd-talk-filters{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px 16px;padding:14px 20px;border-bottom:1px solid var(--jwsd-border)}.jwsd-talk-heading h2{font-size:clamp(21px,4cqi,29px);font-weight:650;overflow-wrap:anywhere}.jwsd-talk-kicker{color:var(--jwsd-muted);font-size:12px}.jwsd-talk-heading>.jwsd-button{min-height:26px;margin:0 0 3px -7px;padding:1px 6px}.jwsd-talk-toolbar{padding-block:8px}.jwsd-talk-actions,.jwsd-talk-views,.jwsd-talk-target{display:flex;align-items:center;flex-wrap:wrap;gap:5px}.jwsd-talk-views{padding:3px;gap:2px;background:var(--jwsd-bg);border-radius:9px}.jwsd-talk-views .jwsd-button{background:transparent;border-color:transparent;min-height:32px;padding:4px 9px}.jwsd-talk-views .jwsd-button[aria-pressed=true]{background:var(--jwsd-surface);border-color:var(--jwsd-border);color:var(--talk-main)}.jwsd-talk-target{gap:10px;color:var(--jwsd-muted);font-size:11px;font-variant-numeric:tabular-nums}.jwsd-talk-target strong{display:block;color:var(--jwsd-ink);font-size:22px;line-height:1.15}.jwsd-talk-target .jwsd-talk-field input{width:69px;min-height:30px;padding:3px 7px;color:var(--jwsd-ink);font-size:13px}.jwsd-talk-filters{justify-content:flex-start;align-items:end}.jwsd-talk-search{flex:1 1 195px}.jwsd-talk-filters .jwsd-talk-check{min-height:36px}.jwsd-talk-library-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr));gap:12px;padding:18px 20px}.jwsd-talk-library-card{display:grid;align-content:start;gap:9px;border:1px solid var(--jwsd-border);border-radius:12px;padding:13px;box-shadow:var(--jwsd-shadow)}.jwsd-talk-card-heading,.jwsd-talk-card-footer{display:flex;align-items:center;justify-content:space-between;gap:8px}.jwsd-talk-card-actions{display:flex;gap:4px;flex-shrink:0}.jwsd-talk-card-title{min-width:0}.jwsd-talk-card-heading [aria-pressed=true]{color:var(--talk-main)}.jwsd-talk-card-heading [aria-pressed=true] svg{fill:color-mix(in srgb,var(--talk-main) 26%,transparent)}.jwsd-talk-studio .jwsd-talk-card-title{background:transparent;color:var(--jwsd-ink);border:0;padding:0;text-align:start;font-size:16px;font-weight:650;overflow-wrap:anywhere}.jwsd-talk-card-title:hover{text-decoration:underline;text-underline-offset:3px}.jwsd-talk-card-meta,.jwsd-talk-tags{display:flex;flex-wrap:wrap;gap:4px 7px;color:var(--jwsd-muted);font-size:11px}.jwsd-talk-card-meta span+span:before{content:"·";margin-inline-end:7px}.jwsd-talk-card-meta .jwsd-talk-source-updated{color:var(--talk-main);font-weight:650}.jwsd-talk-tags span{border-radius:5px;background:var(--jwsd-bg);padding:2px 6px;overflow-wrap:anywhere}.jwsd-talk-card-footer{padding-top:4px}.jwsd-talk-swatches{display:flex;flex-wrap:wrap;gap:4px}.jwsd-talk-swatches span{width:9px;height:9px;border-radius:50%;background:var(--talk-branch)}.jwsd-talk-empty{grid-column:1 / -1;padding:20px 0;color:var(--jwsd-muted)}.jwsd-talk-catalog-list{display:grid;gap:14px;padding:18px 20px}.jwsd-talk-catalog-group{border:1px solid var(--jwsd-border);border-radius:12px;overflow:hidden}.jwsd-talk-catalog-heading,.jwsd-talk-catalog-row{display:flex;align-items:center;justify-content:space-between;gap:7px 12px;padding:9px 12px}.jwsd-talk-catalog-heading{flex-wrap:wrap;background:var(--jwsd-bg)}.jwsd-talk-catalog-heading h3{font-size:15px;overflow-wrap:anywhere}.jwsd-talk-catalog-heading small,.jwsd-talk-catalog-row small{color:var(--jwsd-muted);font-variant-numeric:tabular-nums}.jwsd-talk-catalog-row{border-top:1px solid var(--jwsd-border)}.jwsd-talk-catalog-row>div{display:grid;gap:2px;min-width:0;overflow-wrap:anywhere}.jwsd-talk-catalog-row .jwsd-button{flex-shrink:0}.jwsd-talk-workbench{display:grid;grid-template-columns:minmax(0,1fr) minmax(238px,275px)}.jwsd-talk-workbench.is-wide{grid-template-columns:minmax(0,1fr)}.jwsd-talk-body{min-width:0}.jwsd-talk-map-shell{position:relative}.jwsd-talk-map{position:relative;height:clamp(420px,68vh,730px);overflow:hidden;isolation:isolate;background:var(--jwsd-surface);touch-action:none;cursor:grab}.jwsd-talk-map.is-dragging,.jwsd-talk-map.is-dragging .jwsd-talk-topic{cursor:grabbing}.jwsd-talk-sheet{position:absolute;inset:0;transform-origin:0 0}.jwsd-talk-edges{position:absolute;inset:0;width:1px;height:1px;overflow:visible;pointer-events:none}.jwsd-talk-edges path{fill:none;stroke:var(--talk-branch);stroke-opacity:.72;stroke-width:2;vector-effect:non-scaling-stroke}.jwsd-talk-edges path.is-relation{stroke:var(--jwsd-muted);stroke-dasharray:4 5;stroke-width:1.5}.jwsd-talk-edges marker path{fill:var(--jwsd-muted);stroke:none}.jwsd-talk-edges text{text-anchor:middle;paint-order:stroke;fill:var(--jwsd-ink);stroke:var(--jwsd-bg);stroke-width:5;font-size:13px;font-weight:600}.jwsd-talk-tile{position:absolute;z-index:1;width:198px;transform:translate(-50%,-50%);border-radius:11px;border:1px solid var(--jwsd-border);border-inline-start:3px solid var(--talk-branch);box-shadow:0 3px 10px color-mix(in srgb,#000 10%,transparent);background:var(--jwsd-surface)}.jwsd-talk-tile.is-child{width:188px}.jwsd-talk-tile.is-theme{background:var(--talk-theme);color:var(--talk-on-theme);border-color:var(--talk-theme)}.jwsd-talk-tile.is-floating{border:1px dashed var(--talk-branch);box-shadow:none}.jwsd-talk-tile.is-selected{z-index:2;outline:2px solid var(--talk-branch, var(--talk-main));outline-offset:2px}.jwsd-talk-tile.is-theme.is-selected{outline-color:var(--talk-main)}.jwsd-talk-tile.is-moving{z-index:3;opacity:.8;pointer-events:none}.jwsd-talk-tile.is-drop{outline:3px dashed var(--talk-main);outline-offset:5px}.jwsd-talk-tile.is-before:before,.jwsd-talk-tile.is-after:after{content:"";position:absolute;inset-inline:0;height:4px;border-radius:2px;background:var(--talk-main)}.jwsd-talk-tile.is-before:before{top:-9px}.jwsd-talk-tile.is-after:after{bottom:-9px}.jwsd-talk-studio .jwsd-talk-topic,.jwsd-talk-studio .jwsd-talk-outline-title{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;border:0;border-radius:9px;padding:8px 9px;color:inherit;background:transparent;text-align:start;user-select:none}.jwsd-talk-studio .jwsd-talk-topic{cursor:grab}.jwsd-talk-topic strong,.jwsd-talk-outline-title strong{font-size:14px;font-weight:630;line-height:1.25;overflow-wrap:anywhere}.jwsd-talk-topic strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.jwsd-talk-tile.is-theme .jwsd-talk-topic{display:grid;justify-items:center;gap:1px;min-height:57px;text-align:center}.jwsd-talk-tile.is-theme .jwsd-talk-topic strong{font-size:16px}.jwsd-talk-tile.is-theme small{text-transform:uppercase;font-size:10px;letter-spacing:.08em}.jwsd-talk-number{display:grid;flex:0 0 25px;height:25px;place-items:center;border-radius:6px;font-size:12px;font-weight:700;color:var(--talk-branch);background:var(--talk-branch-soft)}.jwsd-talk-number svg{width:14px;height:14px}.jwsd-talk-tile-foot{display:flex;justify-content:end;align-items:center;padding:0 6px 5px;gap:3px}.jwsd-talk-tile-foot .jwsd-talk-duration{margin-inline-end:auto;padding-inline-start:3px}.jwsd-talk-tile-foot .jwsd-button.is-icon{width:26px;min-width:26px;min-height:25px;padding:3px;border:0;background:transparent;color:var(--talk-branch)}.jwsd-talk-tile-foot .jwsd-button.is-icon:hover{background:var(--talk-branch-soft)}.jwsd-talk-tile.is-theme .jwsd-talk-tile-foot .jwsd-button.is-icon{color:var(--talk-on-theme)}.jwsd-talk-map .jwsd-talk-tile{width:var(--talk-node-width, 286px);border:0;border-radius:8px;background:color-mix(in srgb,var(--talk-branch) 12%,var(--jwsd-surface));box-shadow:0 1px 4px color-mix(in srgb,#000 11%,transparent)}.jwsd-talk-map .jwsd-talk-tile.is-child{width:var(--talk-node-width, 258px)}.jwsd-talk-map .jwsd-talk-tile.is-floating{width:var(--talk-node-width, 244px);background:var(--jwsd-bg)}.jwsd-talk-map .jwsd-talk-tile.is-theme{width:var(--talk-node-width, 278px);background:var(--talk-theme)}.jwsd-talk-studio .jwsd-talk-map .jwsd-talk-topic{min-height:38px;padding:8px 11px;border-radius:8px;white-space:normal}.jwsd-talk-map .jwsd-talk-topic strong{display:block;overflow:visible;font-size:16px}.jwsd-talk-map .is-theme .jwsd-talk-topic{min-height:76px;padding:12px}.jwsd-talk-map .is-theme .jwsd-talk-topic strong{font-size:22px}.jwsd-talk-map .is-part>.jwsd-talk-topic{background:var(--talk-branch);color:var(--talk-part-ink, var(--jwsd-surface))}.jwsd-talk-map .is-part>.jwsd-talk-topic .jwsd-talk-number{color:inherit;border:1px solid currentColor;border-radius:50%;background:transparent}.jwsd-talk-map .is-text-only>button.jwsd-talk-topic{position:absolute;width:1px;height:1px;min-height:0;padding:0;overflow:hidden;clip-path:inset(50%)}.jwsd-talk-map .is-text-only:focus-within{outline:2px solid var(--talk-branch)}.jwsd-talk-map .jwsd-talk-tile-foot{flex-wrap:wrap;padding:4px 7px 6px}.jwsd-talk-clock-badge{margin-inline-end:auto;padding:3px 7px;border:1.5px dashed var(--talk-branch);border-radius:999px;color:var(--talk-branch);background:var(--jwsd-surface);font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}.jwsd-talk-studio .jwsd-talk-map-image{display:block;width:calc(100% - 12px);height:auto;padding:0;margin:6px;overflow:hidden;border:0;border-radius:5px;background:var(--jwsd-bg)}.jwsd-talk-map-image img{display:block;width:100%;aspect-ratio:16 / 9;object-fit:contain}.jwsd-talk-map .jwsd-talk-tile.is-editing{z-index:5}.jwsd-talk-map .jwsd-talk-inline-editor{box-sizing:border-box;box-shadow:inset 0 0 0 1px color-mix(in srgb,currentColor 32%,transparent)}.jwsd-talk-studio .jwsd-talk-inline-editor textarea{display:block;box-sizing:border-box;width:100%;min-width:0;min-height:1.25em;padding:0;margin:0;border:0;outline:0;box-shadow:none;color:inherit;background:transparent;font-size:inherit;line-height:inherit;resize:none;overflow:auto;overflow-wrap:anywhere;user-select:text}.jwsd-talk-studio .jwsd-talk-inline-editor textarea::placeholder{color:inherit;opacity:.68}.jwsd-talk-map .jwsd-talk-inline-editor.jwsd-talk-topic{font-size:16px;font-weight:630;line-height:1.25}.jwsd-talk-map .is-theme>.jwsd-talk-inline-editor.jwsd-talk-topic{font-size:22px;align-items:center}.jwsd-talk-map .is-theme>.jwsd-talk-inline-editor.jwsd-talk-topic textarea{text-align:center}.jwsd-talk-map .jwsd-talk-inline-editor.jwsd-talk-map-note{font-size:max(16px,calc(15px * var(--talk-font-factor, 1)))}.jwsd-talk-bubble-tools,.jwsd-talk-topic-tools{position:absolute;z-index:5;display:flex;gap:2px;padding:3px;border:1px solid var(--jwsd-border);border-radius:9px;background:var(--jwsd-surface)}.jwsd-talk-bubble-tools{inset:auto auto 9px 9px}.jwsd-talk-topic-tools{box-shadow:0 2px 8px color-mix(in srgb,#000 16%,transparent)}.jwsd-talk-topic-tools[hidden],.jwsd-talk-topic-tools:empty,.jwsd-talk-bubble-tools:empty{display:none}.jwsd-talk-studio :is(.jwsd-talk-bubble-tools,.jwsd-talk-topic-tools) .is-icon{min-width:32px;width:32px;min-height:30px;padding:4px;border-color:transparent}.jwsd-talk-studio .jwsd-talk-topic-tools .is-icon{color:var(--talk-branch)}.jwsd-talk-studio .jwsd-talk-width-handle{position:absolute;z-index:4;width:25px;min-width:25px;height:25px;min-height:25px;padding:3px;transform:translate(-50%,-50%);border-radius:50%;cursor:ew-resize;touch-action:none;color:var(--talk-main);background:var(--jwsd-surface);box-shadow:0 1px 5px color-mix(in srgb,#000 18%,transparent)}.jwsd-talk-studio .jwsd-talk-width-handle[hidden]{display:none}.jwsd-talk-width-handle svg{width:14px;height:14px}@media(pointer:coarse){.jwsd-talk-studio .jwsd-talk-width-handle{width:32px;min-width:32px;height:32px;min-height:32px}}.jwsd-talk-overview{display:grid;align-content:start;gap:14px;min-width:0;max-height:min(60vh,570px);padding:14px;overflow:auto;overscroll-behavior:contain;background:var(--jwsd-bg)}.jwsd-talk-overview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,148px),1fr));gap:9px}.jwsd-talk-overview .jwsd-talk-tile{position:relative;width:auto;min-width:0;transform:none;display:flex;flex-direction:column}.jwsd-talk-overview .jwsd-talk-tile.is-theme{justify-self:center;width:min(100%,460px)}.jwsd-talk-studio .jwsd-talk-overview .jwsd-talk-topic{cursor:pointer;flex:1}.jwsd-talk-overview .jwsd-talk-topic strong{display:block;overflow:visible}.jwsd-talk-overview .jwsd-talk-tile-foot{flex-wrap:wrap}.jwsd-talk-overview .jwsd-talk-topic[aria-current=step] .jwsd-talk-number{background:var(--talk-branch);color:var(--jwsd-surface)}.jwsd-talk-overview-count{color:var(--jwsd-muted);font-size:11px}.jwsd-talk-duration{color:var(--jwsd-muted);font-variant-numeric:tabular-nums;font-size:12px;white-space:nowrap}.jwsd-talk-zoom,.jwsd-talk-drop-hint{position:absolute;z-index:5;border-radius:9px;background:var(--jwsd-surface);border:1px solid var(--jwsd-border)}.jwsd-talk-zoom{inset:auto 9px 9px auto;display:flex;align-items:center;gap:2px;padding:3px}.jwsd-talk-zoom span:not(button span){padding-inline:3px;color:var(--jwsd-muted);font-variant-numeric:tabular-nums}.jwsd-talk-zoom .is-icon{min-width:29px;width:29px;min-height:29px;padding:4px;border-color:transparent}.jwsd-talk-drop-hint{inset:9px 9px auto auto;padding:4px 9px;color:var(--talk-main);pointer-events:none}.jwsd-talk-timeline{padding:11px;border-block:1px solid var(--jwsd-border)}.jwsd-talk-timeline-heading,.jwsd-talk-inspector-heading,.jwsd-talk-section-head,.jwsd-talk-resource{display:flex;justify-content:space-between;align-items:center;gap:5px}.jwsd-talk-timeline-heading{margin-bottom:7px;color:var(--jwsd-muted);font-size:12px}.jwsd-talk-timeline-heading strong{color:var(--jwsd-ink)}.jwsd-talk-marks{display:flex;flex-wrap:wrap;gap:4px}.jwsd-talk-studio .jwsd-talk-mark{display:flex;flex:1 0 88px;align-items:center;justify-content:space-between;gap:4px;min-height:32px;padding:3px 7px;color:var(--talk-branch);background:var(--talk-branch-soft);border:0;border-radius:6px;font-size:11px}.jwsd-talk-mark span{text-align:start;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.jwsd-talk-mark strong{font-variant-numeric:tabular-nums}.jwsd-talk-mark[aria-pressed=true]{box-shadow:inset 0 -2px var(--talk-branch)}.jwsd-talk-inspector{padding:12px;border-inline-start:1px solid var(--jwsd-border);border-bottom:1px solid var(--jwsd-border);display:flex;flex-direction:column;align-items:stretch;gap:10px}.jwsd-talk-inspector-heading strong{color:var(--talk-branch)}.jwsd-talk-branch-points{min-width:0;display:grid;gap:4px}.jwsd-talk-branch-points>strong{color:var(--talk-branch);font-size:13px;overflow-wrap:anywhere}.jwsd-talk-branch-list{position:relative;max-height:172px;overflow:auto;border:1px solid var(--jwsd-border);border-radius:8px;background:var(--jwsd-bg);scrollbar-width:thin}.jwsd-talk-studio .jwsd-talk-branch-list .jwsd-talk-outline-title{min-height:34px;border-radius:0}.jwsd-talk-branch-list .jwsd-talk-outline-title strong{font-size:13px}.jwsd-talk-branch-list .jwsd-talk-outline-title[aria-pressed=true]{background:var(--talk-branch-soft);color:var(--talk-branch)}.jwsd-talk-field{display:grid;gap:3px;min-width:0;color:var(--jwsd-muted);font-size:12px}.jwsd-talk-field input,.jwsd-talk-field textarea,.jwsd-talk-field select{width:100%;min-width:0;font-size:13px;padding:5px 7px}.jwsd-talk-check{display:inline-flex;align-items:center;gap:5px;color:var(--jwsd-muted);font-size:12px}.jwsd-talk-check input[type=checkbox]{width:16px;height:16px;min-height:0;padding:0;margin:0;accent-color:var(--talk-main, var(--jwsd-accent))}.jwsd-talk-inspector-section{display:grid;gap:5px}.jwsd-talk-inspector-section small{color:var(--jwsd-muted)}.jwsd-talk-time-fields{display:grid;grid-template-columns:minmax(0,1fr) 73px;gap:6px}.jwsd-talk-resource>button:first-child{justify-content:flex-start;flex:1 1 auto;text-align:start;overflow-wrap:anywhere}.jwsd-talk-attachment{background:var(--jwsd-bg);padding:5px;border-radius:8px;margin-bottom:4px}.jwsd-talk-attachment>label{margin:4px 3px 1px}.jwsd-talk-studio .jwsd-talk-image-preview{display:flex;align-items:center;gap:6px;border:0;border-radius:6px;padding:3px;background:transparent;color:var(--jwsd-ink);font-size:12px}.jwsd-talk-image-preview img{width:41px;height:33px;border-radius:4px;flex-shrink:0;object-fit:cover}.jwsd-talk-outline{min-height:220px;padding:12px;background:var(--jwsd-bg)}.jwsd-talk-outline h3{margin:13px 0 5px;font-size:13px;color:var(--jwsd-muted)}.jwsd-talk-outline-row{display:flex;justify-content:space-between;align-items:center;gap:2px;border:1px solid var(--jwsd-border);border-inline-start:3px solid var(--talk-branch);background:var(--jwsd-surface);border-radius:8px;margin:4px 0;margin-inline-start:calc(var(--talk-indent) * 12px)}.jwsd-talk-outline-row .jwsd-talk-actions{justify-content:end;flex-wrap:nowrap;gap:2px}.jwsd-talk-outline-row .jwsd-talk-outline-title[aria-pressed=true]{background:var(--talk-branch-soft)}.jwsd-talk-outline-row .is-icon{min-width:27px;width:27px;min-height:29px;padding:4px;border:0}.jwsd-talk-save{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 12px;color:var(--jwsd-muted);font-size:11px}.jwsd-talk-studio .is-error{color:var(--jwsd-error)}.jwsd-talk-form{display:grid;gap:10px}.jwsd-talk-color-picker{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,108px),1fr));gap:6px}.jwsd-talk-color-picker .jwsd-button{justify-content:start;min-height:42px}.jwsd-talk-color-picker .jwsd-button[aria-pressed=true]{border-color:var(--talk-branch);background:var(--talk-branch-soft)}.jwsd-talk-color-picker svg{fill:var(--talk-branch);stroke:var(--talk-branch)}.modal.jwsd-talk-note-modal{width:min(94vw,800px);max-height:90dvh;overflow:auto}.jwsd-talk-note-editor,.jwsd-talk-note-writing{display:grid;gap:8px}.jwsd-talk-note-editor :is(h2,.jwsd-talk-note-topic){margin:0}.jwsd-talk-note-topic{color:var(--jwsd-muted);overflow-wrap:anywhere}.jwsd-talk-note-tabs{justify-self:start}.jwsd-talk-note-editor .jwsd-talk-note-tabs .jwsd-button[aria-pressed=true]{color:var(--jwsd-accent)}.jwsd-talk-note-editor textarea,.jwsd-talk-note-preview{width:100%;min-height:clamp(150px,39dvh,410px);padding:10px 12px;border:1px solid var(--jwsd-border);border-radius:8px;overflow-wrap:anywhere}.jwsd-talk-note-editor textarea{font:15px / 1.6 var(--font-monospace, monospace)}.jwsd-talk-note-preview{max-height:50dvh;overflow:auto;font-size:16px}.jwsd-talk-note-footer{justify-content:end}.jwsd-talk-import-preview{max-height:50vh;overflow:auto;border:1px solid var(--jwsd-border);border-radius:8px;padding:10px}.jwsd-talk-import-preview p{margin:6px 0;white-space:pre-wrap}.jwsd-talk-import-preview small{color:var(--jwsd-muted)}.jwsd-talk-xmind-sheet{display:grid;gap:6px;min-width:0;padding:8px 2px}.jwsd-talk-xmind-sheet+.jwsd-talk-xmind-sheet{border-top:1px solid var(--jwsd-border);margin-top:6px}.jwsd-talk-xmind-include{display:flex;align-items:baseline;gap:8px;overflow-wrap:anywhere}.jwsd-talk-xmind-include input{flex:none;align-self:center}.jwsd-talk-xmind-sheet select{width:100%}.jwsd-talk-xmind-destination{color:var(--jwsd-muted);font-size:13px}.jwsd-talk-outline-import{display:grid;gap:8px;min-width:0}.jwsd-talk-outline-import-fields{gap:8px}.jwsd-talk-outline-import-fields>label{flex:1 1 145px;min-width:0}.jwsd-talk-outline-import-list{max-height:42vh;padding:0 8px}.jwsd-talk-outline-import-row{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;padding:6px 0}.jwsd-talk-outline-import-row+.jwsd-talk-outline-import-row{border-top:1px solid var(--jwsd-border)}.jwsd-talk-outline-import-row label{flex:1 1 135px;min-width:0;overflow-wrap:anywhere;color:var(--jwsd-ink)}.jwsd-talk-outline-import-row input[type=checkbox]{flex:0 0 16px}.jwsd-talk-outline-import-row input[type=number]{width:62px;padding-inline:5px}.jwsd-talk-outline-feedback{color:var(--jwsd-error)}.jwsd-talk-outline-reading{overflow-wrap:anywhere}.jwsd-talk-outline-reading img{max-width:100%;height:auto}.jwsd-talk-outline-drafts summary{color:var(--jwsd-muted);cursor:pointer}.jwsd-talk-outline-drafts .jwsd-button{display:flex;margin-top:5px}.jwsd-talk-image-modal{width:min(94vw,960px)}.jwsd-talk-full-image{max-width:100%;max-height:74vh;object-fit:contain;justify-self:center}.jwsd-talk-studio.is-presenting{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;padding:0}.jwsd-talk-studio.is-canvas-wide{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden}.jwsd-talk-studio.is-canvas-wide>:is(.jwsd-talk-header,.jwsd-talk-toolbar,.jwsd-talk-save){flex:none}.jwsd-talk-studio.is-canvas-wide :is(.jwsd-talk-workbench,.jwsd-talk-body,.jwsd-talk-map-host){flex:1 1 auto;min-height:0}.jwsd-talk-studio.is-canvas-wide :is(.jwsd-talk-workbench,.jwsd-talk-body){display:flex;flex-direction:column}.jwsd-talk-studio.is-canvas-wide :is(.jwsd-talk-map-shell,.jwsd-talk-map){height:100%}.jwsd-talk-studio.is-canvas-wide .jwsd-talk-timeline{flex:none;padding:5px 9px}.jwsd-talk-studio.is-canvas-wide .jwsd-talk-marks{flex-wrap:nowrap;overflow:auto hidden;scrollbar-width:thin}.jwsd-talk-studio.is-canvas-wide .jwsd-talk-mark{flex-basis:min(22ch,60%)}.jwsd-talk-speaker{display:flex;flex:1 1 0;flex-direction:column;gap:5px;min-height:0;min-width:0;padding:5px 8px;background:var(--jwsd-bg)}.jwsd-talk-speaker-top{display:flex;flex:none;align-items:center;flex-wrap:wrap;gap:4px 12px}.jwsd-talk-speaker-titlebar{display:flex;flex:1 1 235px;align-items:center;gap:3px;min-width:0}.jwsd-talk-speaker-titlebar h2{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.jwsd-talk-speaker-titlebar .jwsd-button{flex:none}.jwsd-talk-speaker-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:5px 10px;flex:none}.jwsd-talk-speaker-clock{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 8px;color:var(--jwsd-muted);font-size:12px;font-variant-numeric:tabular-nums}.jwsd-talk-speaker-clock strong{font-size:25px;min-width:4.6ch;color:var(--jwsd-ink)}.jwsd-talk-speaker-marker{display:inline-flex;align-items:baseline;white-space:pre}.jwsd-talk-speaker-overrun{min-width:8ch;color:var(--jwsd-error);font-weight:650}.jwsd-talk-speaker-done{color:var(--jwsd-muted);font-size:12px}.jwsd-talk-speaker-bar{position:relative}.jwsd-talk-speaker-bar summary{list-style:none}.jwsd-talk-speaker-bar summary::-webkit-details-marker{display:none}.jwsd-talk-speaker-option-items{position:absolute;z-index:8;inset:calc(100% + 4px) 0 auto auto;display:grid;gap:4px;width:max-content;max-width:100%;box-sizing:border-box;padding:5px;border:1px solid var(--jwsd-border);border-radius:9px;background:var(--jwsd-surface);box-shadow:var(--jwsd-overlay-shadow)}.jwsd-talk-speaker-option-items .jwsd-button{justify-content:start;min-width:0;text-align:start}.jwsd-talk-speaker>[hidden],.jwsd-talk-speaker-stage>[hidden],.jwsd-talk-speaker-navigation>[hidden]{display:none}.jwsd-talk-speaker .jwsd-talk-inline-toggle[hidden]{display:none}.jwsd-talk-speaker .jwsd-talk-inline-toggle[aria-pressed=true]{color:var(--talk-main);border-color:var(--talk-main);background:color-mix(in srgb,var(--talk-main) 8%,var(--jwsd-surface))}.jwsd-talk-speaker-layouts{align-self:flex-start;flex:none;max-width:100%}.jwsd-talk-speaker-references{display:flex;align-items:center;gap:5px;flex:none;min-width:0;overflow:auto hidden;overscroll-behavior-inline:contain;scrollbar-width:thin}.jwsd-talk-speaker-reference-group{display:flex;flex:none;align-items:center;gap:4px;white-space:nowrap;padding:2px 4px 2px 6px;border-radius:7px;border-inline-start:3px solid var(--talk-branch);background:var(--talk-branch-soft)}.jwsd-talk-speaker-reference-group>strong{color:var(--talk-branch);font-size:12px}.jwsd-talk-speaker-reference-group .jwsd-button{min-height:28px;padding:3px 6px;text-align:start;white-space:nowrap}.jwsd-talk-speaker-reference-group .is-to-read{color:var(--talk-branch);border-color:var(--talk-branch);font-weight:650}.jwsd-talk-speaker-stage{display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:6px;flex:1 1 auto;min-width:0;min-height:0}.jwsd-talk-speaker-stage.has-reader{grid-template-columns:minmax(0,1fr) clamp(250px,36%,460px)}.jwsd-talk-speaker-stage>:is(.jwsd-talk-speaker-map,.jwsd-talk-speaker-board){grid-area:1 / 1}.jwsd-talk-speaker-stage>.jwsd-talk-reference-reader{grid-area:1 / 2}.jwsd-talk-speaker-map{min-height:0;min-width:0;border:1px solid var(--jwsd-border);border-radius:10px;overflow:hidden}.jwsd-talk-speaker-map .jwsd-talk-map-shell,.jwsd-talk-speaker-map .jwsd-talk-map.is-reading{height:100%}.jwsd-talk-speaker-map .jwsd-talk-overview{height:100%;max-height:none;align-content:safe center}.jwsd-talk-map.is-reading:not(.is-dragging) .jwsd-talk-topic{cursor:pointer}.jwsd-talk-map.is-reading .jwsd-talk-topic strong{font-size:16px}.jwsd-talk-map.is-reading .is-theme .jwsd-talk-topic strong{font-size:22px}.jwsd-talk-map.is-reading .jwsd-talk-topic[aria-current=step]{box-shadow:inset 0 0 0 2px currentColor}.jwsd-talk-map.is-reading .is-theme .jwsd-talk-topic[aria-current=step]{color:var(--talk-on-theme)}.jwsd-talk-map.is-reading .jwsd-talk-topic[aria-current=step] .jwsd-talk-number{color:var(--jwsd-surface);background:var(--talk-branch)}.jwsd-talk-map.is-guided .jwsd-talk-tile:not(.is-reading-path,.is-reading-context){opacity:.42}.jwsd-talk-map.is-guided .jwsd-talk-tile:is(:hover,:focus-within){opacity:1}.jwsd-talk-map.is-guided .jwsd-talk-edges>:is(path,text):not(.is-reading-path){opacity:.22}.jwsd-talk-map.is-guided .jwsd-talk-edges>path.is-reading-path{stroke-opacity:1;stroke-width:3.2}.jwsd-talk-map.is-guided .jwsd-talk-edges>path.is-relation.is-reading-path{stroke:var(--talk-main);stroke-width:2.2}.jwsd-talk-map.is-reading .jwsd-talk-tile-foot{min-width:0}.jwsd-talk-map.is-reading .is-theme .jwsd-talk-tile-foot .jwsd-talk-duration{color:var(--talk-on-theme)}.jwsd-talk-map .jwsd-talk-map-reference{min-width:0;min-height:24px;padding:2px 5px;gap:3px;border:0;border-radius:5px;color:var(--talk-branch);background:var(--talk-branch-soft);font-size:12px}.jwsd-talk-map .jwsd-talk-map-reference.is-to-read{box-shadow:inset 0 0 0 1px var(--talk-branch);font-weight:700}.jwsd-talk-map-reference span:last-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.jwsd-talk-map-reference svg{width:12px;height:12px}.jwsd-talk-map-note{margin:0;padding:8px 11px;border-radius:6px;color:var(--jwsd-ink);background:color-mix(in srgb,var(--talk-branch) 5%,transparent);font-size:calc(15px * var(--talk-font-factor, 1));line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere;cursor:text}.jwsd-talk-map .is-theme>.jwsd-talk-map-note{color:var(--talk-on-theme)}.jwsd-talk-map:not(.is-reading) .jwsd-talk-map-note{cursor:grab;user-select:none}.jwsd-talk-map-note :is(p,ul,ol,blockquote,pre){margin-block:0 .4em}.jwsd-talk-map-note>:last-child{margin-bottom:0}.jwsd-talk-map-note :is(ul,ol){padding-inline-start:1.25em}.jwsd-talk-map-note :is(h1,h2,h3,h4,h5,h6){font-size:1em}.jwsd-talk-map-note pre{white-space:pre-wrap}.jwsd-talk-speaker-board{flex:1 1 auto;min-height:0;min-width:0;overflow:auto;overscroll-behavior:contain;overflow-anchor:none}.jwsd-talk-speaker-navigation{display:flex;align-items:stretch;flex:none;gap:4px;min-width:0}.jwsd-talk-studio .jwsd-talk-speaker-navigation>.jwsd-button{flex-shrink:0}.jwsd-talk-studio .jwsd-talk-guide[aria-pressed=true]{color:var(--talk-on-main);background:var(--talk-main);border-color:var(--talk-main)}.jwsd-talk-speaker-overview{display:flex;gap:4px;overflow:auto hidden;scrollbar-width:thin;flex:1;min-width:0}.jwsd-talk-studio .jwsd-talk-speaker-overview .jwsd-talk-mark{flex:1 0 min(19ch,100%);min-width:0;font-size:12px}.jwsd-talk-speaker-overview .jwsd-talk-mark:focus-visible{outline-offset:-3px}.jwsd-talk-speaker-overview .jwsd-talk-mark[aria-pressed=true]{color:var(--jwsd-ink);box-shadow:inset 0 0 0 2px var(--talk-branch);font-weight:650}.jwsd-talk-speaker-track{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,235px),1fr));align-items:start;gap:8px;padding:3px 4px 12px;width:100%}.jwsd-talk-speaker-content{min-width:0;min-height:124px;border:1px solid var(--jwsd-border);border-top:4px solid var(--talk-branch);border-radius:11px;background:var(--jwsd-surface);overflow-wrap:anywhere;font-size:calc(15px * var(--talk-font-factor, 1));line-height:1.47}.jwsd-talk-speaker-content[aria-current=step]{border-color:var(--talk-branch);box-shadow:0 0 0 2px var(--talk-branch-soft)}.jwsd-talk-speaker-heading{position:sticky;top:0;z-index:1;padding:7px 10px;border-radius:7px 7px 0 0;background:var(--talk-branch-soft)}.jwsd-talk-speaker-content h2{font-size:calc(19px * var(--talk-font-factor, 1));line-height:1.2}.jwsd-talk-speaker-kicker{display:flex;flex-wrap:wrap;justify-content:space-between;gap:3px 8px;color:var(--talk-branch);font-size:11px;font-weight:650;font-variant-numeric:tabular-nums;margin-bottom:3px}.jwsd-talk-speaker-current{display:none}.jwsd-talk-speaker-content[aria-current=step] .jwsd-talk-speaker-current{display:inline}.jwsd-talk-speaker-body{padding:8px 10px 10px}.jwsd-talk-speaker-point>.jwsd-talk-speaker-point{border-inline-start:2px solid var(--talk-branch);border-radius:5px;background:var(--jwsd-bg);padding:7px 9px;margin-top:8px}.jwsd-talk-speaker-point .jwsd-talk-speaker-point .jwsd-talk-speaker-point{padding-inline:0;border:0}.jwsd-talk-speaker-content :is(h3,h4){display:flex;align-items:baseline;flex-wrap:wrap;gap:3px 8px;font-size:1em}.jwsd-talk-speaker-notes :is(img,video){max-width:100%;height:auto}.jwsd-talk-speaker-attachments{margin-top:6px}.jwsd-talk-speaker-attachments blockquote{flex:0 1 100%;font-size:.9em;margin:3px 0}.jwsd-talk-presenter-fullscreen,.jwsd-talk-reader-fullscreen{position:fixed;max-width:none;max-height:none;margin:0;padding:0;border:0;color:var(--jwsd-ink);background:var(--jwsd-surface);overflow:hidden}.jwsd-talk-presenter-fullscreen,.jwsd-talk-reader-fullscreen{inset:0;width:100%;height:100%;container:jwsd-talk / inline-size;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}.jwsd-talk-presenter-fullscreen[open],.jwsd-talk-reader-fullscreen[open]{display:flex;flex-direction:column}.jwsd-talk-reference-reader{display:flex;flex:1;flex-direction:column;min-width:0;min-height:0;overflow:hidden;border:1px solid var(--jwsd-border);border-radius:10px;color:var(--jwsd-ink);background:var(--jwsd-surface);container-type:inline-size}.jwsd-talk-reader-fullscreen .jwsd-talk-reference-reader{border:0;border-radius:0}.jwsd-talk-reader-header{display:grid;flex:none;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:4px;padding:5px clamp(8px,2cqi,20px);border-bottom:1px solid var(--jwsd-border)}.jwsd-talk-reader-header h2{font-size:clamp(16px,4cqi,26px);line-height:1.2;overflow-wrap:anywhere}.jwsd-talk-reader-header .jwsd-button{border-color:transparent}.jwsd-talk-reader-scroll{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain}.jwsd-talk-reader-body{width:min(100%,980px);margin-inline:auto;padding:clamp(12px,4cqi,48px);font-size:clamp(17px,5cqi,21px)}.jwsd-talk-reader-fullscreen .jwsd-talk-reader-body{font-size:clamp(21px,2.9vw,29px)}.jwsd-talk-reader-passage.is-scripture{font-size:clamp(21px,6.2cqi,29px);line-height:1.48;text-wrap:pretty}.jwsd-talk-reader-fullscreen .jwsd-talk-reader-passage.is-scripture{font-size:clamp(31px,4.4vw,56px)}.jwsd-talk-reader-body :is(img,video){max-width:100%;height:auto}.jwsd-talk-studio .jwsd-talk-reader-body :is(p,blockquote,h3,h4){margin:0 0 .75em}.jwsd-talk-reader-body :is(p,blockquote){overflow-wrap:anywhere}.jwsd-talk-reader-verse-number{color:var(--talk-main);font-size:.62em;font-weight:700}.jwsd-talk-reader-notice,.jwsd-talk-reader-extras{color:var(--jwsd-muted);font-size:14px}.jwsd-talk-reader-extras summary{cursor:pointer}@container jwsd-talk (max-width: 620px){.jwsd-talk-speaker-content{min-height:0}.jwsd-talk-speaker-stage.has-reader{grid-template-columns:minmax(0,1fr);grid-template-rows:minmax(0,3fr) minmax(0,2fr)}.jwsd-talk-speaker-stage>.jwsd-talk-reference-reader{grid-area:2 / 1}.jwsd-talk-speaker-layouts .jwsd-button{padding-inline:6px}}@container jwsd-talk (max-width: 730px){.jwsd-talk-workbench{grid-template-columns:minmax(0,1fr)}.jwsd-talk-inspector{border-inline-start:0}}@container jwsd-talk (max-width: 550px){.is-canvas-wide .jwsd-talk-header{flex-wrap:nowrap;gap:5px;padding:6px 8px}.is-canvas-wide .jwsd-talk-heading{display:grid;flex:1;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:1px 4px;min-width:0}.is-canvas-wide .jwsd-talk-heading>.jwsd-button{grid-row:span 2;min-width:36px;width:36px;margin:0;padding:5px}.is-canvas-wide .jwsd-talk-project-title{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-size:15px;line-height:1.22}.is-canvas-wide .jwsd-talk-heading .jwsd-talk-kicker{grid-column:2;font-size:10px}.is-canvas-wide .jwsd-talk-header>.jwsd-talk-actions,.is-canvas-wide .jwsd-talk-target{flex-wrap:nowrap;gap:4px}.is-canvas-wide .jwsd-talk-header>.jwsd-talk-actions,.is-canvas-wide .jwsd-talk-target>*{flex:none}.is-canvas-wide .jwsd-talk-target span{font-size:10px;white-space:nowrap}.is-canvas-wide .jwsd-talk-target strong{font-size:16px}.is-canvas-wide .jwsd-talk-target .jwsd-talk-field input{width:56px;padding-inline:4px}.is-canvas-wide .jwsd-talk-toolbar{gap:3px 6px;padding:4px 8px}.is-canvas-wide .jwsd-talk-toolbar>.jwsd-talk-actions{gap:3px}.is-canvas-wide .jwsd-talk-toolbar>.jwsd-talk-actions .jwsd-button{min-width:36px;width:36px;padding:4px}.is-canvas-wide :is(.jwsd-talk-heading,.jwsd-talk-toolbar>.jwsd-talk-actions) .jwsd-button>span:last-child{display:none}}@container jwsd-talk (max-width: 330px){.is-canvas-wide .jwsd-talk-header{flex-wrap:wrap}.is-canvas-wide .jwsd-talk-heading{flex-basis:100%}}@container jwsd-talk (max-width: 480px){.jwsd-talk-header,.jwsd-talk-toolbar,.jwsd-talk-filters,.jwsd-talk-library-list,.jwsd-talk-catalog-list{padding-inline:10px}.jwsd-talk-speaker{padding-inline:6px}.jwsd-talk-speaker-titlebar h2{font-size:15px}.jwsd-talk-speaker-bar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px}.jwsd-talk-speaker-done{grid-column:1 / -1}.jwsd-talk-speaker-clock{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:3px;font-size:11px}.jwsd-talk-speaker-clock strong{font-size:21px}.jwsd-talk-clock-caption{display:none}.jwsd-talk-speaker-marker{flex-wrap:wrap;line-height:1.25}.jwsd-talk-speaker-overrun{min-width:6ch}.jwsd-talk-speaker-bar>.jwsd-talk-actions{gap:3px}.jwsd-talk-speaker-bar :is(.jwsd-talk-speaker-timer,.jwsd-talk-inline-toggle){width:36px;padding-inline:5px}.jwsd-talk-speaker-bar :is(.jwsd-talk-speaker-timer,.jwsd-talk-inline-toggle)>span:last-child{display:none}.jwsd-talk-speaker-reference-group>strong{max-width:13ch;overflow:hidden;text-overflow:ellipsis}.jwsd-talk-speaker-navigation .jwsd-talk-guide{padding-inline:7px;gap:4px}.jwsd-talk-studio .jwsd-talk-speaker-overview .jwsd-talk-mark{font-size:11px}.jwsd-talk-map{height:360px}.jwsd-talk-map-shell:has(.jwsd-talk-bubble-tools) .jwsd-talk-zoom{inset:9px 9px auto auto}.jwsd-talk-studio .jwsd-talk-mark{flex-basis:43%}.jwsd-talk-toolbar>.jwsd-talk-actions{gap:3px}.jwsd-talk-toolbar>.jwsd-talk-actions .is-icon{min-width:33px;width:33px;padding-inline:5px}.jwsd-talk-toolbar>.jwsd-talk-actions .jwsd-button:not(.is-icon){padding-inline:7px}.jwsd-talk-outline{padding:8px}.jwsd-talk-outline-row{margin-inline-start:calc(var(--talk-indent) * 6px)}.jwsd-talk-outline-row .jwsd-talk-duration{white-space:normal;text-align:end}}@container jwsd-talk (min-width: 340px) and (max-width: 480px){.jwsd-talk-speaker-top{flex-wrap:nowrap;gap:5px}.jwsd-talk-speaker-titlebar{flex-basis:0}.jwsd-talk-speaker-titlebar h2{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-height:1.2;white-space:normal}.jwsd-talk-speaker-layouts .jwsd-button{width:33px;padding-inline:4px}.jwsd-talk-speaker-layouts .jwsd-button>span:last-child{display:none}}@container jwsd-talk (max-width: 305px){.jwsd-talk-guide>span:last-child{display:none}}@media(pointer:coarse){.jwsd-talk-studio .jwsd-button,.jwsd-talk-studio .jwsd-talk-mark{min-height:42px}.jwsd-talk-studio .jwsd-talk-views .jwsd-button{min-height:40px}.jwsd-talk-studio .jwsd-talk-zoom .is-icon{min-width:38px;width:38px;min-height:39px}.jwsd-talk-studio :is(.jwsd-talk-bubble-tools,.jwsd-talk-topic-tools) .is-icon{min-width:42px;width:42px;min-height:42px}.jwsd-talk-studio .jwsd-talk-tile-foot .is-icon{min-height:35px;min-width:34px}.jwsd-talk-speaker-reference-group .jwsd-button{min-height:32px}.jwsd-talk-map.is-reading .jwsd-talk-tile-foot .jwsd-button{min-height:25px}.jwsd-talk-studio .jwsd-talk-field :is(input,textarea,select),.jwsd-talk-form .jwsd-talk-field :is(input,textarea,select){font-size:16px}.jwsd-talk-note-editor textarea{font-size:16px}.jwsd-talk-note-editor .jwsd-button.is-icon{min-width:40px;min-height:40px}.jwsd-talk-studio .jwsd-talk-branch-list .jwsd-talk-outline-title{min-height:42px}}', Nd = "jwsd-atelier-discours", B9 = b9, lQ = [["map", "Carte", "network"], ["plan", "Plan", "list-tree"], ["speaker", "Orateur", "presentation"]], Iv = { mine: ["Mes plans", "folder-open"], catalog: ["Catalogue JWPub", "library-big"], archives: ["Archives", "archive"] }, jA = t => Object.entries(t), fd = t => t.trim().replace(/[\r\n]+/g, " ");

/* === cQ === */
class cQ extends Y.ItemView {
    constructor(e, a, i) { super(e), this.store = a, this.actions = i, this.active = !1, this.mode = "map", this.selected = new Set([Ye]), this.primary = Ye, this.undo = [], this.redo = [], this.saveError = "", this.serial = 0, this.cards = [], this.loading = !1, this.librarySerial = 0, this.query = "", this.libraryTab = "mine", this.catalog = Kd(), this.catalogError = "", this.catalogQuery = "", this.catalogKind = "all", this.xmindBusy = !1, this.kind = "all", this.filter = "active", this.sort = "recent", this.favorites = !1, this.detailsOpen = !0, this.mapOverview = !1, this.openLibrary = () => { this.libraryTab = "mine", this.run(this.show()); }, this.keyboard = n => { if (!this.plan)
        return; const o = n.target; if (n.key === "Escape" && this.map.cancelDrag()) {
        n.preventDefault();
        return;
    } if (o.matches('input, textarea, select, [contenteditable="true"]') || this.mode === "speaker")
        return; if ((n.ctrlKey || n.metaKey) && n.key.toLowerCase() === "z") {
        n.preventDefault(), n.shiftKey ? this.history(this.redo, this.undo) : this.history(this.undo, this.redo);
        return;
    } const l = o.closest(".jwsd-talk-tile"); if (!l || !o.classList.contains("jwsd-talk-topic"))
        return; const d = oa(this.plan, l.dataset.node); !d || n.isComposing || n.ctrlKey || n.metaKey || n.altKey || n.shiftKey || ((n.key === "F2" || n.key === " ") && this.map.editNode(d.id) && n.preventDefault(), n.key === "Delete" && d.id !== Ye && this.selected.size === 1 && this.selected.has(d.id) && (n.preventDefault(), this.deleteBubble(d.id, !1)), n.key === "Tab" && (n.preventDefault(), this.addBeside(d.id, !1, !0)), n.key === "Enter" && d.id !== Ye && (n.preventDefault(), this.addBeside(d.id, !0, !0))); }, this.paste = n => { if (!this.plan || this.mode === "speaker")
        return; const o = [...n.clipboardData?.files ?? []].filter(l => l.type.startsWith("image/")); o.length && (n.preventDefault(), this.run(this.attachFiles(this.primary, o))); }, this.dragover = n => { this.plan && this.mode !== "speaker" && n.dataTransfer?.types.includes("Files") && n.preventDefault(); }, this.drop = n => { if (!this.plan || this.mode === "speaker" || !n.dataTransfer?.files.length)
        return; n.preventDefault(); const o = n.target.closest("[data-node]"), l = !o && this.map.pointAt(n); this.run(this.attachFiles(o?.dataset.node ?? (l ? null : this.primary), [...n.dataTransfer.files], l || void 0)); }, this.map = new f2({ select: (n, o) => this.select(n, o, !0), read: n => this.actions.read(n), image: n => this.showImage(n), source: n => this.imageUrl(n), edit: { floating: n => this.add(null, n, void 0, !0), move: (n, o) => this.moveOnMap(n, o), collapse: n => this.toggleCollapse(n), update: (n, o, l, d) => this.updateBubble(n, o, l, d), add: (n, o) => this.addBeside(n, o, !0), format: (n, o) => this.formatBubble(n, o), colors: n => this.chooseBranchColor(n), remove: (n, o) => this.deleteBubble(n, o) } }), this.speaker = new C9(this.app, { library: this.openLibrary, media: () => { this.speaker.leaveFullscreen?.(!1); this.openPlaylistMedia(); }, song: () => { this.speaker.leaveFullscreen?.(!1); this.openIntroSong(); }, edit: n => this.switchMode(n), image: n => this.showImage(n), source: n => this.imageUrl(n), record: n => this.change(o => { o.lastRehearsal = n; }), review: n => this.reviewRehearsal(n) }); }
    getViewType() { return Nd; }
    getDisplayText() { return "Atelier discours"; }
    getIcon() { return "network"; }
    getState() { return this.session ? { path: this.session.file.path, mode: this.mode } : {}; }
    async setState(e, a) { const i = e, n = typeof i?.path == "string" ? i.path : void 0, o = lQ.find(([l]) => l === i?.mode)?.[0] ?? "map"; this.active ? await this.show(n, o) : this.requestedState = { path: n, mode: o }; }
    async onOpen() { this.active = !0, this.contentEl.addClass("jwsd-talk-studio"), ew(this.contentEl), this.contentEl.addEventListener("keydown", this.keyboard), this.contentEl.addEventListener("paste", this.paste), this.contentEl.addEventListener("dragover", this.dragover), this.contentEl.addEventListener("drop", this.drop), this.registerEvent(this.app.metadataCache.on("changed", () => this.queueLibrary())), this.registerEvent(this.app.vault.on("delete", () => this.queueLibrary())); const e = i => { i.path === this.store.outlineCatalogPath() && this.queueLibrary(); }; this.registerEvent(this.app.vault.on("create", e)), this.registerEvent(this.app.vault.on("modify", e)), this.registerEvent(this.app.vault.on("rename", (i, n) => { if (this.queueLibrary(), !this.plan)
        return; const o = d => d === n || d.startsWith(n + "/") ? i.path + d.slice(n.length) : d; (this.plan.source && o(this.plan.source) !== this.plan.source || this.plan.nodes.some(d => d.images.some(g => o(g.path) !== g.path))) && this.change(d => { d.source && (d.source = o(d.source)); for (const g of d.nodes)
        for (const p of g.images)
            p.path = o(p.path); }); })); const a = this.requestedState; this.requestedState = void 0, await this.show(a?.path, a?.mode); }
    async onClose() { if (this.map.finishEdit(!0, !1), this.active = !1, this.serial++, this.librarySerial++, this.speaker.detach(), this.map.dispose(!0), this.mapMarkdown?.unload(), this.mapMarkdown = void 0, clearTimeout(this.libraryTimer), clearTimeout(this.resourceTimer), this.contentEl.removeEventListener("keydown", this.keyboard), this.contentEl.removeEventListener("paste", this.paste), this.contentEl.removeEventListener("dragover", this.dragover), this.contentEl.removeEventListener("drop", this.drop), !await this.flush() && this.plan)
        try {
            const e = Ds(this.plan);
            e.nodes[0].title += " - Récupération", await this.store.createPlan(e), new Y.Notice("Tes modifications ont été conservées dans une copie de récupération.");
        }
        catch {
            new Y.Notice("Le coffre n’a pas pu enregistrer les dernières modifications du discours.");
        } this.contentEl.empty(); }
    async show(e, a = "map") { const i = ++this.serial; if (this.map.finishEdit(!0, !1), !await this.flush() || i !== this.serial || !this.active)
        return; if (e && this.session?.file.path === e) {
        this.switchMode(a);
        return;
    } const n = e && this.store.file(e); let o; if (n)
        try {
            o = await this.store.open(n);
        }
        catch {
            new Y.Notice("Cette carte ne peut pas être lue. Ouvre sa note depuis la bibliothèque.");
        } if (i !== this.serial || !this.active)
        return; this.speaker.detach(), this.speaker.reset(!0), this.map.dispose(!0), this.session = o, this.plan = o?.saved, this.mapOverview = !1, this.detailsOpen = !this.plan?.outline || a === "plan", this.mode = a, this.undo.length = this.redo.length = 0, this.editGroup = void 0; const l = this.plan && ya(this.plan, Ye)[0], d = this.plan?.outline && l && !l.note && !l.images.length ? Rr(this.plan, l.id).find(g => g.note.trim() || g.images.length) : void 0; this.primary = d?.id ?? l?.id ?? Ye, this.selected = new Set([this.primary]), this.saveError = "", this.loading = !o, this.render(), this.app.workspace.requestSaveLayout(), o || await this.loadLibrary(); }
    queueLibrary() { !this.active || this.session || (clearTimeout(this.libraryTimer), this.libraryTimer = setTimeout(() => this.run(this.loadLibrary()), 180)); }
    async loadLibrary() { const e = ++this.librarySerial, [a, i] = await Promise.all([this.store.cards(), this.store.outlines().then(n => ({ data: n, error: "" }), () => ({ data: Kd(), error: "Le catalogue JWPub ne peut pas être lu." }))]); e !== this.librarySerial || !this.active || this.session || (this.cards = a, this.catalog = i.data, this.catalogError = i.error, this.loading = !1, this.libraryResults?.()); }
    run(e) { e.catch(a => new Y.Notice(a instanceof Error ? a.message : "Action impossible.")); }
    flush() { return clearTimeout(this.saveTimer), this.saving || (this.saving = this.persist().finally(() => { this.saving = void 0; })), this.saving; }
    async persist() { let e = this.topicDraft?.previous ?? this.plan; for (; this.session && e && this.session.saved !== e;) {
        try {
            await this.store.save(this.session, e), this.saveError = "";
        }
        catch (a) {
            return this.saveError = a instanceof Error ? a.message : "Enregistrement impossible.", this.renderSaveState(), !1;
        }
        this.renderSaveState(), e = this.topicDraft?.previous ?? this.plan;
    } return !0; }
    queueSave() { clearTimeout(this.saveTimer), this.renderSaveState(), this.saveTimer = setTimeout(() => this.run(this.flush()), 340); }
    change(e, a = !0, i) { if (!this.plan)
        return; const n = this.map.finishEdit(!0, !1), o = Ds(this.plan); try {
        e(o);
    }
    catch (l) {
        new Y.Notice(l instanceof Error ? l.message : "Modification impossible."), n && this.render();
        return;
    } if (JSON.stringify(o) === JSON.stringify(this.plan)) {
        n && this.render();
        return;
    } this.commit(o, a, i); }
    commit(e, a, i) { (!i || this.editGroup !== i) && (this.undo.push(this.plan), this.undo.length > 60 && this.undo.shift()), this.editGroup = i, this.redo.length = 0, this.plan = e, this.checkSelection(), a ? this.render() : this.syncHistory(), this.queueSave(); }
    history(e, a) { const i = this.map.finishEdit(!0, !1); if (!this.plan || !e.length) {
        i && this.render();
        return;
    } a.push(this.plan), this.plan = e.pop(), this.editGroup = void 0, this.checkSelection(), this.render(), this.queueSave(); }
    checkSelection() { this.plan && (oa(this.plan, this.primary) || (this.primary = Ye), this.selected = new Set([...this.selected].filter(e => oa(this.plan, e))), this.selected.add(this.primary)); }
    renderSaveState() { const e = this.contentEl.querySelector(".jwsd-talk-save"); if (!(!e || !this.session))
        if (e.hidden = this.mode === "speaker" && !this.saveError, e.empty(), this.saveError)
            e.createSpan({ cls: "is-error", text: this.saveError, attr: { role: "alert" } }), Be(e, "Réessayer", "refresh-cw", () => this.run(this.flush())), Be(e, "Enregistrer une copie", "copy", () => this.run(this.saveCopy()));
        else {
            const a = this.topicDraft?.previous ?? this.plan;
            e.createSpan({ text: a === this.session.saved ? "Enregistré" : "Enregistrement…", attr: { role: "status" } });
        } }
    async saveCopy() { this.map.finishEdit(!0); const e = this.plan; if (!e)
        return; const a = Ds(e); a.nodes[0].title += " - Copie"; const i = await this.store.createPlan(a); if (this.plan !== e) {
        new Y.Notice("Copie enregistrée. Des modifications plus récentes sont ouvertes.");
        return;
    } this.session = await this.store.open(i), this.plan = this.session.saved, this.undo.length = this.redo.length = 0, this.editGroup = void 0, this.saveError = "", this.app.workspace.requestSaveLayout(), this.render(); }
    switchMode(e) { e !== this.mode && (this.map.finishEdit(!0, !1), e !== "speaker" && this.speaker.detach(), e === "plan" && (this.detailsOpen = !0), this.mode = e, this.render(), this.app.workspace.requestSaveLayout()); }
    select(e, a = !1, i = !1) { if (this.map.finishEdit(!0), a && this.selected.has(e) && this.selected.size > 1 ? (this.selected.delete(e), this.primary = [...this.selected].at(-1)) : (a || this.selected.clear(), this.selected.add(e), this.primary = e), this.mode === "map" && this.mapHost && !this.mapOverview && this.plan) {
        this.map.selectNodes(this.selected, this.primary);
        const n = this.contentEl.querySelector(".jwsd-talk-inspector"), o = n?.parentElement;
        o && (n.remove(), this.renderInspector(o, this.plan, Lo(this.plan)));
        for (const l of this.contentEl.querySelectorAll("[data-talk-mark]"))
            l.setAttribute("aria-pressed", String(l.dataset.talkMark === this.primary));
        i && this.map.focus(e);
        return;
    } if (this.detailsOpen = !0, this.render(), i)
        if (this.mapOverview && this.contentEl.clientWidth <= 730) {
            const n = this.contentEl.querySelector(".jwsd-talk-inspector");
            n?.scrollIntoView({ block: "start" }), n?.focus({ preventScroll: !0 });
        }
        else
            this.map.focus(e); }
    add(e, a, i, n = !1) { const o = this.map.finishEdit(!0, !1); if (!this.plan)
        return; const l = this.mode === "map" && !this.mapOverview && (n || !this.detailsOpen), d = Ds(this.plan); let g; try {
        a && this.map.savePlacement(d);
        const v = a ?? (d.mapLayout === "free" ? this.map.placeBeside(e) : void 0);
        g = qs(d, e, e === Ye ? "Nouvelle partie" : e ? "Nouveau sous-sujet" : "Nouvelle idée", v, i);
    }
    catch (v) {
        new Y.Notice(v instanceof Error ? v.message : "Ajout impossible."), o && this.render();
        return;
    } if (l && (this.topicDraft = { id: g.id, previous: this.plan, primary: this.primary, selected: this.selected }), this.primary = g.id, this.selected = new Set([g.id]), l) {
        if (this.plan = d, this.render(), this.map.editNode(g.id, "title", !0))
            return;
        this.updateBubble(g.id, "title", g.title, !0);
    }
    else
        this.detailsOpen = !0, this.commit(d, !0); this.map.center(this.primary); const p = this.contentEl.querySelector('.jwsd-talk-inspector input[aria-label="Titre du point"]'); p?.focus(), p?.select(); }
    addBeside(e, a, i = !1) { const n = this.map.finishEdit(!0, !1), o = this.plan && oa(this.plan, e); if (!o || !this.plan) {
        n && this.render();
        return;
    } if (!a || e === Ye) {
        this.add(e, void 0, void 0, i);
        return;
    } const l = ya(this.plan, o.parent); this.add(o.parent, void 0, l[l.indexOf(o) + 1]?.id, i); }
    updateBubble(e, a, i, n) { const o = this.topicDraft; if (o?.id === e && this.plan) {
        const l = this.plan;
        this.topicDraft = void 0, this.plan = o.previous, i === void 0 ? (this.primary = o.primary, this.selected = o.selected, n && this.render()) : (oa(l, e)[a] = i, this.commit(l, n));
        return;
    } i !== void 0 && this.change(l => { const d = oa(l, e); d && (a === "title" ? d.mapText = !1 : v2(l, d) && (d.mapText = !0), d[a] = i); }, n); }
    formatBubble(e, a) { this.map.finishEdit(!0, !1), this.change(i => { const n = oa(i, e); if (!n)
        return; if ("width" in a) {
        a.width === void 0 ? delete n.mapWidth : n.mapWidth = a.width;
        return;
    } const o = !C2(i); if (a.direction === void 0 ? delete n.mapDirection : n.mapDirection = a.direction, !o)
        return; i.mapLayout = "free"; const l = this.map.branchSizes(), d = n.position; for (const [g, p] of YS(i, l, n)) {
        const v = oa(i, g);
        v.position = { x: Math.max(-15e4, Math.min(15e4, d.x + p.x)), y: Math.max(-15e4, Math.min(15e4, d.y + p.y)) };
    } }), this.map.focus(e); }
    moveOnMap(e, a) { const i = e.keys().next().value; this.change(n => { this.map.savePlacement(n); const o = oa(n, i), l = a && oa(n, a.target); if (a?.type === "attach" && l) {
        const d = o.position, g = this.map.placeBeside(l.id, i) ?? rm(n, l.id);
        if (Qd(n, i, l.id))
            for (const p of e.keys()) {
                const v = oa(n, p);
                v.position = { x: v.position.x + g.x - d.x, y: v.position.y + g.y - d.y };
            }
    }
    else if (l && a) {
        const d = ya(n, o.parent).filter(p => p.id !== i), g = a.type === "before" ? l.id : d[d.indexOf(l) + 1]?.id;
        Qd(n, i, o.parent, g);
    }
    else
        for (const [d, g] of e)
            oa(n, d).position = g; this.selected.has(i) || (this.selected = new Set([i])), this.primary = i; }), this.map.focus(i); }
    toggleCollapse(e) { this.change(a => { const i = oa(a, e); i.collapsed = !i.collapsed, i.collapsed && Rr(a, e).some(n => this.selected.has(n.id)) && (this.selected = new Set([e]), this.primary = e); }); }
    setBranchColor(e, a) { this.change(i => { const n = oa(i, e); if (!n || e === Ye)
        return; const o = Zr(i, n); o.color = a; for (const l of [o, ...Rr(i, o.id)])
        delete l.mapColor; }); }
    chooseBranchColor(e) { const a = this.plan && oa(this.plan, e); if (!this.plan || !a || e === Ye)
        return; const i = Zr(this.plan, a), n = this.modal("Couleur de la branche"); n.modalEl.addClass("jwsd-talk-studio-colors"), n.contentEl.createEl("p", { text: i.title }); const o = n.contentEl.createDiv({ cls: "jwsd-talk-color-picker" }); for (const l of Td) {
        const d = Be(o, eQ[l], "circle", () => { this.setBranchColor(i.id, l), n.close(), this.contentEl.querySelector('[aria-label="Format de la bulle"]')?.focus({ preventScroll: !0 }); });
        d.dataset.talkColor = l, d.setAttribute("aria-pressed", String(!i.mapColor && i.color === l));
    } }
    deleteBubble(e, a) { this.change(i => { const n = oa(i, e); if (!n || e === Ye)
        return; const o = ya(i, n.parent), l = o.indexOf(n), d = a ? void 0 : ya(i, e)[0]; a ? LS(i, e) : DS(i, e), this.primary = d?.id ?? o[l + 1]?.id ?? o[l - 1]?.id ?? n.parent ?? Ye, this.selected = new Set([this.primary]); }), this.map.focus(this.primary); }
    order(e, a) { this.change(i => { const n = oa(i, e), o = ya(i, n.parent), l = o.indexOf(n); o[l + a] && Qd(i, e, n.parent, o[l + (a < 0 ? -1 : 2)]?.id); }); }
    render() { if (!this.active)
        return; this.map.finishEdit(!0, !1); const e = wm(this.contentEl); clearTimeout(this.resourceTimer), this.map.dispose(), this.mapMarkdown?.unload(), this.mapMarkdown = void 0, this.mapHost = void 0, this.libraryResults = void 0, this.contentEl.classList.toggle("is-presenting", this.mode === "speaker" && !!this.session), this.contentEl.classList.toggle("is-canvas-wide", this.mode === "map" && !!this.session && !this.mapOverview && !this.detailsOpen), this.contentEl.empty(), !this.session || !this.plan ? this.renderLibrary() : this.renderProject(this.plan, this.session), e(); }
    renderLibrary() { const e = this.contentEl.createDiv({ cls: "jwsd-talk-header" }), a = e.createDiv({ cls: "jwsd-talk-heading" }); a.createSpan({ text: "Atelier discours", cls: "jwsd-talk-kicker" }), a.createEl("h2", { text: Iv[this.libraryTab][0] }); const i = e.createDiv({ cls: "jwsd-talk-actions" }); if (this.libraryTab === "catalog") {
        const p = i.createEl("input", { cls: "jwsd-talk-outline-file", attr: { type: "file", accept: ".jwpub", hidden: "" } });
        Be(i, "Importer un JWPub", "file-input", () => p.click(), "is-primary"), p.addEventListener("change", () => { const v = p.files?.[0]; p.value = "", v && this.run(this.openOutlineImport(v)); });
    }
    else if (this.libraryTab === "mine") {
        const p = i.createEl("input", { cls: "jwsd-talk-xmind-file", attr: { type: "file", accept: ".xmind", hidden: "" } }), v = Be(i, "Importer un Xmind", "network", () => p.click());
        v.disabled = this.xmindBusy, p.addEventListener("change", () => { const h = p.files?.[0]; p.value = "", h && !this.xmindBusy && this.run(this.openXmindImport(h)); }), Be(i, "Depuis une note", "file-input", () => this.pickNote()), Be(i, "Nouveau discours", "plus", this.actions.create, "is-primary");
    } const o = this.contentEl.createDiv({ cls: "jwsd-talk-toolbar" }).createEl("nav", { cls: "jwsd-talk-views", attr: { "aria-label": "Plans de discours" } }); for (const p of Object.keys(Iv)) {
        const [v, h] = Iv[p];
        Be(o, v, h, () => { this.libraryTab !== p && (this.libraryTab = p, this.render()); }).setAttribute("aria-pressed", String(this.libraryTab === p));
    } if (this.libraryTab === "catalog") {
        this.renderOutlineLibrary();
        return;
    } const l = this.contentEl.createDiv({ cls: "jwsd-talk-filters" }), d = l.createEl("input", { cls: "jwsd-talk-search", attr: { type: "search", placeholder: "Titre ou étiquette", "aria-label": "Rechercher un plan" } }); d.value = this.query, d.addEventListener("input", () => { this.query = d.value, this.libraryResults?.(); }), xn(l, "Type de plan", [["all", "Tous les types"], ...jA(Ac)], this.kind, p => { this.kind = p, this.libraryResults?.(); }), this.libraryTab === "mine" && xn(l, "État", [["active", "En préparation et prêts"], ["all", "Tous les états"], ...jA(Iu)], this.filter, p => { this.filter = p, this.libraryResults?.(); }), xn(l, "Trier par", [["recent", "Dernière modification"], ["title", "Titre"], ["duration", "Durée"]], this.sort, p => { this.sort = p, this.libraryResults?.(); }), wd(l, "Favoris", this.favorites, p => { this.favorites = p, this.libraryResults?.(); }); const g = this.contentEl.createDiv({ cls: "jwsd-talk-library-list" }); this.libraryResults = () => this.drawCards(g), this.libraryResults(); }
    drawCards(e) { if (e.empty(), this.loading) {
        e.createEl("p", { cls: "jwsd-talk-empty", text: "Chargement des plans…" });
        return;
    } const a = Qa(this.query), i = this.libraryTab === "archives" ? "archived" : this.filter, n = this.cards.filter(({ file: l, plan: d }) => { const g = d?.status ?? "draft"; if ((i === "active" ? g === "archived" : i !== "all" && g !== i) || this.kind !== "all" && this.kind !== d?.kind || this.favorites && !d?.favorite)
        return !1; const p = Qa(d ? tc(d) + " " + d.tags.join(" ") : l.basename); return !a || a.split(/\s+/).every(v => p.includes(v)); }), o = ({ file: l, plan: d }) => d ? kr(d) : l.basename; if (n.sort((l, d) => +!!d.plan?.favorite - +!!l.plan?.favorite || (this.sort === "title" ? o(l).localeCompare(o(d), "fr", { numeric: !0 }) : this.sort === "duration" ? (l.plan?.target ?? 0) - (d.plan?.target ?? 0) : d.file.stat.mtime - l.file.stat.mtime)), !n.length) {
        const l = this.libraryTab === "archives" && !this.cards.some(d => d.plan?.status === "archived") ? "Aucun plan archivé." : this.cards.length ? "Aucun plan ne correspond à ces filtres." : "Crée un discours ou importe un plan.";
        e.createEl("p", { cls: "jwsd-talk-empty", text: l });
        return;
    } for (const { file: l, plan: d, broken: g } of n) {
        const p = e.createEl("article", { cls: "jwsd-talk-library-card" }), v = p.createDiv({ cls: "jwsd-talk-card-heading" }), h = d ? tc(d) : l.basename;
        if (v.createEl("button", { text: h, cls: "jwsd-talk-card-title", attr: { type: "button", "aria-label": "Ouvrir " + h } }).addEventListener("click", () => this.run(d ? this.show(l.path) : g ? this.openNote(l) : this.previewNote(l))), d) {
            const D = v.createDiv({ cls: "jwsd-talk-card-actions" });
            Be(D, d.favorite ? "Retirer des favoris " + h : "Ajouter aux favoris " + h, "star", () => this.run(this.favorite(l)), "is-icon").setAttribute("aria-pressed", String(d.favorite));
            const z = d.status === "archived";
            _r(D, "Options du plan " + h, [{ label: z ? "Restaurer le plan" : "Archiver le plan", icon: z ? "archive-restore" : "archive", run: () => this.run(this.setArchived(l, !z)) }, { label: "Supprimer le plan", icon: "trash-2", danger: !0, run: () => this.run(this.confirmTrash(l)) }]);
        }
        const B = p.createDiv({ cls: "jwsd-talk-card-meta" });
        (d ? [Ac[d.kind], Na(d.target), Iu[d.status]] : [g ? "Carte illisible" : "Plan Markdown"]).forEach(D => B.createSpan({ text: D }));
        const w = d?.outline, f = w && g0(this.catalog, w);
        if (f && (f.template.revision !== w.revision || f.template.number !== w.number) && B.createSpan({ text: "Modèle mis à jour", cls: "jwsd-talk-source-updated" }), d?.tags.length) {
            const D = p.createDiv({ cls: "jwsd-talk-tags" });
            d.tags.forEach(R => D.createSpan({ text: R }));
        }
        d?.xmind && B.createSpan({ text: "Xmind", attr: { title: d.xmind.filename } });
        const M = p.createDiv({ cls: "jwsd-talk-card-footer" });
        if (d) {
            const D = M.createDiv({ cls: "jwsd-talk-swatches", attr: { "aria-hidden": "true" } });
            ya(d, Ye).slice(0, 8).forEach(R => D.createSpan({ attr: { "data-talk-color": R.color } })), Be(M, "Présenter", "presentation", () => this.run(this.show(l.path, "speaker")), "is-primary").setAttribute("aria-label", "Présenter " + h);
        }
        else
            Be(M, g ? "Ouvrir la note" : "Reprendre dans l’atelier", g ? "file-text" : "file-input", () => this.run(g ? this.openNote(l) : this.previewNote(l)));
    } }
    renderOutlineLibrary() { const e = this.contentEl.createDiv({ cls: "jwsd-talk-filters" }), a = e.createEl("input", { cls: "jwsd-talk-search", attr: { type: "search", placeholder: "Numéro ou titre", "aria-label": "Rechercher un modèle de discours" } }); a.value = this.catalogQuery, a.addEventListener("input", () => { this.catalogQuery = a.value, this.libraryResults?.(); }), xn(e, "Type de recueil", [["all", "Tous les recueils"], ...jA(kd)], this.catalogKind, n => { this.catalogKind = n, this.libraryResults?.(); }); const i = this.contentEl.createDiv({ cls: "jwsd-talk-catalog-list" }); this.libraryResults = () => { if (i.empty(), this.loading || this.catalogError || !this.catalog.collections.length) {
        i.createEl("p", { cls: "jwsd-talk-empty", text: this.loading ? "Chargement du catalogue…" : this.catalogError || "Importe un recueil numéroté ou un discours spécial au format JWPub." });
        return;
    } const n = Qa(this.catalogQuery.normalize("NFKC")), o = /^(?:n(?:o|°)\.?\s*)?(\d{1,3})$/i.exec(n)?.[1]; for (const l of this.catalog.collections) {
        if (this.catalogKind !== "all" && l.kind !== this.catalogKind)
            continue;
        const d = l.entries.filter(v => o !== void 0 ? v.number === Number(o) : !n || n.split(/\s+/).every(h => Qa(DA(v) + " " + l.publication.title).includes(h))).sort((v, h) => (v.number ?? 1 / 0) - (h.number ?? 1 / 0) || v.title.localeCompare(h.title, "fr"));
        if (!d.length)
            continue;
        const g = i.createEl("section", { cls: "jwsd-talk-catalog-group" }), p = g.createDiv({ cls: "jwsd-talk-catalog-heading" });
        p.createEl("h3", { text: l.publication.title }), p.createEl("small", { text: kd[l.kind] + " · " + d.length });
        for (const v of d) {
            const h = g.createDiv({ cls: "jwsd-talk-catalog-row" }), y = h.createDiv();
            y.createEl("strong", { text: DA(v) }), v.seconds && y.createEl("small", { text: Na(v.seconds) }), Be(h, "Préparer", "file-pen-line", () => this.previewOutline(l, v)).setAttribute("aria-label", "Préparer " + DA(v));
        }
    } i.childElementCount || i.createEl("p", { cls: "jwsd-talk-empty", text: "Aucun modèle ne correspond à cette recherche." }); }, this.libraryResults(); }
    async openXmindImport(e) { const a = this.modal("Importer un Xmind"); let i = !1; a.onClose = () => { i = !0; }; const n = a.contentEl.createEl("p", { text: "Lecture de " + e.name + "…", attr: { role: "status" } }); try {
        const [o, l, d] = await Promise.all([this.store.readXmind(e), this.store.cards(), this.store.outlines().catch(() => Kd())]);
        if (i || !this.active)
            return;
        const g = l.flatMap(({ file: v, plan: h }) => { if (!h || h.status === "archived")
            return []; const y = kr(h); return [{ label: "Plan · " + tc(h), title: y, number: h.outline?.number ?? h.xmind?.number ?? Sn(y)?.number, destination: { kind: "plan", path: v.path, previous: h } }]; }), p = d.collections.flatMap(v => v.entries.map(h => ({ label: "JWPub · " + DA(h) + " · " + v.publication.title, title: h.title, number: h.number, destination: { kind: "outline", source: { collectionId: v.id, templateId: h.id, revision: h.revision, number: h.number } } })));
        n.remove(), this.renderXmindImport(a, o, [...g, ...p], () => i || !this.active);
    }
    catch (o) {
        if (i)
            return;
        n.isConnected || a.contentEl.append(n), n.setAttribute("role", "alert"), n.textContent = o instanceof Error ? o.message : "Impossible de lire ce fichier Xmind.";
    } }
    renderXmindImport(e, a, i, n) { const o = e.contentEl, l = o.createEl("p", { attr: { role: "status" } }), d = o.createDiv({ cls: "jwsd-talk-import-preview" }), g = a.sheets.map(M => { const D = d.createDiv({ cls: "jwsd-talk-xmind-sheet" }), R = kr(M.plan), z = D.createEl("label", { cls: "jwsd-talk-xmind-include" }), N = z.createEl("input", { attr: { type: "checkbox" } }); N.checked = !0, z.createEl("strong", { text: R }), a.sheets.length > 1 && M.label !== R && D.createEl("small", { text: M.label }); const U = M.plan.nodes.length, O = M.images.size, Z = M.missingImages; D.createEl("small", { text: U + (U === 1 ? " sujet" : " sujets") + " · " + O + (O === 1 ? " image" : " images") + (Z ? " · " + Z + (Z === 1 ? " image indisponible" : " images indisponibles") : "") }); const X = i.map(V => ({ option: V, score: A9(M, V.title, V.number) })).sort((V, ce) => ce.score - V.score || V.option.label.localeCompare(ce.option.label, "fr", { numeric: !0 })), _ = D.createEl("label", { cls: "jwsd-talk-field" }); _.createSpan({ text: "Destination" }); const le = _.createEl("select", { attr: { "aria-label": "Destination pour " + R } }); le.createEl("option", { text: "Créer un plan", attr: { value: "" } }); const be = le.createEl("optgroup", { attr: { label: "Correspondances" } }), W = le.createEl("optgroup", { attr: { label: "Tous les autres plans et modèles" } }); X.forEach(({ option: V, score: ce }, pe) => (ce ? be : W).createEl("option", { text: V.label, attr: { value: String(pe) } })), be.children.length || be.remove(), W.children.length || W.remove(); const K = D.createEl("p", { cls: "jwsd-talk-xmind-destination", attr: { hidden: "" } }), ee = () => le.value === "" ? { kind: "new" } : X[Number(le.value)].option.destination; return le.addEventListener("change", () => { const V = ee(); K.hidden = V.kind === "new", K.textContent = V.kind === "plan" ? "La carte Xmind devient la carte de ce plan. La version précédente est copiée dans Archives." : V.kind === "outline" ? "Une préparation est créée et liée à ce modèle JWPub." : ""; }), { sheet: M, checked: N, choose: le, detail: K, destination: ee, done: !1 }; }), p = o.createEl("p", { cls: "jwsd-talk-outline-feedback", attr: { role: "alert", hidden: "" } }), v = o.createDiv({ cls: "jwsd-talk-actions" }); let h, y = 0, B = 0, Q = 0; const w = Be(v, "Importer les cartes", "file-input", () => this.run((async () => { if (this.xmindBusy)
        return; const M = g.filter(z => z.checked.checked && !z.done); p.hidden = !0; const D = M.flatMap(z => { const N = z.destination(); return N.kind === "plan" ? [N.path] : []; }); if (D.length !== new Set(D).size) {
        p.textContent = "Choisis un plan différent pour chaque feuille.", p.hidden = !1;
        return;
    } this.xmindBusy = !0; const R = this.contentEl.querySelector('[aria-label="Importer un Xmind"]'); R && (R.disabled = !0), w.disabled = !0; for (const z of g)
        z.checked.disabled = !0, z.choose.disabled = !0; try {
        for (const O of M) {
            if (n())
                break;
            l.textContent = "Import de « " + kr(O.sheet.plan) + " »…";
            const Z = await this.store.importXmind(a, O.sheet, O.destination());
            O.done = !0, h = Z.file, y += +!Z.reused, B += Number(Z.reused), Q += +!!Z.backup, O.detail.hidden = !1, O.detail.textContent = Z.reused ? "Déjà importée." : Z.backup ? "Importée. La carte précédente est dans Archives." : "Importée.";
        }
        if (n() || !h)
            return;
        e.close();
        const z = y ? y + (y === 1 ? " carte importée" : " cartes importées") : "", N = B ? B + (B === 1 ? " carte déjà importée" : " cartes déjà importées") : "", U = Q ? Q + (Q === 1 ? " version dans Archives" : " versions dans Archives") : "";
        new Y.Notice([z, N, U].filter(Boolean).join(" · ") + "."), y + B === 1 ? await this.show(h.path) : await this.loadLibrary();
    }
    catch (z) {
        n() || (p.textContent = z instanceof Error ? z.message : "Impossible d’importer cette carte.", p.hidden = !1, l.textContent = "");
    }
    finally {
        this.xmindBusy = !1;
        const z = this.contentEl.querySelector('[aria-label="Importer un Xmind"]');
        z && (z.disabled = !1);
        for (const N of g)
            N.checked.disabled = N.done, N.choose.disabled = N.done;
        f();
    } })()), "is-primary"), f = () => { const M = g.filter(D => D.checked.checked && !D.done).length; w.disabled = !M, l.textContent = a.filename + " · " + M + (M === 1 ? " feuille sélectionnée" : " feuilles sélectionnées"); }; for (const M of g)
        M.checked.addEventListener("change", f); f(); }
    async openOutlineImport(e) { const a = this.modal("Importer un JWPub"); let i = !1; a.onClose = () => { i = !0; }; const o = a.contentEl.createEl("p", { text: "Lecture de " + e.name + "…", attr: { role: "status" } }); let l; try {
        l = await p9(e, { isCancelled: () => i || !this.active, onProgress: d => { d.stage === "reading" && d.total && (o.textContent = "Lecture de " + e.name + " · " + d.current + " / " + d.total); } });
    }
    catch (d) {
        i || (o.setAttribute("role", "alert"), o.textContent = d instanceof Error ? d.message : "Impossible de lire ce fichier JWPub.");
        return;
    } i || !this.active || (o.textContent = l.publication.title + " · " + l.entries.length + (l.entries.length === 1 ? " document détecté" : " documents détectés"), this.renderOutlineImport(a, l)); }
    renderOutlineImport(e, a) { const i = e.contentEl; let n = TS(a); const o = i.createDiv({ cls: "jwsd-talk-outline-import" }), l = o.createDiv({ cls: "jwsd-talk-actions jwsd-talk-outline-import-fields" }), d = xn(l, "Type de JWPub", jA(kd), n, f => { n = f, w(); }), g = xn(l, "Destination du JWPub", [], "", () => Q()), p = o.createDiv({ cls: "jwsd-talk-import-preview jwsd-talk-outline-import-list" }), v = a.entries.map(f => { const M = p.createDiv({ cls: "jwsd-talk-outline-import-row" }); let D = !0; wd(M, f.title, !0, z => { D = z; }); const R = M.createEl("input", { attr: { type: "number", min: "1", max: "999", step: "1", placeholder: "Nº", "aria-label": "Numéro de " + f.title } }); return R.value = f.number === void 0 ? "" : String(f.number), f.seconds && M.createEl("small", { text: Na(f.seconds) }), { candidate: f, field: R, checked: () => D }; }), h = i.createEl("p", { cls: "jwsd-talk-outline-feedback", attr: { role: "alert", hidden: "" } }), y = i.createDiv({ cls: "jwsd-talk-actions" }), B = Be(y, "Importer les plans", "file-input", () => this.run((async () => { h.hidden = !0; const f = v.filter(D => D.checked()); if (!f.length || f.some(D => !D.field.validity.valid)) {
        h.textContent = "Sélectionne au moins un plan et vérifie les numéros saisis.", h.hidden = !1;
        return;
    } const M = f.map(D => ({ ...D.candidate, number: D.field.value ? Number(D.field.value) : void 0 })); B.disabled = d.disabled = g.disabled = !0; try {
        const D = await this.store.saveOutlines(a, n, M, g.value || void 0);
        e.close(), new Y.Notice("Catalogue JWPub · " + D.added + " ajoutés · " + D.updated + " mis à jour · " + D.unchanged + " déjà à jour"), await this.loadLibrary();
    }
    catch (D) {
        h.textContent = D instanceof Error ? D.message : "Impossible d’enregistrer les plans.", h.hidden = !1;
    }
    finally {
        B.disabled = d.disabled = g.disabled = !1;
    } })()), "is-primary"), Q = () => { const f = g.value ? "Actualiser le recueil" : "Importer les plans"; B.lastElementChild.textContent = f, B.setAttribute("aria-label", f), B.title = f; }, w = () => { g.empty(), g.createEl("option", { text: "Nouveau recueil", attr: { value: "" } }); for (const f of this.catalog.collections.filter(M => M.kind === n && M.publication.language === a.publication.language))
        g.createEl("option", { text: f.publication.title, attr: { value: f.id } }); g.value = PS(this.catalog, n, a)?.id ?? "", Q(); }; w(); }
    previewOutline(e, a) { const i = this.modal(DA(a)), n = i.contentEl; n.createEl("p", { text: e.publication.title + " · " + kd[e.kind] }); const o = n.createDiv({ cls: "jwsd-talk-import-preview jwsd-talk-outline-reading" }), l = new Y.Component; l.load(), i.onClose = () => l.unload(); const d = a.markdown.replace(/^# [^\n]*\n\s*/, ""); Y.MarkdownRenderer.render(this.app, d, o, this.store.outlineCatalogPath(), l).catch(() => { o.textContent = d; }); const g = this.cards.filter(y => y.plan?.status !== "archived" && y.plan?.outline?.collectionId === e.id && y.plan.outline.templateId === a.id).sort((y, B) => B.file.stat.mtime - y.file.stat.mtime); if (g.length) {
        const y = n.createEl("details", { cls: "jwsd-talk-outline-drafts" });
        y.createEl("summary", { text: g.length === 1 ? "Préparation existante" : g.length + " préparations existantes" });
        for (const B of g) {
            const Q = B.plan.outline, w = Q.revision !== a.revision || Q.number !== a.number, f = kr(B.plan) + (w ? " · Ancienne source" : "");
            Be(y, f, "file-text", () => { i.close(), this.run(this.show(B.file.path)); });
        }
    } let p = Na(a.seconds ?? 1800); Ms(n, "Durée cible", p, y => { p = y; }, !0); const v = { collectionId: e.id, templateId: a.id, revision: a.revision, number: a.number }, h = Be(n, "Créer une préparation", "network", () => this.run((async () => { const y = op(p); if (!y) {
        new Y.Notice("Saisis une durée en minutes ou au format m:ss.");
        return;
    } h.disabled = !0; try {
        const B = await this.store.prepareOutline(v, y);
        i.close(), await this.show(B.path);
    }
    finally {
        h.disabled = !1;
    } })()), "is-primary"); }
    async favorite(e) { const a = await this.store.open(e), i = Ds(a.saved); i.favorite = !i.favorite, await this.store.save(a, i), await this.loadLibrary(); }
    async setArchived(e, a) { const i = await this.store.open(e); if (a === (i.saved.status === "archived"))
        return; const n = Ds(i.saved); l0(n, a ? "archived" : n.archivedFrom ?? "draft"), await this.store.save(i, n), await this.loadLibrary(), new Y.Notice(a ? "Plan archivé. Tu peux le retrouver dans Archives." : "Plan restauré dans Mes plans."); }
    async confirmTrash(e) { const a = await this.store.open(e); if (!this.active || this.session)
        return; const i = this.modal("Supprimer le plan"), n = tc(a.saved); i.contentEl.createEl("p", { text: "« " + n + " » sera placé dans la corbeille du coffre." }); const o = i.contentEl.createDiv({ cls: "jwsd-talk-actions" }); Be(o, "Annuler", "x", () => i.close()); const l = Be(o, "Supprimer le plan", "trash-2", () => this.run((async () => { l.disabled = !0; try {
        await this.store.trash(a), i.close(), await this.loadLibrary(), new Y.Notice("Plan déplacé dans la corbeille.");
    }
    finally {
        l.disabled = !1;
    } })()), "is-danger"); }
    pickNote() { const e = this.store.noteFiles(); if (!e.length) {
        new Y.Notice("Le coffre ne contient aucune note à reprendre.");
        return;
    } new Hg(this.app, "Choisir une note", e, a => a.path, a => this.run(this.previewNote(a))).open(); }
    modal(e) { const a = new Y.Modal(this.app); return a.open(), a.modalEl.addClass("jwsd-theme", "jwsd-talk-modal"), a.contentEl.addClass("jwsd-theme", "jwsd-talk-form"), a.contentEl.createEl("h2", { text: e }), a; }
    async previewNote(e) { const a = await this.store.readSource(e); this.contentEl.clientWidth < 620 && Qc(a, "vertical"); const i = this.modal("Reprendre une note"), n = i.contentEl; n.createEl("p", { text: kr(a) + " · " + Na(a.target) }); const o = Lo(a), l = n.createDiv({ cls: "jwsd-talk-import-preview" }); a.nodes[0].note && l.createEl("p", { text: a.nodes[0].note }); for (const p of a.nodes.slice(1)) {
        const v = o.slots.get(p.id), h = l.createEl("p");
        h.createEl("strong", { text: p.title }), h.createSpan({ text: v ? " · " + Na(v.seconds) : " · Sujet flottant" });
        const y = yc(p);
        (y.length || p.images.length) && l.createEl("small", { text: [...y.map(B => B.label), ...p.images.map(B => B.path.split("/").pop())].join(" · ") });
    } const d = n.createDiv({ cls: "jwsd-talk-actions" }), g = Be(d, "Créer la carte", "network", () => this.run((async () => { g.disabled = !0; try {
        const p = await this.store.importPlan(a);
        i.close(), await this.show(p.path);
    }
    finally {
        g.disabled = !1;
    } })()), "is-primary"); }
    openNote(e) { return this.app.workspace.getLeaf("tab").openFile(e); }
    openIntroSong(initialNumber, onUpdated) {
        if (!this.session || !this.plan)
            return;
        const modal = this.modal('Cantique d’introduction');
        modal.modalEl.addClass('jwsd-song-modal');
        const root = modal.contentEl;
        root.createEl('p', { cls: 'jwsd-song-description', text: 'Indique le cantique du discours. Son titre et sa page sont recherchés dans le recueil « Chantons joyeusement pour Jéhovah ! » sur jw.org.' });
        const saved = this.plan.introSong || null;
        let current = saved ? { ...saved } : null;
        const form = root.createDiv({ cls: 'jwsd-song-form' });
        const numberField = form.createEl('label');
        numberField.createSpan({ text: 'Numéro du cantique' });
        const numberInput = numberField.createEl('input', { attr: { type: 'number', min: '1', max: '164', step: '1', inputmode: 'numeric', placeholder: 'Ex. 144' } });
        numberInput.value = String(initialNumber || saved?.number || '');
        const lookUp = Be(form, 'Chercher sur jw.org', 'search', () => void lookup(), 'is-primary');
        const feedback = form.createEl('p', { cls: 'jwsd-song-feedback', attr: { role: 'status' } });
        const detail = root.createDiv({ cls: 'jwsd-song-detail' });
        const actions = root.createDiv({ cls: 'jwsd-song-actions' });
        const save = Be(actions, 'Associer au discours', 'check', () => {
            const n = Number(numberInput.value);
            if (!current || current.number !== n || !current.title?.trim()) {
                feedback.setText('Recherche d’abord le cantique, puis vérifie son titre.');
                return;
            }
            this.change(p => { p.introSong = { number: n, title: current.title, url: current.url || '' }; });
            onUpdated?.({ number: n, title: current.title, url: current.url || '' });
            modal.close();
            new Y.Notice('Cantique ' + n + ' associé au discours.');
        }, 'is-primary');
        const remove = Be(actions, 'Retirer', 'x', () => { this.change(p => { delete p.introSong; }); onUpdated?.(null); modal.close(); }, 'is-quiet');
        remove.disabled = !saved;
        function show() {
            detail.empty();
            save.disabled = !current;
            if (!current)
                return;
            detail.createEl('strong', { text: 'Cantique ' + current.number + ' — ' + current.title });
            const anchor = detail.createEl('a', { text: 'Ouvrir le cantique sur JW.org', attr: { href: current.url || jwsdSongCatalogueUrl, target: '_blank', rel: 'noopener noreferrer' } });
            anchor.addClass('jwsd-song-official-link');
            detail.createEl('small', { text: 'Source : Chantons joyeusement pour Jéhovah !' });
        }
        const lookup = async () => {
            const n = Number(numberInput.value);
            current = null;
            show();
            if (!Number.isInteger(n) || n < 1 || n > 164) {
                feedback.setText('Entre un numéro de cantique de 1 à 164.');
                return;
            }
            feedback.setText('Recherche dans le catalogue officiel…');
            lookUp.disabled = true;
            try {
                current = await jwsdFindOfficialSong(n);
                if (!root.isConnected)
                    return;
                feedback.setText('Titre vérifié sur JW.org.');
                show();
            }
            catch (error) {
                if (!root.isConnected)
                    return;
                feedback.setText(error instanceof Error ? error.message : 'Recherche indisponible.');
                // The title of no. 144 is verified separately; other titles must never be invented.
                if (n === 144) {
                    current = { ...jwsdKnownSong144 };
                    feedback.setText('Cantique 144 identifié grâce à la référence officielle connue.');
                    show();
                }
            }
            finally {
                lookUp.disabled = false;
            }
        };
        numberInput.addEventListener('input', () => { if (current?.number !== Number(numberInput.value)) {
            current = null;
            show();
            feedback.setText('');
        } });
        numberInput.addEventListener('keydown', event => { if (event.key === 'Enter') {
            event.preventDefault();
            void lookup();
        } });
        if (saved && saved.number === Number(numberInput.value)) {
            current = saved;
            show();
            feedback.setText('Cantique déjà associé au discours.');
        }
        else if (initialNumber)
            void lookup();
        numberInput.focus();
    }
    async openPlaylistMedia() {
        if (!this.session || !this.plan)
            return;
        const planPath = this.session.file.path;
        const filePath = planPath.replace(/\.md$/i, '') + '.jwlplaylist';
        const modal = this.modal('Médias & Sono');
        modal.modalEl.addClass('jwsd-sono-modal');
        const root = modal.contentEl;
        let current = null, assets = null, closed = false;
        const revoke = () => { if (assets) {
            for (const url of assets.urls.values())
                URL.revokeObjectURL(url);
            assets = null;
        } };
        const previousClose = modal.onClose?.bind(modal);
        modal.onClose = () => { closed = true; revoke(); previousClose?.(); };
        const status = root.createEl('p', { cls: 'jwsd-sono-intro', text: 'Cantique, images et vidéo associés à ce discours. La playlist JW Library est conservée intacte pour la sono.' });
        const overview = root.createDiv({ cls: 'jwsd-resources-overview' });
        const songCard = overview.createDiv({ cls: 'jwsd-resources-song' });
        const playlistCard = overview.createDiv({ cls: 'jwsd-resources-playlist' });
        const controls = root.createDiv({ cls: 'jwsd-sono-controls' });
        const content = root.createDiv({ cls: 'jwsd-sono-content' });
        const drawSongCard = (song = this.plan.introSong || null) => {
            songCard.empty();
            songCard.createDiv({ cls: 'jwsd-resources-kicker', text: 'CANTIQUE D’INTRODUCTION' });
            songCard.createEl('strong', { text: song ? 'Nº ' + song.number + ' · ' + song.title : 'Aucun cantique sélectionné' });
            const line = songCard.createDiv({ cls: 'jwsd-resources-card-actions' });
            if (song?.url) {
                const link = line.createEl('a', { text: 'Ouvrir sur JW.org', attr: { href: song.url, target: '_blank', rel: 'noopener noreferrer' } });
                link.addClass('jwsd-resources-song-link');
            }
            Be(line, song ? 'Modifier' : 'Choisir un cantique', 'music-2', () => this.openIntroSong(undefined, drawSongCard), 'is-quiet');
        };
        const drawPlaylistCard = (parsed) => {
            playlistCard.empty();
            playlistCard.createDiv({ cls: 'jwsd-resources-kicker', text: 'PLAYLIST JW LIBRARY' });
            playlistCard.createEl('strong', { text: parsed ? parsed.items.length + ' éléments · ' + parsed.name : 'Aucune playlist importée' });
            playlistCard.createSpan({ cls: 'jwsd-sono-muted', text: parsed ? 'Prête à exporter pour la sono' : 'Importe une playlist pour l’associer au discours' });
        };
        drawSongCard();
        drawPlaylistCard(null);
        const upload = controls.createEl('input', { attr: { type: 'file', accept: '.jwlplaylist', hidden: '' } });
        const importButton = Be(controls, 'Importer une playlist', 'file-input', () => upload.click(), 'is-primary');
        const exportButton = Be(controls, 'Exporter pour la sono', 'download', () => this.run((async () => {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file || file.extension !== 'jwlplaylist')
                throw Error('Playlist introuvable dans le coffre.');
            const buffer = await this.app.vault.readBinary(file);
            const original = new Uint8Array(buffer);
            const parsed = await jwsdParseSonoPlaylist(original);
            jwsdDownloadPlaylist(original, parsed.name);
        })()));
        const removeButton = Be(controls, 'Retirer du discours', 'unlink', () => {
            // Never delete the original file without explicit, separate consent.
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file) {
                new Y.Notice('Aucune playlist associée.');
                return;
            }
            const confirmModal = this.modal('Dissocier la playlist');
            confirmModal.contentEl.createEl('p', { text: 'La copie de playlist conservée dans ce coffre sera déplacée dans la corbeille Obsidian. La playlist importée dans JW Library et les copies envoyées à la sono ne seront pas modifiées.' });
            const actions = confirmModal.contentEl.createDiv({ cls: 'jwsd-sono-controls' });
            Be(actions, 'Annuler', 'x', () => confirmModal.close());
            Be(actions, 'Déplacer la copie à la corbeille', 'trash-2', () => this.run((async () => {
                await this.app.fileManager.trashFile(file);
                confirmModal.close();
                await refresh();
            })()), 'is-danger');
        });
        const render = (parsed) => {
            revoke();
            content.empty();
            current = parsed;
            drawPlaylistCard(parsed);
            (importButton.lastElementChild || importButton).setText(parsed ? 'Remplacer la playlist' : 'Importer une playlist');
            exportButton.disabled = !parsed;
            removeButton.disabled = !parsed;
            if (!parsed) {
                content.createEl('p', { cls: 'jwsd-sono-empty', text: 'Aucune playlist associée. Importe le fichier .jwlplaylist préparé pour ce discours.' });
                return;
            }
            content.createEl('div', { cls: 'jwsd-sono-summary', text: parsed.name + ' · ' + parsed.items.length + ' éléments' });
            content.createEl('p', { cls: 'jwsd-sono-muted', text: 'Ordre conservé depuis JW Library · ' + filePath });
            assets = jwsdPlaylistAssets(parsed);
            const proposedSong = parsed.items.find(item => item.type === 'song' && Number.isInteger(item.track) && item.track >= 1 && item.track <= 164);
            if (proposedSong && proposedSong.track !== this.plan.introSong?.number) {
                const suggestion = content.createDiv({ cls: 'jwsd-song-playlist-suggestion' });
                suggestion.createSpan({ text: 'Cantique ' + proposedSong.track + ' détecté dans la playlist. ' });
                Be(suggestion, 'Choisir pour l’introduction', 'music-2', () => this.openIntroSong(proposedSong.track, drawSongCard));
            }
            const list = content.createEl('ol', { cls: 'jwsd-sono-list' });
            for (const item of parsed.items) {
                const line = list.createEl('li', { cls: 'jwsd-sono-item' });
                const image = jwsdPlaylistObjectUrl(assets, item.thumbnail) ||
                    (item.type === 'image' ? jwsdPlaylistObjectUrl(assets, item.mediaPath, item.mime) : null);
                if (image) {
                    const thumb = line.createEl('button', { cls: 'jwsd-sono-thumb', attr: { type: 'button', title: 'Agrandir ' + item.label } });
                    thumb.createEl('img', { attr: { src: image, alt: 'Aperçu : ' + item.label, loading: 'lazy' } });
                    thumb.addEventListener('click', () => {
                        const full = jwsdPlaylistObjectUrl(assets, item.mediaPath, item.mime) || image;
                        const preview = new Y.Modal(this.app);
                        preview.open();
                        preview.modalEl.addClass('jwsd-theme', 'jwsd-sono-preview');
                        preview.contentEl.createEl('h3', { text: item.label });
                        preview.contentEl.createEl('img', { attr: { src: full, alt: item.label } });
                    });
                }
                else {
                    const ico = line.createSpan({ cls: 'jwsd-sono-thumb jwsd-sono-placeholder' });
                    Y.setIcon(ico, item.type === 'song' ? 'music-2' : item.type === 'video' ? 'video' : 'image');
                }
                const info = line.createDiv({ cls: 'jwsd-sono-item-info' });
                info.createEl('strong', { text: item.label });
                const kind = item.type === 'song' ? 'Cantique' : item.type === 'image' ? 'Image' : item.type === 'video' ? 'Vidéo JW Library' : 'Média lié';
                info.createEl('span', { cls: 'jwsd-sono-kind', text: kind });
                if (item.type === 'song' && item.track)
                    info.createSpan({ cls: 'jwsd-sono-muted', text: 'Cantique ' + item.track });
                if (item.type === 'video')
                    info.createSpan({ cls: 'jwsd-sono-muted', text: 'Vidéo référencée dans JW Library' });
            }
            content.createEl('p', { cls: 'jwsd-sono-muted', text: 'Les images originales sont incluses. Les fichiers complets du cantique et de la vidéo ne figurent pas dans cet export : JW Library retrouve ces ressources à partir de leurs références.' });
        };
        const refresh = async () => {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file || file.extension !== 'jwlplaylist') {
                render(null);
                return;
            }
            content.empty();
            content.createEl('p', { text: 'Lecture de la playlist…' });
            try {
                const bytes = new Uint8Array(await this.app.vault.readBinary(file));
                const parsed = await jwsdParseSonoPlaylist(bytes);
                if (!closed)
                    render(parsed);
            }
            catch (error) {
                render(null);
                content.createEl('p', { cls: 'jwsd-sono-error', text: error instanceof Error ? error.message : 'Playlist non lisible.' });
            }
        };
        upload.addEventListener('change', () => {
            const file = upload.files?.[0];
            upload.value = '';
            if (!file)
                return;
            this.run((async () => {
                if (!/\.jwlplaylist$/i.test(file.name))
                    throw Error('Sélectionne un fichier .jwlplaylist.');
                importButton.disabled = true;
                try {
                    const bytes = new Uint8Array(await file.arrayBuffer());
                    const parsed = await jwsdParseSonoPlaylist(bytes);
                    const existing = this.app.vault.getAbstractFileByPath(filePath);
                    const raw = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
                    if (existing) {
                        if (existing.extension !== 'jwlplaylist')
                            throw Error('Le chemin de destination est déjà occupé.');
                        const accept = await new Promise(resolve => {
                            const confirm = this.modal('Remplacer la playlist associée ?');
                            let finished = false;
                            const finish = value => { if (finished)
                                return; finished = true; confirm.close(); resolve(value); };
                            confirm.contentEl.createEl('p', { text: 'Une playlist existe déjà pour ce discours. Si tu confirmes, elle sera remplacée par « ' + parsed.name + ' » dans le coffre. Tes exemplaires envoyés ou importés dans JW Library ne seront pas modifiés.' });
                            const buttons = confirm.contentEl.createDiv({ cls: 'jwsd-sono-controls' });
                            Be(buttons, 'Annuler', 'x', () => finish(false));
                            Be(buttons, 'Remplacer la playlist', 'refresh-cw', () => finish(true), 'is-primary');
                            const close = confirm.onClose?.bind(confirm);
                            confirm.onClose = () => { if (!finished) {
                                finished = true;
                                resolve(false);
                            } close?.(); };
                        });
                        if (!accept)
                            return;
                        await this.app.vault.modifyBinary(existing, raw);
                    }
                    else
                        await this.app.vault.createBinary(filePath, raw);
                    if (!closed) {
                        render(parsed);
                        new Y.Notice('Playlist associée au discours.');
                    }
                }
                finally {
                    importButton.disabled = false;
                }
            })());
        });
        await refresh();
    }
    renderProject(e, a) {
        const i = Lo(e);
        if (this.mode === "speaker") {
            const f = this.contentEl.createDiv({ cls: "jwsd-talk-speaker" });
            this.speaker.render(f, e, i, a.file.path), f.createDiv({ cls: "jwsd-talk-save" }), this.renderSaveState();
            return;
        }
        const n = this.contentEl.createDiv({ cls: "jwsd-talk-header" }), o = n.createDiv({ cls: "jwsd-talk-heading" });
        Be(o, "Mes plans", "arrow-left", this.openLibrary, "is-quiet"), o.createEl("h2", { text: kr(e), cls: "jwsd-talk-project-title" });
        const l = e.outline?.number ?? e.xmind?.number;
        l && o.createEl("small", { text: "Discours nº " + l, cls: "jwsd-talk-kicker" });
        const d = n.createDiv({ cls: "jwsd-talk-actions" }), g = d.createDiv({ cls: "jwsd-talk-target" }), p = g.createDiv();
        p.createSpan({ text: "Durée prévue" }), p.createEl("strong", { text: Na(i.total), attr: { "aria-label": "Durée prévue" } }), Ms(g, "Durée cible", Na(e.target), f => this.setDuration(f));
        const resourceFile = this.session?.file.path.replace(/\.md$/i, "") + ".jwlplaylist";
        const hasResourcePlaylist = !!(resourceFile && this.app.vault.getAbstractFileByPath(resourceFile));
        const resourceLabel = e.introSong ? "Ressources · Cantique " + e.introSong.number + (hasResourcePlaylist ? " · Playlist" : "") :
            "Ressources" + (hasResourcePlaylist ? " · Playlist" : "");
        const resourceButton = Be(d, resourceLabel, "list-music", () => this.openPlaylistMedia());
        resourceButton.addClass('jwsd-talk-resource-button');
        resourceButton.setAttribute('title', e.introSong ? "Cantique " + e.introSong.number + " — " + e.introSong.title + (hasResourcePlaylist ? " · Playlist associée" : "") :
            (hasResourcePlaylist ? "Playlist associée · Choisir aussi un cantique" : "Gérer le cantique et les médias du discours"));
        const v = [{ label: "Organiser ce plan", icon: "tags", run: () => this.planProperties() }, { label: "Exporter le plan Markdown", icon: "file-text", run: () => this.run(this.export("md")) }, { label: "Exporter la carte Canvas", icon: "network", run: () => this.run(this.export("canvas")) }];
        e.outline && v.push({ label: "Voir le modèle JWPub", icon: "library-big", run: () => this.run((async () => { const f = g0(await this.store.outlines(), e.outline); if (!f) {
                new Y.Notice("Ce modèle est introuvable dans le catalogue JWPub.");
                return;
            } this.previewOutline(f.collection, f.template); })()) }), e.source && v.push({ label: "Ouvrir la note d’origine", icon: "external-link", run: () => { const f = this.store.file(e.source); f ? this.run(this.openNote(f)) : new Y.Notice("La note d’origine est introuvable dans le coffre."); } }), _r(d, "Options du discours", v);
        const h = this.contentEl.createDiv({ cls: "jwsd-talk-toolbar" }), y = h.createDiv({ cls: "jwsd-talk-views", attr: { "aria-label": "Vue du discours" } });
        for (const [f, M, D] of lQ)
            Be(y, M, D, () => this.switchMode(f)).setAttribute("aria-pressed", String(this.mode === f));
        const B = h.createDiv({ cls: "jwsd-talk-actions" });
        if (Be(B, "Annuler", "undo-2", () => this.history(this.undo, this.redo), "is-icon"), Be(B, "Rétablir", "redo-2", () => this.history(this.redo, this.undo), "is-icon"), this.mode === "map" && (e.outline && Be(B, this.mapOverview ? "Carte détaillée" : "Vue d’ensemble", this.mapOverview ? "network" : "layout-grid", () => { this.map.finishEdit(!0, !1), this.mapOverview = !this.mapOverview, this.map.dispose(!0), this.render(); }), this.mapOverview || Be(B, "Ranger automatiquement", "workflow", () => { this.change(f => { f.mapLayout = "auto"; }), this.map.fit(); }, "is-icon"), !this.mapOverview)) {
            const f = B.createEl("input", { attr: { type: "file", accept: "image/*", hidden: "" } });
            Be(B, "Image flottante", "image-plus", () => f.click(), "is-icon"), f.addEventListener("change", () => { const M = [...f.files ?? []]; f.value = "", this.run(this.attachFiles(null, M)); });
        }
        Be(B, this.detailsOpen ? "Masquer le détail" : "Afficher le détail", "panel-right", () => { this.detailsOpen = !this.detailsOpen, this.render(), this.map.fit(); }, "is-icon"), Be(B, "Sujet flottant", "square-dashed", () => this.add(null, void 0, void 0, !0)), Be(B, "Partie", "plus", () => this.add(Ye, void 0, void 0, !0), "is-primary"), this.syncHistory();
        const Q = this.contentEl.createDiv({ cls: "jwsd-talk-workbench" + (this.detailsOpen ? "" : " is-wide") }), w = Q.createDiv({ cls: "jwsd-talk-body" });
        this.mode === "map" ? (this.mapHost = w.createDiv({ cls: "jwsd-talk-map-host" }), this.renderMap(e, i)) : this.renderOutline(w, e, i), this.renderTimeline(w, e, i), this.detailsOpen && this.renderInspector(Q, e, i), this.contentEl.createDiv({ cls: "jwsd-talk-save" }), this.renderSaveState();
    }
    renderMap(e, a) { if (!this.mapHost || !this.session)
        return; const i = this.mapOverview ? void 0 : new Y.Component, n = this.session.file.path; if (i?.load(), !this.map.refresh(this.mapHost, e, a, this.selected, { overview: this.mapOverview, renderNote: i ? (l, d) => { Y.MarkdownRenderer.render(this.app, d, l, n, i).catch(() => { l.textContent = d; }); } : void 0 })) {
        i?.unload();
        return;
    } this.mapMarkdown?.unload(), this.mapMarkdown = i; }
    syncHistory() { const e = this.contentEl.querySelector('[aria-label="Annuler"]'), a = this.contentEl.querySelector('[aria-label="Rétablir"]'); e && (e.disabled = !this.undo.length), a && (a.disabled = !this.redo.length); }
    setDuration(e, a) { const i = op(e); if (i === null || !a && !i) {
        new Y.Notice("Saisis un nombre de minutes ou une durée au format m:ss."), this.render();
        return;
    } this.change(n => { if (a) {
        const o = oa(n, a);
        o.mode = "fixed", o.seconds = i;
    }
    else
        n.target = i; }); }
    planProperties() { const e = this.plan, a = this.modal("Organiser ce plan"), i = { kind: e.kind, status: e.status, tags: e.tags.join(", "), favorite: e.favorite }, n = a.contentEl; xn(n, "Type", jA(Ac), i.kind, o => { i.kind = o; }), xn(n, "État du plan", jA(Iu), i.status, o => { i.status = o; }), Ms(n, "Étiquettes séparées par des virgules", i.tags, o => { i.tags = o; }, !0), wd(n, "Favori", i.favorite, o => { i.favorite = o; }), Be(n, "Enregistrer", "check", () => { this.change(o => { o.kind = i.kind, l0(o, i.status), o.tags = [...new Set(i.tags.split(",").map(l => fd(l)).filter(Boolean))].slice(0, 30), o.favorite = i.favorite; }), a.close(); }, "is-primary"); }
    async export(e) { if (this.map.finishEdit(!0), !this.plan)
        return; const a = Ds(this.plan); e === "canvas" && this.mapHost && !this.mapOverview && this.map.savePlacement(a), await this.openNote(await this.store.export(a, e)); }
    renderTimeline(e, a, i) { const n = e.createEl("section", { cls: "jwsd-talk-timeline", attr: { "aria-label": "Repères cumulés" } }), o = n.createDiv({ cls: "jwsd-talk-timeline-heading" }); o.createEl("strong", { text: "Repères cumulés" }); const l = a.target - i.total; l && o.createSpan({ text: l > 0 ? Na(l) + " disponibles" : "+" + Na(-l) + " de dépassement", cls: l < 0 ? "is-error" : "" }); const d = n.createDiv({ cls: "jwsd-talk-marks" }); ya(a, Ye).forEach((g, p) => { const v = i.slots.get(g.id), h = d.createEl("button", { cls: "jwsd-talk-mark", attr: { type: "button", "data-talk-color": g.color, "data-talk-mark": g.id, "aria-label": g.title + ", fin à " + Na(v.end), "aria-pressed": String(this.primary === g.id) } }); h.style.flexGrow = String(Math.max(1, v.seconds)), h.createSpan({ text: p + 1 + " · " + g.title }), h.createEl("strong", { text: Na(v.end) }), h.addEventListener("click", () => { this.select(g.id), this.map.center(g.id); }); }); }
    renderOutline(e, a, i) { const n = e.createDiv({ cls: "jwsd-talk-outline", attr: { "aria-label": "Plan du discours" } }), o = (g, p, v, h) => { const y = n.createDiv({ cls: "jwsd-talk-outline-row", attr: { "data-node": g.id, "data-talk-color": Zr(a, g).color } }); y.style.setProperty("--talk-indent", String(Math.min(6, p))); const B = y.createEl("button", { cls: "jwsd-talk-outline-title", attr: { type: "button", "aria-label": g.title, "aria-pressed": String(this.primary === g.id) } }); g.parent === Ye && B.createSpan({ text: String(v + 1), cls: "jwsd-talk-number" }), B.createEl("strong", { text: g.title }), B.addEventListener("click", () => this.select(g.id)); const Q = y.createDiv({ cls: "jwsd-talk-actions" }), w = i.slots.get(g.id); if (w && (g.mode !== "cue" || w.seconds) && Q.createSpan({ text: Na(w.start) + " → " + Na(w.end), cls: "jwsd-talk-duration" }), g.id !== Ye) {
        const f = Be(Q, "Monter " + g.title, "chevron-up", () => this.order(g.id, -1), "is-icon"), M = Be(Q, "Descendre " + g.title, "chevron-down", () => this.order(g.id, 1), "is-icon");
        f.disabled = v === 0, M.disabled = v === h.length - 1;
    } }, l = (g, p) => g.forEach((v, h) => { o(v, p, h, g), l(ya(a, v.id), p + 1); }); o(a.nodes[0], 0, 0, []), l(ya(a, Ye), 0); const d = ya(a, null); d.length && (n.createEl("h3", { text: "Sujets flottants" }), l(d, 0)); }
    reviewRehearsal(e) { const a = this.plan, i = this.modal("Dernière répétition"), n = Lo(a), o = new Intl.DateTimeFormat("fr", { dateStyle: "medium" }).format(e.date); i.contentEl.createEl("p", { text: o + " · " + Na(e.seconds) + " écoulées" }); const l = i.contentEl.createEl("ul"); for (const d of ya(a, Ye)) {
        const g = e.checkpoints[d.id];
        if (g === void 0)
            continue;
        const p = n.slots.get(d.id).end, v = g - p, h = v ? " · " + Na(Math.abs(v)) + (v > 0 ? " après le repère actuel" : " avant le repère actuel") : " · au repère actuel";
        l.createEl("li", { text: d.title + " · " + Na(g) + h });
    } }
    renderInspector(e, a, i) { const n = oa(a, this.primary), o = Zr(a, n), l = e.createEl("aside", { cls: "jwsd-talk-inspector", attr: { "aria-label": "Détail du point", "data-talk-color": o.color, tabindex: "-1" } }), d = l.createDiv({ cls: "jwsd-talk-inspector-heading" }), g = n.id === Ye ? "Fil conducteur" : n.parent ? n.parent === Ye ? "Partie" : "Sous-sujet" : "Sujet flottant"; d.createEl("strong", { text: this.selected.size > 1 ? this.selected.size + " sujets sélectionnés" : g }); const p = [{ label: "Ajouter une relation", icon: "link-2", run: () => this.createRelation(n.id) }]; if (n.id !== Ye && p.push({ label: "Dupliquer la branche", icon: "copy", run: () => this.change(z => { const N = kS(z, n.id); N && (this.primary = N.id, this.selected = new Set([N.id])); }) }, { label: "Rattacher à…", icon: "corner-down-right", run: () => this.attachBranch(n.id) }, { label: "Supprimer la bulle", icon: "trash-2", danger: !0, run: () => this.deleteBubble(n.id, !1) }), n.id !== Ye && ya(a, n.id).length && p.push({ label: "Supprimer toute la branche", icon: "trash-2", danger: !0, run: () => this.deleteBubble(n.id, !0) }), n.parent && p.splice(3, 0, { label: "Détacher en sujet flottant", icon: "square-dashed", run: () => this.change(z => { Qd(z, n.id, null); }) }), _r(d, "Options du point", p), this.mode === "map" && this.mapOverview && o.id !== Ye) {
        const z = Rr(a, o.id);
        if (z.length) {
            const N = l.createEl("nav", { cls: "jwsd-talk-branch-points", attr: { "aria-label": "Points de " + o.title } });
            N.createEl("strong", { text: o.title });
            const U = N.createDiv({ cls: "jwsd-talk-branch-list" });
            for (const Z of [o, ...z]) {
                const X = U.createDiv({ attr: Z === o ? {} : { "data-node": Z.id } }), _ = Z === o ? "Notes de la partie" : Z.title, le = X.createEl("button", { cls: "jwsd-talk-outline-title", attr: { type: "button", "aria-label": _, "aria-pressed": String(Z.id === n.id) } });
                le.createEl("strong", { text: _ }), le.addEventListener("click", () => this.select(Z.id));
            }
            const O = U.querySelector('[aria-pressed="true"]');
            O && (U.scrollTop = O.offsetTop + O.offsetHeight - U.clientHeight);
        }
    } Ms(l, "Titre du point", n.title, z => { fd(z) && this.editText(n.id, "title", fd(z)); }, !0).addEventListener("blur", z => { const N = z.currentTarget; N.value.trim() || (N.value = oa(this.plan, n.id)?.title ?? ""), this.editGroup = void 0; }); const v = l.createDiv({ cls: "jwsd-talk-inspector-section" }); Ms(v, "Notes du point", n.note, z => this.editText(n.id, "note", z), !0, !0).addEventListener("blur", () => { this.editGroup = void 0; }), Be(v, "Modifier en Markdown", "square-pen", () => this.editNoteInModal(n.id)), n.id !== Ye && xn(l, "Couleur de la branche", jA(eQ), o.color, z => this.setBranchColor(o.id, z)); const h = i.slots.get(n.id); if (h) {
        const z = l.createDiv({ cls: "jwsd-talk-inspector-section" });
        z.createEl("strong", { text: "Minutage" });
        const N = z.createDiv({ cls: "jwsd-talk-time-fields" }), U = [["auto", "Automatique"], ["fixed", "Fixe"]];
        n.parent !== Ye && U.push(["cue", "Repère"]), xn(N, "Mode de durée", U, n.mode, X => this.change(_ => { const le = oa(_, n.id); X === "fixed" && (le.seconds = h.seconds), le.mode = X; }));
        const O = Ms(N, "Durée du point", Na(n.mode === "fixed" ? n.seconds : h.seconds), X => this.setDuration(X, n.id));
        O.disabled = n.mode !== "fixed";
        const Z = n.mode === "cue" && !h.seconds ? "Dans le temps de sa partie" : Na(h.start) + " → " + Na(h.end) + (h.over ? " · Sous-points " + Na(h.seconds) : "");
        z.createEl("small", { text: Z, cls: h.over ? "is-error" : "" });
    } const y = l.createDiv({ cls: "jwsd-talk-inspector-section" }), B = y.createDiv({ cls: "jwsd-talk-section-head" }); B.createEl("strong", { text: "Références" }); const Q = B.createDiv({ cls: "jwsd-talk-actions" }); Be(Q, "Depuis la collecte", "bookmark-plus", () => this.pickCapture(n.id), "is-icon"), Be(Q, "Ajouter une référence", "plus", () => this.addReference(n.id), "is-icon"), this.renderReferences(y.createDiv({ cls: "jwsd-talk-reference-list" }), n); const w = l.createDiv({ cls: "jwsd-talk-inspector-section" }), f = w.createDiv({ cls: "jwsd-talk-section-head" }); f.createEl("strong", { text: "Images" }); const M = f.createDiv({ cls: "jwsd-talk-actions" }); Be(M, "Choisir une image du coffre", "folder-open", () => this.pickImage(n.id), "is-icon"); const D = w.createEl("input", { attr: { type: "file", hidden: "", accept: ".png,.jpg,.jpeg,.webp,.gif,.avif,.bmp,.svg", multiple: "" } }); Be(M, "Ajouter une image", "plus", () => D.click(), "is-icon"), D.addEventListener("change", () => { this.run(this.attachFiles(n.id, [...D.files ?? []])), D.value = ""; }), n.images.forEach((z, N) => this.renderAsset(w, n, z, N)); const R = a.relations.filter(z => z.from === n.id); if (R.length) {
        const z = l.createDiv({ cls: "jwsd-talk-inspector-section" });
        z.createEl("strong", { text: "Relations" });
        for (const N of R) {
            const U = z.createDiv({ cls: "jwsd-talk-resource" }), O = oa(a, N.to);
            Be(U, N.label ? O.title + " · " + N.label : O.title, "link-2", () => { this.select(O.id), this.map.center(O.id); }), Be(U, "Retirer la relation vers " + O.title, "x", () => this.change(Z => { Z.relations = Z.relations.filter(X => X.from !== N.from || X.to !== N.to); }), "is-icon");
        }
    } Be(l, "Sous-sujet", "plus", () => this.add(n.id), "is-quiet"); }
    editText(e, a, i) { if (this.change(n => { oa(n, e)[a] = i; }, !1, e + "/" + a), a === "title") {
        e === Ye && (this.contentEl.querySelector(".jwsd-talk-project-title").textContent = i);
        for (const l of this.contentEl.querySelectorAll("[data-node]")) {
            if (l.dataset.node !== e)
                continue;
            const d = l.querySelector(".jwsd-talk-topic, .jwsd-talk-outline-title");
            d && (d.setAttribute("aria-label", i), d.querySelector("strong").textContent = i);
        }
        const n = [...this.contentEl.querySelectorAll("[data-talk-mark]")], o = n.findIndex(l => l.dataset.talkMark === e);
        if (o >= 0) {
            const l = n[o];
            l.querySelector("span").textContent = o + 1 + " · " + i, l.setAttribute("aria-label", i + ", fin à " + l.querySelector("strong").textContent);
        }
    } clearTimeout(this.resourceTimer), this.resourceTimer = setTimeout(() => { const n = this.contentEl.querySelector(".jwsd-talk-reference-list"), o = this.plan && oa(this.plan, e); n && o && this.primary === e && !n.contains(n.ownerDocument.activeElement) && this.renderReferences(n, o), this.mapHost && this.plan && this.renderMap(this.plan, Lo(this.plan)); }, 280); }
    editNoteInModal(e) { const a = this.session, i = this.plan && oa(this.plan, e); !a || !i || new h9(this.app, i.title, i.note, a.file.path, n => { const o = this.plan && oa(this.plan, e); return !this.active || this.session !== a || !o ? (new Y.Notice("Ce point n’est plus ouvert dans l’atelier."), !1) : o.note !== i.note && o.note !== n ? (new Y.Notice("Cette note a changé depuis l’ouverture de la fenêtre."), !1) : (this.change(l => { oa(l, e).note = n; }), !0); }).open(); }
    addReference(e) { const a = this.modal("Ajouter une référence"); let i = ""; const n = Ms(a.contentEl, "Verset, publication ou lien WOL", "", l => { i = l; }, !0), o = () => { const l = c9(i); if (!l.length) {
        new Y.Notice("La référence n’a pas été reconnue. Essaie un verset, une référence de publication ou un lien WOL.");
        return;
    } this.addReferences(e, l), a.close(); }; n.addEventListener("keydown", l => { l.key === "Enter" && (l.preventDefault(), o()); }), Be(a.contentEl, "Lier au point", "link-2", o, "is-primary"), n.focus(); }
    pickCapture(e) { const a = this.actions.captures().filter(i => la(i.url) || i.excerpt); if (!a.length) {
        new Y.Notice("Aucun extrait ni référence dans la collecte.");
        return;
    } new Hg(this.app, "Choisir une trouvaille", a, i => i.label, i => this.addReferences(e, [{ label: i.label, url: la(i.url) ?? "", read: !1, excerpt: i.excerpt }])).open(); }
    addReferences(e, a) { this.change(i => { const n = oa(i, e); if (n)
        for (const o of a)
            n.references.some(l => ks(l) === ks(o)) || n.references.push(o); }); }
    renderReferences(e, a) { e.empty(); for (const i of yc(a)) {
        const n = e.createDiv({ cls: "jwsd-talk-attachment" }), o = n.createDiv({ cls: "jwsd-talk-resource" }), l = ks(i), d = a.references.some(g => ks(g) === l);
        Be(o, i.label, i.url ? "book-open-text" : "quote", () => { i.url ? this.actions.read(i) : this.modal(i.label).contentEl.createEl("blockquote", { text: i.excerpt }); }), d && Be(o, "Délier " + i.label, "x", () => this.change(g => { const p = oa(g, a.id); p.references = p.references.filter(v => ks(v) !== l); }), "is-icon"), i.url && wd(n, "À lire", i.read, g => this.change(p => { const v = oa(p, a.id), h = v.references.find(y => ks(y) === l); h ? h.read = g : v.references.push({ ...i, read: g }); }));
    } }
    imageUrl(e) { const a = this.store.file(e.path); return a ? this.app.vault.getResourcePath(a) : void 0; }
    renderAsset(e, a, i, n) { const o = e.createDiv({ cls: "jwsd-talk-attachment" }), l = o.createDiv({ cls: "jwsd-talk-resource" }), d = i.caption || i.path.split("/").pop(), g = this.imageUrl(i); if (g) {
        const p = l.createEl("button", { cls: "jwsd-talk-image-preview", attr: { type: "button", "aria-label": "Voir " + d } });
        p.createEl("img", { attr: { src: g, alt: "", loading: "lazy" } }), p.createSpan({ text: d }), p.addEventListener("click", () => { const v = this.plan && oa(this.plan, a.id)?.images[n]; v && this.showImage(v); });
    }
    else
        Be(l, "Retrouver " + d, "folder-search", () => this.pickImage(a.id, n)); Be(l, "Délier " + d, "x", () => this.change(p => { oa(p, a.id).images.splice(n, 1); }), "is-icon"), Ms(o, "Légende de l’image", i.caption, p => { const v = fd(p); this.change(y => { oa(y, a.id).images[n].caption = v; }, !1, a.id + "/image/" + n); const h = l.querySelector(".jwsd-talk-image-preview"); if (h) {
        const y = v || i.path.split("/").pop();
        h.setAttribute("aria-label", "Voir " + y), h.querySelector("span").textContent = y;
    } }, !0).addEventListener("blur", () => { this.editGroup = void 0; }), wd(o, "À montrer", i.show, p => this.change(v => { oa(v, a.id).images[n].show = p; })); }
    pickImage(e, a) { const i = this.store.images(); if (!i.length) {
        new Y.Notice("Aucune image dans le coffre. Tu peux en ajouter une depuis ton appareil.");
        return;
    } new Hg(this.app, "Choisir une image", i, n => n.path, n => this.linkImages(e, [n], a)).open(); }
    linkImages(e, a, i) { this.change(n => { const o = oa(n, e); if (o) {
        if (i !== void 0 && o.images[i]) {
            o.images[i].path = a[0].path, delete o.images[i].mapRatio;
            return;
        }
        for (const l of a)
            o.images.some(d => d.path === l.path) || o.images.push({ path: l.path, caption: "", show: !1 });
    } }); }
    async attachFiles(e, a, i) { const n = this.session; if (!a.length || !n)
        return; const o = []; try {
        for (const l of a)
            o.push(await this.store.addImage(l));
    }
    finally {
        o.length && this.session === n && (e ? this.linkImages(e, o) : (this.change(l => { i && this.map.savePlacement(l); const d = i ?? (l.mapLayout === "free" ? this.map.placeBeside(null) : void 0), g = qs(l, null, o[0].basename, d); g.mapText = !0, g.images = o.map(p => ({ path: p.path, caption: "", show: !1 })), this.primary = g.id, this.selected = new Set([g.id]); }), this.map.center(this.primary)));
    } }
    showImage(e) { const a = this.imageUrl(e); if (!a) {
        new Y.Notice("Cette image est introuvable dans le coffre.");
        return;
    } const i = e.caption || e.path.split("/").pop(), n = this.modal(i); n.modalEl.addClass("jwsd-talk-image-modal"), n.contentEl.createEl("img", { cls: "jwsd-talk-full-image", attr: { src: a, alt: i } }); }
    attachBranch(e) { const a = this.plan, i = new Set([e, ...Rr(a, e).map(o => o.id)]), n = a.nodes.filter(o => !i.has(o.id)); new Hg(this.app, "Rattacher à un sujet", n, o => o.title, o => this.change(l => { const d = oa(l, e), g = d.position, p = rm(l, o.id); if (d.parent !== o.id && Qd(l, e, o.id))
        for (const v of [d, ...Rr(l, e)])
            v.position = { x: v.position.x + p.x - g.x, y: v.position.y + p.y - g.y }; })).open(); }
    createRelation(e) { const a = this.plan, i = a.nodes.filter(d => d.id !== e && !a.relations.some(g => g.from === e && g.to === d.id)); if (!i.length) {
        new Y.Notice("Ajoute un autre sujet pour créer une relation.");
        return;
    } const n = this.modal("Ajouter une relation"); let o = i[0].id, l = ""; xn(n.contentEl, "Relier au sujet", i.map(d => [d.id, d.title]), o, d => { o = d; }), Ms(n.contentEl, "Légende facultative", "", d => { l = fd(d); }, !0), Be(n.contentEl, "Relier", "link-2", () => { this.change(d => { d.relations.push({ from: e, to: o, label: l }); }), n.close(); }, "is-primary"); }
}
