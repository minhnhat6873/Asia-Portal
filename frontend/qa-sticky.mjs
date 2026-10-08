const PROBE = `(() => {
  const label = [...document.querySelectorAll('span')]
    .find((s) => s.textContent && s.textContent.includes('Bản Xem Trước Trực Quan'));
  if (!label) return { found: false, url: location.href };
  let node = label, stickyEl = null;
  while (node && node !== document.body) {
    const cs = getComputedStyle(node);
    if (cs.position === 'sticky' || cs.position === 'fixed') { stickyEl = node; break; }
    node = node.parentElement;
  }
  if (!stickyEl) {
    // The live preview may be pinned via position:fixed on an ancestor wrapper.
    return { found: true, pinned: false, stickyTopNow: Math.round(label.getBoundingClientRect().top) };
  }
  // ALL scrollable ancestors
  const scrollables = [];
  let n = stickyEl || label;
  while (n && n !== document.documentElement) {
    const cs = getComputedStyle(n);
    if (/(auto|scroll)/.test(cs.overflowY)) {
      scrollables.push({
        tag: n.tagName,
        cls: (n.className || '').toString().slice(0, 60),
        scrollTop: n.scrollTop,
        scrollHeight: n.scrollHeight,
        clientHeight: n.clientHeight,
        canScroll: n.scrollHeight > n.clientHeight,
      });
    }
    n = n.parentElement;
  }
  return {
    found: true,
    pinned: true,
    stickyTopNow: stickyEl ? Math.round(stickyEl.getBoundingClientRect().top) : null,
    docScrollY: window.scrollY,
    docScrollHeight: document.documentElement.scrollHeight,
    docClientHeight: document.documentElement.clientHeight,
    bodyOverflow: getComputedStyle(document.body).overflowY,
    htmlOverflow: getComputedStyle(document.documentElement).overflowY,
    scrollables,
  };
})()`;

export default async function run(page, ui) {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('http://localhost:3000/admin/login');
  await page.waitForTimeout(2500);

  const snap = await ui.snapshot();
  const emailRef = snap.match(/@(e\d+) textbox "Email"/)?.[1];
  const passRef = snap.match(/@(e\d+) textbox "Mật khẩu"/)?.[1];
  const btnRef = snap.match(/@(e\d+) button "Đăng nhập ngay"/)?.[1];
  if (!emailRef || !passRef || !btnRef) return { step: 'no-login-form', snap };

  await ui.fill('@' + emailRef, 'kunnhat24@gmail.com');
  await ui.fill('@' + passRef, 'Abc12@34');
  await ui.click('@' + btnRef);
  await page.waitForTimeout(4000);

  await page.goto('http://localhost:3000/admin/media/new');
  await page.waitForTimeout(3500);

  // Type a lot into the summary editor to make the page tall.
  const editors = page.locator('[contenteditable="true"][role="textbox"]');
  const editorCount = await editors.count();
  const editorInfo = { editorCount };
  if (editorCount) {
    const filler = Array.from({ length: 60 }, (_, i) => 'Dòng nội dung thử nghiệm số ' + (i + 1) + ' để kéo dài trang.').join('\n');
    await editors.first().click();
    await editors.first().type(filler, { delay: 1 });
    await page.waitForTimeout(2000);
  }

  const before = await page.evaluate(PROBE);
  if (!before.found) return { step: 'no-page', loginUrl: page.url(), before };

  // Scroll with the real mouse wheel over the middle of the page.
  await page.mouse.move(800, 500);
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 150); await page.waitForTimeout(120); }
  await page.waitForTimeout(1000);

  const afterWheel = await page.evaluate(PROBE);
  return { editorInfo, before, afterWheel, note: 'expect afterWheel.stickyTopNow ~= 24 while scrollTop > 0' };
}
