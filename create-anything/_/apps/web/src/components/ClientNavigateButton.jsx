import React from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@chakra-ui/react';
import { useHydrated } from '@/hooks/useHydrated';

export function ClientNavigateButton({ to, children, ...props }) {
  const navigate = useNavigate();
  const hydrated = useHydrated();

  const handleClick = (e) => {
    if (hydrated) {
      e.preventDefault();
      navigate(to);
    }
  };

  return (
    <Button
      as="a"
      href={to}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Button>
  );
}
