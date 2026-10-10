import React from 'react';
import KairouIcon from './KairouIcon';

/**
 * Backward compatibility alias: CinetugaIcon -> KairouIcon
 */
export default function CinetugaIcon(props) {
  return <KairouIcon {...props} />;
}
