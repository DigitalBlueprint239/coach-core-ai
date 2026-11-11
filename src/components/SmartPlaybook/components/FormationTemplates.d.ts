import React from 'react';

interface FormationTemplatesProps {
  onLoadFormation: (formationId: string) => void;
}

declare const FormationTemplates: React.FC<FormationTemplatesProps>;
export default FormationTemplates;
