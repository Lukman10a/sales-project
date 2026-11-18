/**
 * Access-token claims. Identity only: what the user may do is resolved per
 * request (PrincipalService), so a permission change applies immediately.
 */
export interface JwtPayload {
  sub: string; // user id
  sid: string; // session (family) id; checked against the sessions table
  bid: string; // business (tenant) id
}
