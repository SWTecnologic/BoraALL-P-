// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // Sempre redireciona para a splash screen primeiro
  // A splash screen vai decidir se vai para login ou tabs
  return <Redirect href="/splash" />;
}