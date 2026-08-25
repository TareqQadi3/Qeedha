import { getRole, getToken } from './api';
import Login from './Login';
import Cashier from './Cashier';
import OwnerShell from './OwnerShell';

export default function App() {
  const token = getToken();
  if (!token) return <Login />;
  const role = getRole();
  if (role === 'OWNER' || role === 'MANAGER') return <OwnerShell />;
  return <Cashier />;
}