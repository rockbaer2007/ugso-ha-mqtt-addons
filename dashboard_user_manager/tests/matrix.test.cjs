const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const app = fs.existsSync(path.resolve(__dirname,'../app')) ? path.resolve(__dirname,'../app') : path.resolve(__dirname,'../dashboard_user_manager/app');
const Matrix = require(path.join(app,'static/matrix.js'));
const users = [{id:'admin'}, {id:'web'}, {id:'phone'}];
const views = [{index:0,users:null}, {index:1,users:['admin']}, {index:2,users:[]}];

test('column supports partial, all and none; cell edit restores partial', () => {
  const draft = Matrix.initial(views,users);
  assert.deepEqual(Matrix.column(views,draft,'web'), {checked:false,indeterminate:true,disabled:false});
  Matrix.setColumn(views,draft,'web',true);
  assert.deepEqual(Matrix.column(views,draft,'web'), {checked:true,indeterminate:false,disabled:false});
  Matrix.setCell(draft,1,'web',false);
  assert.deepEqual(Matrix.column(views,draft,'web'), {checked:false,indeterminate:true,disabled:false});
  assert.equal(draft.get(0).has('admin'),true);
  assert.equal(draft.get(1).has('admin'),true);
  assert.deepEqual(Matrix.changes(views,users,draft), [{index:2,users:['web']}]);
  Matrix.setColumn(views,draft,'web',false);
  assert.deepEqual(Matrix.column(views,draft,'web'), {checked:false,indeterminate:false,disabled:false});
});
test('toggle back to original produces no change and does not mutate input', () => {
  const original = structuredClone(views), draft = Matrix.initial(views,users);
  Matrix.setCell(draft,0,'web',false); Matrix.setCell(draft,0,'web',true);
  assert.deepEqual(Matrix.changes(views,users,draft),[]);
  assert.deepEqual(views,original);
});
test('unsupported rows are excluded from bulk selection and change payload', () => {
  const rows = [{index:0,users:[],unsupported:'Custom format'}, {index:1,users:[]}];
  const draft = Matrix.initial(rows,users);
  Matrix.setColumn(rows,draft,'web',true);
  assert.equal(draft.get(0).has('web'),false);
  assert.deepEqual(Matrix.changes(rows,users,draft), [{index:1,users:['web']}]);
  assert.equal(Matrix.column([],draft,'web').disabled,true);
});
