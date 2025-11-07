import { useCallback } from 'react';

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

  const signOut = useCallback(async (options = {}) => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign out failed');
      }

      if (options.redirect !== false) {
        window.location.href = options.callbackUrl || '/account/signin';
      }

      return data;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [])

  return {
    signInWithCredentials,
    signUpWithCredentials,
    signOut,
  }
}

export default useAuth;