import React from 'react';
import { useRouter } from 'expo-router';
import { DesktopLayout } from '@/components/layouts/DesktopLayout';

export default function LandingScreen() {
  const router = useRouter();
  
  return <DesktopLayout />;
  
}
