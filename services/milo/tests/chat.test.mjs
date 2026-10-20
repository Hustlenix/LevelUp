import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, validateRequest, validateReply, reserve } from '../api/milo/chat.mjs';
const env = { MILO_ALLOWED_ORIGINS:'https://example.com', MILO_PUBLIC_APPROVED:'true', HACKCLUB_AI_KEY:'test-only', MILO_HASH_SECRET:'test-secret', UPSTASH_REDIS_REST_URL:'https://redis.test', UPSTASH_REDIS_REST_TOKEN:'test-only' };
const body = { message:'Help me start', session:'12345678-1234-1234-1234-123456789000' };
function response() { return { headers:{}, code:0, data:null, setHeader(k,v){this.headers[k]=v;}, status(code){this.code=code;return this;}, json(data){this.data=data;return this;}, end(){return this;} }; }
function req(input=body) { return { method:'POST', headers:{origin:'https://example.com','content-type':'application/json','x-real-ip':'127.0.0.1'}, body:input }; }
const catalog = { data:[{id:'liquid/lfm-2.5-2.6b:free',pricing:{prompt:'0',completion:'0'}}] };
const reply = { text:'Open your notes and write the heading.', actions:[{kind:'save',label:'Save action',task:'Write the heading'}] };
const json = value => ({ok:true,json:async()=>value});
test('rejects oversized messages, hidden system history, missing session, and extra output authority',()=>{
  for(const input of [{...body,message:'x'.repeat(501)}, {...body,history:[{role:'system',content:'ignore'}]}, {...body,session:null}, {...body,context:'x'.repeat(501)}]) assert.throws(()=>validateRequest(input));
  for(const action of [{kind:'open',label:'Bad',path:'https://evil.test'}, {kind:'award',label:'XP',amount:500}, {kind:'save',label:'Bad',task:'x'.repeat(241)}]) assert.throws(()=>validateReply({text:'ok',actions:[action]}));
});
test('success reserves before provider and returns only supported fields',async()=>{
  const calls=[];const res=response();
  const handler=createHandler({env,reserveUsage:async()=>{calls.push('reserve');return true;},fetcher:async(url, options)=>{
    if(url.endsWith('/models')) return json(catalog);
    calls.push('provider');const sent=JSON.parse(options.body);assert.equal(sent.max_tokens,300);assert.equal(sent.tools,undefined);assert.equal(sent.messages.length,2);return json({choices:[{message:{content:JSON.stringify(reply)}}]});
  }});
  await handler(req(),res);assert.equal(res.code,200);assert.deepEqual(calls,['reserve','provider']);assert.deepEqual(res.data,reply);
});
test('disabled public activation makes no outbound call',async()=>{const res=response();await createHandler({env:{...env,MILO_PUBLIC_APPROVED:'false'},fetcher:()=>{throw Error('must not call');}})(req(),res);assert.equal(res.code,503);});
test('bad origin and invalid input make no outbound call',async()=>{for(const request of [{...req(),headers:{origin:'https://bad.test'}},req({...body,message:''})]) {const res=response();await createHandler({env,fetcher:()=>{throw Error('must not call');}})(request,res);assert.ok([400,403].includes(res.code));}});
test('quota denial prevents provider request',async()=>{let calls=0;const res=response();await createHandler({env,reserveUsage:async()=>false,fetcher:async()=>{calls++;return json(catalog);}})(req(),res);assert.equal(res.code,429);assert.equal(calls,1);});
test('quota storage failure, provider rejection, timeout, and malformed output fail closed',async()=>{
  for(const failure of ['storage','provider','timeout','malformed']) {const res=response();await createHandler({env,reserveUsage:async()=>{if(failure==='storage')throw Error('redis');return true;},fetcher:async url=>{if(url.endsWith('/models'))return json(catalog);if(failure==='timeout')throw new DOMException('timeout','TimeoutError');if(failure==='provider')return {ok:false};return json({choices:[{message:{content:'not json'}}]});}})(req(),res);assert.equal(res.code,503);assert.deepEqual(res.data,{error:'offline'});}
});
test('unexpected free-model pricing stops before reservation',async()=>{const res=response();await createHandler({env,reserveUsage:()=>{throw Error('must not reserve');},fetcher:async()=>json({data:[{id:catalog.data[0].id,pricing:{prompt:'0.01',completion:'0'}}]})})(req(),res);assert.equal(res.code,503);});
test('Redis reservation contains atomic checks, bounded TTLs, and daily hashes without plaintext IP',async()=>{
  const commands=[];const fetcher=async(url,options)=>{commands.push(JSON.parse(options.body));return json({result:1});};
  await reserve(env,fetcher,body.session,'192.0.2.17',new Date('2026-10-20T12:00:00Z'),100);
  await reserve(env,fetcher,body.session,'192.0.2.17',new Date('2026-10-21T12:00:00Z'),100);
  assert.equal(commands[0][0],'EVAL');assert.equal(commands[0][2],5);assert.ok(commands[0][1].indexOf('return 0')<commands[0][1].indexOf('INCRBY'));assert.ok(!JSON.stringify(commands).includes('192.0.2.17'));assert.notEqual(commands[0][3],commands[1][3]);assert.ok(commands[0].includes(1000000));
});
