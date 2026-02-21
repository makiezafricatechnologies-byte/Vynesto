'use client';

import { initializeFirebase as init } from './init';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

export type FirebaseServices = {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
};

let services: FirebaseServices | null = null;

export function initializeFirebase(): FirebaseServices {
  if (services) return services;
  const result = init();
  services = {
    firebaseApp: result.firebaseApp,
    auth: result.auth,
    firestore: result.firestore,
    storage: result.storage
  };
  return services;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';

import { useFirebase } from './provider';

export const useStorage = () => {
  const { firebaseApp } = useFirebase();
  return getStorage(firebaseApp);
};