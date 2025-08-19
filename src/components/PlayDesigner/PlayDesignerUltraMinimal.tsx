import React from 'react';

const PlayDesignerUltraMinimal: React.FC = () => {
  console.log('PlayDesignerUltraMinimal: Component rendering');
  
  return React.createElement('div', {
    style: {
      backgroundColor: 'lime',
      color: 'black',
      padding: '50px',
      fontSize: '32px',
      fontWeight: 'bold',
      textAlign: 'center',
      minHeight: '100vh',
      border: '10px solid red'
    }
  }, [
    '🚨 ULTRA MINIMAL TEST 🚨',
    React.createElement('br', { key: 'br1' }),
    'If you see this lime background, React works.',
    React.createElement('br', { key: 'br2' }),
    'Time: ' + new Date().toLocaleTimeString(),
    React.createElement('br', { key: 'br3' }),
    'Component: PlayDesignerUltraMinimal'
  ]);
};

export default PlayDesignerUltraMinimal;
