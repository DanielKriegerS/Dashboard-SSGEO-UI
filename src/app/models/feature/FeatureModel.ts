export interface FeatureCoatendModel {
  id: string;
  description: string;
  coatendNumber: number;
  featureId: string;
  weight: number | null;
}

export interface FeatureModel {
  id: string;
  name: string;
  description: string | null;
  coatends: FeatureCoatendModel[];
}

export interface FeatureRequest {
  name: string;
  description: string | null;
}