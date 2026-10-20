// Simulated provider UI test. Start a dev server with NEXT_PUBLIC_MILO_API_URL=https://milo.test/api/milo/chat.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
let calls=0, payload, mode='valid';
try {
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://milo.test/api/milo/chat',async route=>{
    calls++;payload=route.request().postDataJSON();
    const reply=mode==='invalid'?{text:'Bad action',actions:[{kind:'open',label:'Go',path:'https://evil.test'}]}:{text:'Open your notes and write one heading.',actions:[{kind:'save',label:'Save next action',task:'Write one heading'}]};
    await route.fulfill({status:mode==='failure'?503:200,contentType:'application/json',body:JSON.stringify(reply)});
  });
  await page.goto((process.argv[2]||'http://localhost:3118')+'/protocols/');
  await page.evaluate(()=>{localStorage.setItem('private-test-note','DO_NOT_SEND_PRIVATE_NOTE');localStorage.setItem('levelup-small-steps-v1',JSON.stringify({version:1,task:'Prepare chemistry notes',actions:['Open notes'],current:0,minutes:5,phase:'ready',elapsed:0,startedAt:null,attemptId:'',later:'PRIVATE_LATER_NOTE',restart:'PRIVATE_RESTART_NOTE',history:[]}));});
  await page.getByRole('button',{name:/Open Milo companion space/}).click();
  await page.getByRole('button',{name:'talk',exact:true}).click();
  assert.equal(calls,0);
  await page.getByLabel('Use Hack Club AI for this conversation').check();
  await page.getByLabel('Current task',{exact:true}).check();
  await page.getByText('Current task: Prepare chemistry notes',{exact:true}).waitFor();
  assert.equal(calls,0);
  await page.getByRole('button',{name:'Help me start',exact:true}).click();
  await page.getByRole('button',{name:'Send to Hack Club',exact:true}).click();
  await page.getByText('Hack Club AI reply',{exact:true}).waitFor();
  assert.equal(calls,1);assert.equal(payload.context,'Current task: Prepare chemistry notes');assert.ok(!JSON.stringify(payload).includes('PRIVATE'));assert.ok(!JSON.stringify(payload).includes('DO_NOT_SEND'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('levelup-small-steps-v1')).queue?.length||0),0);
  await page.getByRole('region',{name:'Milo companion space'}).getByRole('button',{name:'Save as a next action',exact:true}).click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('levelup-small-steps-v1')).queue.length),1);
  for(const failure of ['invalid','failure']) {
    mode=failure;await page.getByLabel('Message Milo',{exact:true}).fill('Help me try again');
    await page.getByRole('button',{name:'Send to Hack Club',exact:true}).click();
    await page.getByText(/Showing an authored offline suggestion\./).waitFor();
    assert.equal(await page.getByRole('link',{name:'Go',exact:true}).count(),0);
  }
  await page.getByRole('button',{name:'Clear conversation and choices'}).click();
  assert.equal(await page.getByLabel('Use Hack Club AI for this conversation').isChecked(),false);
  assert.equal(await page.getByText('Recent conversation',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.includes('chat')||key.includes('conversation'))),false);
  assert.deepEqual(errors,[]);
  console.log('14 simulated cloud UI checks passed; selected context only, explicit save, invalid output and outage fallback. No live provider calls.');
} finally {await browser.close();}
