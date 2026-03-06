import React from 'react';

export interface FormationTemplatesProps {
  onLoadFormation: (formationType: string) => void;
}

declare const FormationTemplates: React.MemoExoticComponent<(props: FormationTemplatesProps) => React.ReactElement>;
export default FormationTemplates;
