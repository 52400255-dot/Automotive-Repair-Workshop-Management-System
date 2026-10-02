/**
 * AuthContext — Định nghĩa context + hook useAuth (tách riêng để
 * tuân thủ quy tắc fast-refresh: file này không export component).
 */
import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export { AuthContext };
