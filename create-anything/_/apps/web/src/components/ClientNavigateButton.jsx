import React from 'react';
import { Button } from '@chakra-ui/react';

export function ClientNavigateButton({ to, children, ...props }) {
  return (
    <Button
      as="a"
      href={to}
      {...props}
    >
      {children}
    </Button>
  );
}
