import { getToken } from './api';
import Login from './Login';
import Cashier from './Cashier';

export default function App() {
  const token = getToken();
  if (!token) return <Login />;
  return <Cashier />;
}