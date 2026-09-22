// Express 4 ne rattrape pas les rejets de promesses dans les handlers async :
// sans ça, une erreur dans une route resterait sans réponse HTTP.
export function ah(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
