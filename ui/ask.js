// The Ask panel. Loaded only when data/assistant.json has an endpoint.
// It sends nothing until the reader has ticked the consent box and pressed Send — opening
// the page, or the panel, contacts no one. The one network call is in send().
(function () {
  var body = document.body;
  var ENDPOINT = body.getAttribute('data-ask');
  var BASE = body.getAttribute('data-base') || '';
  var dlg = document.getElementById('ask');
  if (!ENDPOINT || !dlg) return;
  var q = dlg.querySelector('[data-ask-q]');
  var consent = dlg.querySelector('[data-ask-consent]');
  var sendBtn = dlg.querySelector('[data-ask-send]');
  var count = dlg.querySelector('[data-ask-count]');
  var out = dlg.querySelector('[data-ask-answer]');
  var busy = false;

  function ready() { sendBtn.disabled = busy || !consent.checked || !q.value.trim(); count.textContent = q.value.length + ' / 400'; }
  consent.addEventListener('change', ready);
  q.addEventListener('input', ready);
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !sendBtn.disabled) send(); });
  document.querySelectorAll('[data-ask-open]').forEach(function (b) {
    b.addEventListener('click', function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); q.focus(); });
  });
  sendBtn.addEventListener('click', send);

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function sitePath(p) { return BASE + String(p || '').replace(/^\//, ''); }

  function render(reply) {
    out.innerHTML = '';
    var p = el('p', 'ask-text');
    // Turn [S2] into a small link to source 2. Everything else is plain text.
    String(reply.text || '').split(/(\[S\d+\])/).forEach(function (part) {
      var m = /^\[S(\d+)\]$/.exec(part);
      if (m) { var a = el('a', 'ask-cite', m[1]); a.href = '#ask-src-' + m[1]; p.appendChild(a); }
      else p.appendChild(document.createTextNode(part));
    });
    out.appendChild(p);
    if (reply.sources && reply.sources.length) {
      out.appendChild(el('p', 'ask-src-h', reply.kind === 'answer' ? 'Where this comes from' : 'Pages to look at'));
      var ol = el('ol', 'ask-sources');
      reply.sources.forEach(function (s) {
        var li = el('li'); li.id = 'ask-src-' + s.n;
        var a = el('a', null, s.title); a.href = sitePath(s.page); li.appendChild(a);
        if (s.source) { li.appendChild(document.createTextNode(' · ')); var o = el('a', null, 'original page'); o.href = s.source; o.rel = 'noopener'; o.target = '_blank'; li.appendChild(o); }
        ol.appendChild(li);
      });
      out.appendChild(ol);
    }
    if (reply.kind === 'answer') out.appendChild(el('p', 'ask-warn', 'Written by an AI from the facts above. Check the linked page before you rely on it.'));
  }

  // Same patterns as assistant/core.js checkQuestion, so personal details never leave the device.
  var PERSONAL = [/[\w.+-]+@[\w-]+\.[\w.]+/, /(?:\+?61|\b0)[2-478](?:[ -]?\d){8}\b/, /\b\d{1,4}\s+\w+\s+(?:street|st|road|rd|avenue|ave|drive|dr|place|pl|crescent|cres)\b/i];

  function send() {
    if (sendBtn.disabled) return;
    if (PERSONAL.some(function (re) { return re.test(q.value); })) {
      render({ kind: 'refused', text: 'Please take out personal details like an email, phone number or address, then ask again. Nothing was sent.' });
      return;
    }
    busy = true; ready();
    out.innerHTML = ''; out.appendChild(el('p', 'ask-wait', 'Looking through the site’s facts…'));
    fetch(ENDPOINT + '/ask', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: q.value.trim(), consent: consent.checked === true })
    }).then(function (r) { return r.json().catch(function () { return { kind: 'error', text: 'Something went wrong. Please try again.' }; }); })
      .then(render)
      .catch(function () { render({ kind: 'error', text: 'Could not reach the assistant. Check your connection and try again.' }); })
      .then(function () { busy = false; ready(); });
  }
  ready();
})();
