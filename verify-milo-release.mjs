import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = process.argv[2] || 'http://localhost:3116';
const browser = await chromium.launch();
let checks = 0;
const errors = [], requests = [];
try {
  const context = await browser.newContext({ viewport:{width:1440,height:1000}, reducedMotion:'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error=>errors.push(error.message));
  page.on('request', request=>requests.push(request.url()));
  await page.goto(base+'/protocols/');
  await page.getByRole('button',{name:'Quick tour',exact:true}).click();
  const tour = page.locator('dialog[open]');
  await tour.getByRole('button',{name:'Skip / close'}).click();
  assert.equal(await page.locator('dialog[open]').count(),0); checks++;
  await page.getByRole('button',{name:'Quick tour',exact:true}).click();
  for(const name of ['Try the sample lesson','Save a demo action','Try a demo block','See a demo reply']) {
    await tour.getByRole('button',{name,exact:true}).click();
    await tour.getByRole('button',{name:/^(Next|Finish tour)$/}).click();
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('levelup-small-steps-v1')),null); checks++;
  await tour.getByRole('button',{name:'Save as a next action',exact:true}).click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('levelup-small-steps-v1')).queue.length),1); checks++;
  await tour.getByRole('button',{name:'Done for now'}).click();
  await page.getByRole('button',{name:/Open Milo companion space/}).click();
  await page.getByRole('button',{name:'talk',exact:true}).click();
  await page.getByRole('button',{name:'I got interrupted',exact:true}).click();
  await page.getByRole('button',{name:'Get offline guidance',exact:true}).click();
  await page.getByText('Offline suggestion · authored guidance',{exact:true}).waitFor(); checks++;
  assert.equal(requests.some(url=>/googletagmanager|google-analytics|hackclub|\/api\/milo\/chat/.test(url)),false);checks++;
  await page.getByRole('button',{name:'Clear conversation and choices'}).click();
  assert.equal(await page.getByText('Recent conversation',{exact:true}).count(),0);checks++;
  await page.getByRole('button',{name:'Minimize companion'}).click();
  const themes = new Set();
  for(const width of [375,768,1440]) {
    await page.setViewportSize({width,height:1000});
    for(const theme of ['light','dark','deepwork','cyberpunk']) for(const scale of ['1','1.15','1.3','1.5']) {
      await page.evaluate(({theme,scale})=>{document.documentElement.setAttribute('data-theme',theme);document.documentElement.setAttribute('data-reader-scale',scale);},{theme,scale});
      await page.waitForTimeout(350);
      const layout = await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,font:parseFloat(getComputedStyle(document.documentElement).fontSize),background:getComputedStyle(document.body).backgroundColor}));
      assert.ok(layout.scroll<=layout.width+1,`${width}/${theme}/${scale}: overflow ${layout.scroll}`);
      assert.ok(Math.abs(layout.font-16*Number(scale))<0.1,`${width}/${theme}/${scale}: font ${layout.font}`); themes.add(layout.background); checks+=2;
    }
  }
  assert.ok(themes.size>=4);checks++;
  await page.setViewportSize({width:375,height:850});
  await page.evaluate(()=>document.documentElement.setAttribute('data-reader-scale','1'));
  await page.getByRole('button',{name:'Open navigation'}).click();
  await page.locator('#site-navigation').getByRole('button',{name:'Increase text size',exact:true}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('levelup-reader-scale')),'1.15'); checks++;
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-reader-scale'),'1.15');checks++;
  await page.goto(base+'/settings/');
  await page.getByRole('heading',{name:'Keep LevelUp close'}).waitFor();checks++;
  const manifest = await (await page.request.get(base+'/manifest.webmanifest')).json();
  assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192')); assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));checks+=2;
  await page.goto(base+'/small-steps/');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload();
  await page.getByLabel('What are you trying to start?').fill('Offline task');
  await context.setOffline(true); await page.reload();
  await page.getByLabel('What are you trying to start?').waitFor();
  assert.equal(await page.getByLabel('What are you trying to start?').inputValue(),'Offline task');checks++;
  await context.setOffline(false);
  await mkdir('docs/screenshots',{recursive:true});
  await page.evaluate(()=>{localStorage.setItem('levelup-reader-scale','1');localStorage.setItem('levelup-theme','light');});
  await page.goto(base+'/protocols/');
  await page.screenshot({path:'docs/screenshots/practice-mobile.png',fullPage:false});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'docs/screenshots/practice-desktop.png',fullPage:false});
  assert.deepEqual(errors,[]);
  console.log(`${checks} Milo release browser checks passed; no page errors.`);
} finally { await browser.close(); }
