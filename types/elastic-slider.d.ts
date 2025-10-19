declare module "@/components/ui/elastic-slider" {
  import * as React from 'react';

  export interface ElasticSliderProps {
    defaultValue?: number;
    startingValue?: number;
    maxValue?: number;
    className?: string;
    isStepped?: boolean;
    stepSize?: number;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onChange?: (value: number) => void;
  }

  const ElasticSlider: React.FC<ElasticSliderProps>;
  export default ElasticSlider;
}
