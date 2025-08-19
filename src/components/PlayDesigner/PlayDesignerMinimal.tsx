import React from 'react';

const PlayDesignerMinimal: React.FC = () => {
  console.log('PlayDesignerMinimal: Component rendering');
  
  return (
    <div style={{ 
      backgroundColor: 'red', 
      color: 'white', 
      padding: '20px',
      minHeight: '100vh',
      fontSize: '24px',
      fontWeight: 'bold'
    }}>
      🚨 MINIMAL TEST COMPONENT 🚨
      <br />
      If you see this red background, basic rendering works.
      <br />
      Time: {new Date().toLocaleTimeString()}
      <br />
      Component: PlayDesignerMinimal
    </div>
  );
};

export default PlayDesignerMinimal;
