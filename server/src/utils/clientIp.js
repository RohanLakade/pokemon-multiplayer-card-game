// Finds the visitor's IP address.
// Behind Render's proxy the connection itself comes from the proxy, so we read the
// X-Forwarded-For header and take the entry "trustProxy" steps from the right.
// This is the same rule Express uses. With trustProxy = 0 the header is ignored,
// so a visitor cannot fake their address.
export function getClientIp(request, trustProxy) {
  const forwarded = request.headers['x-forwarded-for'];

  if (trustProxy > 0 && typeof forwarded === 'string') {
    const addresses = forwarded.split(',').map((address) => address.trim());
    const clientAddress = addresses[Math.max(addresses.length - trustProxy, 0)];
    if (clientAddress) return clientAddress;
  }

  return request.socket.remoteAddress;
}
