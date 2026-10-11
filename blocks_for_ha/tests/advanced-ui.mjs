import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1500,height:1000},locale:'de'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog', dialog => dialog.accept());
  await page.goto('http://127.0.0.1:4180/');await page.waitForSelector('.blocklySvg');
  await page.locator('#load-example').click();
  await page.locator('#jinja-import').click();const source="{% if is_state('sensor.test','on') %}ON{% else %}OFF{% endif %}";
  await page.locator('#jinja-source').fill(source);await page.locator('#jinja-boolean').check();assert.match(await page.locator('#jinja-preview').textContent(),/Wenn \/ Sonst.*sensor.test/);
  await page.locator('#jinja-add').click();
  await page.waitForFunction(()=>!document.querySelector('#jinja-dialog').open);
  await page.evaluate(async source=>{
    const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/blocks.js').name;
    const {Blockly}=await import(url);const ws=Blockly.getMainWorkspace();const block=ws.getBlocksByType('ugso_jinja_composed_condition')[0];
    if(block.jinjaOriginal_!==source||!block.getDescendants().some(b=>b.type==='ugso_jinja_if'))throw Error('Jinja decomposition missing');
    const root=ws.getBlocksByType('ugso_automation')[0];root.getInputTargetBlock('CONDITIONS')?.dispose();root.getInput('CONDITIONS').connection.connect(block.outputConnection);
  },source);
  await page.waitForFunction(()=>document.querySelector('#yaml').textContent.includes("{% if is_state"));
  await page.locator('.more>summary').click();await page.locator('.automation-options>summary').click();
  await page.waitForFunction(()=>document.querySelector('#automation-options').value==='{}');
  await page.locator('#automation-options').fill('{"variables":{"items":[1,2]},"trace":{"stored_traces":10},"initial_state":false}');await page.locator('#automation-options-apply').click();
  await page.waitForFunction(()=>document.querySelector('#yaml').textContent.includes('stored_traces: 10')).catch(async e=>{throw Error(`${e.message}; ${await page.locator('.automation-options [role=alert]').textContent()}; ${await page.locator('#automation-options').inputValue()}`);});
  const yaml=await page.locator('#yaml').textContent();await page.locator('#automation-options').fill('{"trace":{"stored_traces":-1}}');await page.locator('#automation-options-apply').click();
  assert.match(await page.locator('.automation-options [role=alert]').textContent(),/stored_traces/);assert.equal(await page.locator('#yaml').textContent(),yaml);
  await page.reload();await page.waitForSelector('.blocklySvg');await page.waitForFunction(()=>document.querySelector('#yaml').textContent.includes('stored_traces: 10'));
  assert.equal(await page.locator('#yaml').textContent(),yaml);
  await page.locator('#jinja-import').click();await page.locator('#jinja-source').fill('');assert.equal(await page.locator('#jinja-add').isDisabled(),true);await page.locator('#jinja-cancel').click();
  await page.evaluate(async()=>{
    const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/blocks.js').name;const {Blockly}=await import(url);const ws=Blockly.getMainWorkspace();
    const root=ws.getBlocksByType('ugso_automation')[0];root.getInputTargetBlock('ACTIONS')?.dispose();const block=ws.newBlock('ugso_parallel');block.initSvg();block.render();root.getInput('ACTIONS').connection.connect(block.previousConnection);ws.zoomToFit();
    const icon=block.getIcon(Blockly.icons.MutatorIcon.TYPE);await icon.setBubbleVisible(true);
    const builder=icon.getWorkspace(),container=builder.getBlocksByType('ugso_parallel_container')[0];
    const item=builder.newBlock('ugso_parallel_item');item.initSvg();item.render();
    let connection=container.getInput('STACK').connection;while(connection.targetBlock())connection=connection.targetBlock().nextConnection;
    connection.connect(item.previousConnection);await new Promise(resolve=>setTimeout(resolve,150));await icon.setBubbleVisible(false);
  });
  await page.waitForFunction(async()=>{const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/blocks.js').name;const {Blockly}=await import(url);return Blockly.getMainWorkspace().getBlocksByType('ugso_parallel')[0].branchCount_===3;});
  await page.waitForFunction(()=>document.querySelector('#yaml').textContent.includes('parallel:'));
  const parallelYaml=await page.locator('#yaml').textContent();await page.reload();await page.waitForSelector('.blocklySvg');await page.waitForFunction(()=>document.querySelector('#yaml').textContent.includes('parallel:'));assert.equal(await page.locator('#yaml').textContent(),parallelYaml);
  assert.deepEqual(errors,[]);console.log('Advanced UI: Jinja recognition/connection, root options, rejected mutation, parallel gear, reload and empty dialog verified.');
} finally {await browser.close();}
