async function check() {
  const b = 'https://journeyhub-m5lq.onrender.com';
  console.log('Fetching', b);
  const res = await fetch(b);
  const html = await res.text();
  console.log('Status:', res.status, 'HTML length:', html.length);
  
  const matches = [...html.matchAll(/(?:src|href)="([^"]+)"/g)];
  let bad = 0;
  for (const m of matches) {
    const src = m[1];
    if (src.startsWith('#') || src.startsWith('mailto:') || src.startsWith('javascript:')) continue;
    const full = src.startsWith('http') ? src : b + '/' + src.replace(/^\//, '');
    try {
      const r = await fetch(full);
      if (r.status >= 400) {
        console.log('FAILED:', r.status, full);
        bad++;
      }
    } catch(err) {
      console.log('ERROR:', full, err.message);
      bad++;
    }
  }
  console.log('Total checked:', matches.length, 'Failures:', bad);
}
check();
