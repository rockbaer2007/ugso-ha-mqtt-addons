'use strict';
// Shared pure state rules, also exercised by the offline Node tests.
const Matrix = {
  initial(views, users) {
    return new Map(views.map(view => [view.index, new Set(view.users === null ? users.map(u => u.id) : view.users.filter(id => users.some(u => u.id === id)))]));
  },
  equal(left, right) { return left.size === right.size && [...left].every(id => right.has(id)); },
  changes(views, users, draft) {
    const initial = this.initial(views, users);
    return views.filter(view => !view.unsupported && !this.equal(initial.get(view.index), draft.get(view.index)))
      .map(view => ({index: view.index, users: users.filter(u => draft.get(view.index).has(u.id)).map(u => u.id)}));
  },
  column(views, draft, id) {
    const editable = views.filter(view => !view.unsupported);
    const checked = editable.filter(view => draft.get(view.index).has(id)).length;
    return {checked: editable.length > 0 && checked === editable.length, indeterminate: checked > 0 && checked < editable.length, disabled: !editable.length};
  },
  setColumn(views, draft, id, checked) {
    for (const view of views) if (!view.unsupported) this.setCell(draft, view.index, id, checked);
  },
  setCell(draft, index, id, checked) { if (checked) draft.get(index).add(id); else draft.get(index).delete(id); }
};
if (typeof module !== 'undefined') module.exports = Matrix;
