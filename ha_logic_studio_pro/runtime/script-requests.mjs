export const scriptRequests = String.raw`
  const pendingScriptRequests = new Map();
  const scriptRequestPrefix = Array.from({length: 4}, () => Math.random().toString(36).slice(2)).join('-');
  let nextScriptRequest = 0;
  let scriptReplyListener = false;
  function requestScriptMessage(target, message, data, timeout, callback) {
    if (typeof target !== 'string' || !target.trim() || target.trim().length > 128) throw new Error('Invalid script message address');
    target = target.trim();
    const event = 'logic_studio_script_message';
    if (!scriptReplyListener) {
      ha.onEvent(event, reply => {
        const request = pendingScriptRequests.get(reply?.replyTo);
        if (!request || request.target !== reply.target || request.message !== reply.message) return;
        request.finish(reply.data);
      });
      scriptReplyListener = true;
    }
    const id = scriptRequestPrefix + ':' + ++nextScriptRequest;
    const finish = result => {
      if (!pendingScriptRequests.delete(id)) return;
      ha.cancelTimer(id, false);
      invoke(callback, result);
    };
    ha.timeout(id, timeout, () => finish({error: 'timeout'}));
    pendingScriptRequests.set(id, {target, message, finish});
    try { ha.fireEvent(event, {target, message, data, requestId: id}); }
    catch (error) {
      pendingScriptRequests.delete(id);
      ha.cancelTimer(id, false);
      throw error;
    }
  }
`;
