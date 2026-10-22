// Keep writes in edit order, even when storage or the network is slow.
function createSaveQueue() {
  let pending = Promise.resolve();
  return write => {
    const result = pending.then(write);
    pending = result.catch(() => {});
    return result;
  };
}
module.exports = { createSaveQueue };
