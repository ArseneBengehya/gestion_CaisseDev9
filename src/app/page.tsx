import { redirect } from 'next/navigation';

export default function Home() {
  // Redirige instantanément vers la page de connexion
  redirect('/login');
}