import { useCallback } from 'react';
import { signOut } from "@auth/create/react";

function useAuth() {
  const callbackUrl = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('callbackUrl')
    : null;

  const signInWithCredentials = useCallback(async (options) => {
    const formData = new FormData();
    formData.append('email', options.email);
    formData.append('password', options.password);

    const response = await fetch('/api/auth/custom-signin', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || 'Sign in failed');
      error.message = 'CredentialsSignin';
      throw error;
    }

    if (options.redirect) {
      window.location.href = options.callbackUrl || callbackUrl || '/';
    }

    return data;
  }, [callbackUrl])

  const signUpWithCredentials = useCallback(async (options) => {
    const formData = new FormData();
    formData.append('email', options.email);
    formData.append('password', options.password);
    if (options.name) {
      formData.append('name', options.name);
    }

    const response = await fetch('/api/auth/custom-signup', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || 'Sign up failed');
      error.message = data.error === 'User already exists' ? 'EmailCreateAccount' : 'CredentialsSignin';
      throw error;
    }

    if (options.redirect) {
      window.location.href = options.callbackUrl || callbackUrl || '/';
    }

    return data;
  }, [callbackUrl])

  return {
    signInWithCredentials,
    signUpWithCredentials,
    signOut,
  }
}

export default useAuth;