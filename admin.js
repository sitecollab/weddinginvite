(function () {
  'use strict';
  var SUPABASE_URL = 'https://evqqmydxrbqryvxlpmsa.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_5Gq3scUuu2cbg0_Fzkp6uQ_6OgQvk8b'; // public (publishable) key – data is protected by Row Level Security
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  var $ = function (id) { return document.getElementById(id); };
  var loginEl = $('login'), appEl = $('app'), listEl = $('list');
  var guests = [], editingId = null, confirmId = null;
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function say(el, text, kind) { el.textContent = text || ''; el.className = 'msg' + (kind ? ' ' + kind : ''); }

  function show(session) {
    var on = !!session;
    loginEl.hidden = on; appEl.hidden = !on;
    if (on) loadGuests(); else { guests = []; listEl.textContent = ''; }
  }

  /* ---------- auth ---------- */
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('lEmail').value.trim(), pass = $('lPass').value;
    if (!EMAIL_RE.test(email) || !pass) { say($('lMsg'), 'Enter your email and password.', 'err'); return; }
    $('lBtn').disabled = true; say($('lMsg'), 'Signing in…');
    sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
      $('lBtn').disabled = false;
      if (r.error) { say($('lMsg'), 'Those details didn’t work. Please try again.', 'err'); return; }
      $('lPass').value = ''; say($('lMsg'), '');
    });
  });
  $('logout').addEventListener('click', function () { sb.auth.signOut(); });
  sb.auth.onAuthStateChange(function (_e, session) { show(session); });
  sb.auth.getSession().then(function (r) { show(r.data && r.data.session); });

  /* ---------- data ---------- */
  function loadGuests() {
    sb.from('guests').select('id,name,email,created_at').order('created_at', { ascending: false }).then(function (r) {
      if (r.error) { say($('listMsg'), 'Couldn’t load the list. This account may not have access.', 'err'); return; }
      say($('listMsg'), ''); guests = r.data || []; render();
    });
  }

  function friendly(err) {
    if (err && err.code === '23505') return 'That email is already on the list.';
    if (err && (err.code === '42501' || err.code === 'PGRST301')) return 'You don’t have permission to do that.';
    return 'Something went wrong. Please try again.';
  }
  function validate(name, email) {
    if (!name.trim()) return 'Please enter a name.';
    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
    return '';
  }

  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('aName').value, email = $('aEmail').value, bad = validate(name, email);
    if (bad) { say($('aMsg'), bad, 'err'); return; }
    $('aBtn').disabled = true;
    sb.from('guests').insert({ name: name.trim(), email: email.trim() }).select().then(function (r) {
      $('aBtn').disabled = false;
      if (r.error) { say($('aMsg'), friendly(r.error), 'err'); return; }
      $('aName').value = ''; $('aEmail').value = ''; say($('aMsg'), 'Added.', 'ok');
      guests = r.data.concat(guests); render(); $('aName').focus();
    });
  });

  function saveEdit(id, name, email, msgEl) {
    var bad = validate(name, email);
    if (bad) { say(msgEl, bad, 'err'); return; }
    sb.from('guests').update({ name: name.trim(), email: email.trim() }).eq('id', id).select().then(function (r) {
      if (r.error) { say(msgEl, friendly(r.error), 'err'); return; }
      guests = guests.map(function (g) { return g.id === id ? r.data[0] : g; });
      editingId = null; render();
    });
  }
  function remove(id) {
    sb.from('guests').delete().eq('id', id).then(function (r) {
      if (r.error) { say($('listMsg'), friendly(r.error), 'err'); return; }
      guests = guests.filter(function (g) { return g.id !== id; }); confirmId = null; render();
    });
  }

  /* ---------- render ---------- */
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function btn(label, cls, fn) { var b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', fn); return b; }
  function field(label, value, type) {
    var l = el('label', null, label), i = el('input'); i.type = type; i.value = value; i.maxLength = type === 'email' ? 254 : 120; l.appendChild(i); return { label: l, input: i };
  }

  function render() {
    $('count').textContent = guests.length === 1 ? '1 invitation' : guests.length + ' invitations';
    listEl.textContent = '';
    if (!guests.length) { var empty = el('li', null, 'No one on the list yet.'); empty.style.color = 'var(--soft)'; listEl.appendChild(empty); return; }
    guests.forEach(function (g) {
      var li = el('li');
      if (editingId === g.id) {
        li.className = 'edit';
        var n = field('Name', g.name, 'text'), m = field('Email', g.email, 'email'), msg = el('p', 'msg'), acts = el('div', 'acts');
        acts.appendChild(btn('Save', 'ghost', function () { saveEdit(g.id, n.input.value, m.input.value, msg); }));
        acts.appendChild(btn('Cancel', 'link', function () { editingId = null; render(); }));
        [n.label, m.label, acts, msg].forEach(function (x) { li.appendChild(x); });
      } else {
        li.appendChild(el('div', 'name', g.name)); li.appendChild(el('div', 'mail', g.email));
        var a = el('div', 'acts');
        a.appendChild(btn('Edit', 'link', function () { editingId = g.id; confirmId = null; render(); }));
        if (confirmId === g.id) {
          a.appendChild(btn('Confirm delete', 'link danger', function () { remove(g.id); }));
          a.appendChild(btn('Cancel', 'link', function () { confirmId = null; render(); }));
        } else a.appendChild(btn('Delete', 'link danger', function () { confirmId = g.id; render(); }));
        li.appendChild(a);
      }
      listEl.appendChild(li);
    });
  }

  /* ---------- CSV export ---------- */
  function cell(v) { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
  $('export').addEventListener('click', function () {
    var rows = [['Name', 'Email']].concat(guests.map(function (g) { return [g.name, g.email]; }));
    var csv = rows.map(function (r) { return r.map(cell).join(','); }).join('\r\n');
    var url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'guest-list.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });
})();
