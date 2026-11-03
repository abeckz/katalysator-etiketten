/*
 * Debug-Hilfe (nicht Teil der App): emuliert das Druckmedium per CDP
 * (`Emulation.setEmulatedMedia`) und misst Dokument, Vorschau und Blatt.
 *   node .build/print-cdp-probe.js [Breite] [Höhe]
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.join(__dirname, '..');
const src = path.join(root, 'katalysator-etiketten.html');
const chrome = ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].find((p) => fs.existsSync(p));

const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run',
        '--remote-debugging-port=9333', '--window-size=794,1123',
        '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
    await sleep(1500);
    const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
    const target = list.find((t) => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    };
    const send = (method, params) => new Promise((res) => {
        const myId = ++id;
        pending.set(myId, res);
        ws.send(JSON.stringify({ id: myId, method, params: params || {} }));
    });
    await new Promise((r) => { ws.onopen = r; });

    await send('Page.enable');
    await send('Runtime.enable');
    const W = Number(process.argv[2] || 794);
    const H = Number(process.argv[3] || 1123);
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: 'file:///' + src.replace(/\\/g, '/') });
    await sleep(2500);

    const expr = `(function () {
        var de = document.documentElement;
        var mm = 96 / 25.4;
        var o = [];
        o.push('medium print? ' + window.matchMedia('print').matches);
        o.push('viewport ' + window.innerWidth + 'x' + window.innerHeight);
        o.push('doc client ' + de.clientWidth + 'x' + de.clientHeight +
          ' scroll ' + de.scrollWidth + 'x' + de.scrollHeight +
          ' ovf=' + getComputedStyle(de).overflow + '/' + getComputedStyle(de).overflowY);
        o.push('body scroll ' + document.body.scrollWidth + 'x' + document.body.scrollHeight);
        ['.app-shell', '.workspace', '.preview-wrap', '.sheet-stage', '.sheet-fit', '#sheet'].forEach(function (s) {
          var n = document.querySelector(s);
          if (!n) { o.push(s + ' FEHLT'); return; }
          var r = n.getBoundingClientRect(), c = getComputedStyle(n);
          o.push(s + ' box ' + Math.round(r.width) + 'x' + Math.round(r.height) +
            ' @' + Math.round(r.left) + ',' + Math.round(r.top) +
            ' (= ' + (Math.round(r.width / mm * 10) / 10) + ' x ' + (Math.round(r.height / mm * 10) / 10) + ' mm)' +
            ' ovf=' + c.overflow + '/' + c.overflowY + ' display=' + c.display +
            ' transform=' + c.transform);
        });
        return o.join('\\n');
    })()`;

    const expr2 = `(function () {
        var o = [];
        var all = document.querySelectorAll('*');
        /* Elemente, die über die Seitenbreite/-höhe hinausragen */
        Array.prototype.forEach.call(all, function (n) {
          var r = n.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return;
          var cls = n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') +
            (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\\s+/).join('.') : '');
          if (r.right > document.documentElement.clientWidth + 1) o.push('RECHTS ' + cls + ' right=' + Math.round(r.right));
          if (r.bottom > document.documentElement.clientHeight + 1 && !n.closest('.modal')) o.push('UNTEN ' + cls + ' bottom=' + Math.round(r.bottom));
          if (r.left < -0.5) o.push('LINKS ' + cls + ' left=' + Math.round(r.left));
        });
        o.push('--- Scroll-Container ---');
        Array.prototype.forEach.call(all, function (n) {
          var c = getComputedStyle(n);
          if ((c.overflowY !== 'visible' || c.overflowX !== 'visible') &&
              (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)) {
            var cls = n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') +
              (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\\s+/).join('.') : '');
            o.push(cls + ' client=' + n.clientWidth + 'x' + n.clientHeight +
              ' scroll=' + n.scrollWidth + 'x' + n.scrollHeight + ' ovf=' + c.overflowX + '/' + c.overflowY);
          }
        });
        return o.join('\\n');
    })()`;

    const before = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    console.log('--- Bildschirm-Medium ---\n' + before.result.result.value);

    await send('Emulation.setEmulatedMedia', { media: 'print' });
    await sleep(600);
    const after = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    console.log('\n--- Druck-Medium (nach beforeprint) ---\n' + after.result.result.value);

    const diag = await send('Runtime.evaluate', { expression: expr2, returnByValue: true });
    console.log('\n--- Diagnose ---\n' + diag.result.result.value);

    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outDir, 'print-cdp.png'), Buffer.from(shot.result.data, 'base64'));
    console.log('\nScreenshot: ' + path.join(outDir, 'print-cdp.png'));

    /* PDF-Druck wie beim echten Drucken */
    const pdf = await send('Page.printToPDF', {
        preferCSSPageSize: true, printBackground: true, scale: 1
    });
    fs.writeFileSync(path.join(outDir, 'print-cdp.pdf'), Buffer.from(pdf.result.data, 'base64'));
    console.log('PDF: ' + path.join(outDir, 'print-cdp.pdf'));

    /* Echter Druckpfad: Drucken-Knopf (window.print()). */
    await send('Emulation.setEmulatedMedia', { media: 'screen' });
    await sleep(300);
    await send('Runtime.evaluate', { expression: 'document.getElementById("btnPrint").click()' });
    await sleep(900);
    const viaButton = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    console.log('\n--- Druckmedium nach Klick auf „Drucken“ ---\n' + viaButton.result.result.value);
    const diag2 = await send('Runtime.evaluate', { expression: expr2, returnByValue: true });
    console.log('\n--- Diagnose ---\n' + diag2.result.result.value);
    const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(outDir, 'print-cdp-button.png'), Buffer.from(shot2.result.data, 'base64'));

    /* Zurück: afterprint muss die Vorschau wiederherstellen. */
    await send('Emulation.setEmulatedMedia', { media: 'screen' });
    await send('Runtime.evaluate', { expression: 'window.dispatchEvent(new Event("afterprint"))' });
    await sleep(500);
    const back = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    console.log('\n--- Bildschirm nach afterprint ---\n' + back.result.result.value);

    ws.close();
    proc.kill();
})();
