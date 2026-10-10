import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  for(const locale of ['de','en','fr']){
    const page=await browser.newPage({locale,viewport:{width:1600,height:1000}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(locale=>localStorage.setItem('ugso-blocks-for-ha-language',locale),locale);
    await page.goto('http://127.0.0.1:4180/');await page.waitForSelector('.blocklySvg');
    const result=await page.evaluate(async()=>{
      const url=performance.getEntriesByType('resource').find(e=>new URL(e.name).pathname==='/src/blocks.js').name;
      const {Blockly,workspaceModel}=await import(url),ws=Blockly.getMainWorkspace();
      const root=ws.getBlocksByType('ugso_automation')[0];root.getInputTargetBlock('ACTIONS')?.dispose();
      const d=ws.newBlock('procedures_defnoreturn');d.setFieldValue('log_message','NAME');d.loadExtraState({params:[{name:'message'}]});
      const log=ws.newBlock('ugso_log_action'),get=ws.newBlock('variables_get');get.setFieldValue(ws.getVariableMap().getVariable('message').getId(),'VAR');
      log.getInput('MESSAGE').connection.connect(get.outputConnection);d.getInput('STACK').connection.connect(log.previousConnection);
      const c=ws.newBlock('procedures_callnoreturn');c.loadExtraState({name:'log_message',params:['message']});
      const text=ws.newBlock('ugso_text');text.setFieldValue('Hello','TEXT');c.getInput('ARG0').connection.connect(text.outputConnection);root.getInput('ACTIONS').connection.connect(c.previousConnection);
      for(const block of [d,log,get,c,text]){block.initSvg();block.render();}
      // Real variable rename updates the native definition and all callers.
      ws.getVariableMap().renameVariable(ws.getVariableMap().getVariable('message'),'content');
      await new Promise(resolve=>setTimeout(resolve,120));
      const model=workspaceModel(ws,{alias:'Function test',mode:'single'}),state=Blockly.serialization.workspaces.save(ws);
      Blockly.serialization.workspaces.load(state,ws);await Blockly.renderManagement.finishQueuedRenders();
      const copy=workspaceModel(ws,{alias:'Function test',mode:'single'});
      const flyout=ws.getToolboxCategoryCallback('UGSO_FUNCTIONS')(ws);
      const result=ws.newBlock('ugso_function_result');result.initSvg();result.render();
      return {model,copy,params:ws.getBlocksByType('procedures_defnoreturn')[0].getProcedureDef()[1],actionCheck:ws.getBlocksByType('procedures_defnoreturn')[0].getInput('STACK').connection.getCheck(),flyout:flyout.map(b=>b.type),labels:result.toString()};
    });
    assert.deepEqual(result.copy,result.model);assert.deepEqual(result.params,['content']);assert.deepEqual(result.actionCheck,['Action']);
    assert.equal(Object.values(result.model.actions[0].sequence[0].variables)[0],'Hello');
    assert.ok(result.flyout.includes('procedures_callnoreturn'));assert.ok(result.flyout.includes('ugso_function_result'));
    assert.ok(result.labels.includes({de:'gib zurück',en:'return',fr:'renvoyer'}[locale]));assert.deepEqual(errors,[]);
    console.log(`${locale}: rendered action definitions/calls, parameter rename, project reload and conditional labels passed.`);await page.close();
  }
}finally{await browser.close();}
