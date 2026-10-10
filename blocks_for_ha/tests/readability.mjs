import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  for(const [width,height,deviceScaleFactor] of [[1920,1080,1],[2560,1440,1],[1920,1080,2]]) {
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor,locale:'de'});
    await page.goto('http://127.0.0.1:4180/');await page.waitForSelector('.blocklySvg');
    await page.evaluate(async()=>{
      const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/blocks.js').name;
      const {Blockly,modelWorkspace}=await import(url);window.readableBlockly=Blockly;window.readableWs=Blockly.getMainWorkspace();
      modelWorkspace(window.readableWs,{alias:'Readability',mode:'single',triggers:[{trigger:'time',at:'12:00:00'}],conditions:[],actions:Array.from({length:40},()=>({delay:1}))});
      window.readableWs.getToolbox().setSelectedItem(window.readableWs.getToolbox().getToolboxItems().find(item=>item.getName()==='Werte'));
    });
    await page.locator('#fit').click();
    for(const theme of ['standard','dark','modern','tritanopia']) {
      await page.locator('#theme').selectOption(theme);
      await page.evaluate(()=>{const toolbox=window.readableWs.getToolbox();const item=toolbox.getToolboxItems().find(i=>i.getName()==='Werte');toolbox.setSelectedItem(null);toolbox.setSelectedItem(item);});
      const sizes=await page.evaluate(()=>{
        const ws=window.readableWs,flyout=ws.getFlyout().getWorkspace();
        const pixels=block=>{const text=block.getSvgRoot().querySelector('text.blocklyText');return Number.parseFloat(getComputedStyle(text).fontSize)*Math.abs(text.getScreenCTM().a);};
        return {visible:ws.getFlyout().isVisible(),workspace:ws.scale,menu:flyout.scale,menuFont:pixels(flyout.getTopBlocks(false)[0]),editorFont:pixels(ws.getTopBlocks(false)[0])};
      });
      assert.ok(sizes.menuFont>=15,JSON.stringify(sizes));assert.ok(sizes.editorFont>=13,JSON.stringify(sizes));assert.equal(sizes.menu,1);
      assert.ok(sizes.workspace>=.85);
      assert.equal(sizes.visible,true);
    }
    await page.evaluate(()=>window.readableWs.setScale(.5));
    assert.equal(await page.evaluate(()=>window.readableWs.getFlyout().getWorkspace().scale),1);
    await page.locator('#fit').click();
    await page.evaluate(()=>{const toolbox=window.readableWs.getToolbox();const item=toolbox.getToolboxItems().find(i=>i.getName()==='Werte');toolbox.setSelectedItem(null);toolbox.setSelectedItem(item);});
    if(width===2560)await page.locator('#workspace').screenshot({path:'artifacts/readable-blocks-2560.png'});
    await page.close();
  }
  console.log('Readability: menu/editor text sizes verified at Full HD, 2560px and HiDPI, across all four themes and after zoom/fit.');
} finally {await browser.close();}
