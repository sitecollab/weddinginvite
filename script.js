(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = doc.getElementById('hero');
  var video = doc.getElementById('vid');
  var still = doc.getElementById('still');
  var started = false, stillShown = false;

  if (rm) root.classList.add('rm');

  /* ---------- opening sequence ---------- */
  function startSequence() {
    if (started) return;
    started = true;
    hero.classList.add('seq');
    setTimeout(function () { hero.classList.add('hint-on'); }, rm ? 0 : 3400);
  }
  function showStill() {
    if (stillShown) return;
    stillShown = true;
    still.classList.add('on');
    setTimeout(function () { video.style.visibility = 'hidden'; }, rm ? 0 : 400);
  }
  function fallback() { showStill(); startSequence(); }

  if (rm || !video) {
    if (video) { video.removeAttribute('autoplay'); video.pause(); }
    fallback();
  } else {
    video.muted = true;
    video.addEventListener('timeupdate', function () {
      if (!started && video.duration && video.duration - video.currentTime <= 2) startSequence();
    });
    video.addEventListener('ended', function () { startSequence(); showStill(); });
    video.addEventListener('error', fallback);
    var p = video.play();
    if (p && p.catch) p.catch(fallback);
    /* safety net: nothing started after 9s */
    setTimeout(function () { if (!started) fallback(); }, 9000);
  }

  /* ---------- scroll reveals ---------- */
  var rvs = doc.querySelectorAll('.rv');
  if (rm || !('IntersectionObserver' in window)) {
    rvs.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -12% 0px' });
    rvs.forEach(function (el) { io.observe(el); });
  }

  /* ---------- timeline ---------- */
  var tl = doc.getElementById('timeline');
  var fill = doc.getElementById('tlFill');
  var entries = Array.prototype.slice.call(tl.querySelectorAll('.entry'));
  var ticking = false;

  function drawTimeline() {
    ticking = false;
    var r = tl.getBoundingClientRect();
    var trackTop = entries[0].offsetHeight / 2;
    var trackLen = tl.offsetHeight - entries[entries.length - 1].offsetHeight / 2 - trackTop;
    var y = rm ? tl.offsetHeight : window.innerHeight * 0.72 - r.top;
    var h = Math.max(0, Math.min(trackLen, y - trackTop));
    fill.style.height = h + 'px';
    entries.forEach(function (en) {
      var dotY = en.offsetTop + en.offsetHeight / 2;
      en.classList.toggle('on', y >= dotY);
    });
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(drawTimeline); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  drawTimeline();
})();
